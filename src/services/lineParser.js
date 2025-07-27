const sqlite3 = require("sqlite3").verbose();
const path = require("path");

class LineDataParser {
  constructor() {
    this.db = null;
  }

  /**
   * SQLiteファイルを開く
   * @param {string} filePath - SQLiteファイルのパス
   * @returns {Promise<boolean>} - 成功したかどうか
   */
  async openDatabase(filePath) {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(filePath, (err) => {
        if (err) {
          console.error("データベースを開けませんでした:", err.message);
          reject(err);
        } else {
          console.log("データベースに接続しました");
          resolve(true);
        }
      });
    });
  }

  /**
   * データベースの構造を解析
   * @returns {Promise<Object>} - テーブル構造
   */
  async analyzeStructure() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT name FROM sqlite_master WHERE type='table'",
        (err, tables) => {
          if (err) {
            reject(err);
            return;
          }

          const structure = {};
          let processedTables = 0;

          tables.forEach((table) => {
            this.db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
              if (err) {
                reject(err);
                return;
              }

              structure[table.name] = columns;
              processedTables++;

              if (processedTables === tables.length) {
                resolve(structure);
              }
            });
          });
        }
      );
    });
  }

  /**
   * LINEイベントデータを解析
   * @param {number} limit - 取得するレコード数
   * @returns {Promise<Array>} - 解析されたメッセージデータ
   */
  async parseLineEvents(limit = 100000) {
    return new Promise((resolve, reject) => {
      // timestampでソートして最近のメッセージを取得
      const query = `
        SELECT id, event 
        FROM events 
        WHERE event LIKE '%"timestamp"%'
        ORDER BY CAST(JSON_EXTRACT(event, '$.timestamp') AS INTEGER) DESC 
        LIMIT ${limit}
      `;

      this.db.all(query, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const messages = [];
        const participants = new Set();
        const groups = new Set();

        rows.forEach((row) => {
          try {
            const eventData = JSON.parse(row.event);

            if (
              eventData.type === "message" &&
              eventData.message &&
              eventData.message.type === "text"
            ) {
              const message = {
                id: eventData.message.id,
                text: eventData.message.text,
                timestamp: eventData.timestamp,
                senderId: eventData.source.userId,
                groupId: eventData.source.groupId,
                messageType: eventData.message.type,
                quoteToken: eventData.message.quoteToken || null,
              };

              messages.push(message);

              // 参加者とグループの情報を収集
              participants.add(eventData.source.userId);
              if (eventData.source.groupId) {
                groups.add(eventData.source.groupId);
              }
            }
          } catch (parseError) {
            console.warn("JSON解析エラー:", parseError.message);
          }
        });

        resolve({
          messages,
          participants: Array.from(participants),
          groups: Array.from(groups),
          totalEvents: rows.length,
        });
      });
    });
  }

  /**
   * 最近のメッセージを取得（時系列順）
   * @param {number} limit - 取得するレコード数
   * @returns {Promise<Array>} - 最近のメッセージデータ
   */
  async getRecentMessages(limit = 50) {
    return new Promise((resolve, reject) => {
      // 最近のメッセージを取得（timestampでソート）
      const query = `
        SELECT id, event 
        FROM events 
        WHERE event LIKE '%"type"%' 
        ORDER BY id DESC 
        LIMIT ${limit}
      `;

      this.db.all(query, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        const messages = [];
        const participants = new Set();
        const groups = new Set();

        rows.forEach((row) => {
          try {
            const eventData = JSON.parse(row.event);

            if (
              eventData.type === "message" &&
              eventData.message &&
              eventData.message.type === "text"
            ) {
              const message = {
                id: eventData.message.id,
                text: eventData.message.text,
                timestamp: eventData.timestamp,
                senderId: eventData.source.userId,
                groupId: eventData.source.groupId,
                messageType: eventData.message.type,
                quoteToken: eventData.message.quoteToken || null,
              };

              messages.push(message);

              // 参加者とグループの情報を収集
              participants.add(eventData.source.userId);
              if (eventData.source.groupId) {
                groups.add(eventData.source.groupId);
              }
            }
          } catch (parseError) {
            console.warn("JSON解析エラー:", parseError.message);
          }
        });

        // 時系列順に並び替え（古い順）
        messages.sort((a, b) => a.timestamp - b.timestamp);

        resolve({
          messages,
          participants: Array.from(participants),
          groups: Array.from(groups),
          totalEvents: rows.length,
        });
      });
    });
  }

  /**
   * 統計情報を取得
   * @returns {Promise<Object>} - 統計情報
   */
  async getStatistics() {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT COUNT(*) as total FROM events", (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        this.parseLineEvents(1000000)
          .then((data) => {
            const stats = {
              totalEvents: result.total,
              totalMessages: data.messages.length,
              uniqueParticipants: data.participants.length,
              uniqueGroups: data.groups.length,
              dateRange: this.getDateRange(data.messages),
              mostActiveUser: this.getMostActiveUser(data.messages),
              averageMessagesPerDay: this.calculateAverageMessagesPerDay(
                data.messages
              ),
            };

            resolve(stats);
          })
          .catch(reject);
      });
    });
  }

  /**
   * 日付範囲を取得
   * @param {Array} messages - メッセージ配列
   * @returns {Object} - 開始日と終了日
   */
  getDateRange(messages) {
    if (messages.length === 0) {
      return { start: null, end: null };
    }

    const timestamps = messages.map((m) => m.timestamp);
    const startDate = new Date(Math.min(...timestamps));
    const endDate = new Date(Math.max(...timestamps));

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
  }

  /**
   * 最もアクティブなユーザーを取得
   * @param {Array} messages - メッセージ配列
   * @returns {string} - ユーザーID
   */
  getMostActiveUser(messages) {
    const userCounts = {};

    messages.forEach((message) => {
      userCounts[message.senderId] = (userCounts[message.senderId] || 0) + 1;
    });

    const mostActive = Object.entries(userCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    return mostActive ? mostActive[0] : null;
  }

  /**
   * 1日あたりの平均メッセージ数を計算
   * @param {Array} messages - メッセージ配列
   * @returns {number} - 平均メッセージ数
   */
  calculateAverageMessagesPerDay(messages) {
    if (messages.length === 0) return 0;

    const dateRange = this.getDateRange(messages);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;

    return Math.round((messages.length / daysDiff) * 100) / 100;
  }

  /**
   * 特定の期間のメッセージを取得
   * @param {Date} startDate - 開始日
   * @param {Date} endDate - 終了日
   * @returns {Promise<Array>} - メッセージ配列
   */
  async getMessagesByDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();

      this.db.all(
        `SELECT id, event FROM events WHERE event LIKE '%"timestamp":%' AND event LIKE '%"type":"message"%' ORDER BY id`,
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const messages = [];
          rows.forEach((row) => {
            try {
              const eventData = JSON.parse(row.event);

              if (
                eventData.type === "message" &&
                eventData.message &&
                eventData.message.type === "text" &&
                eventData.timestamp >= startTimestamp &&
                eventData.timestamp <= endTimestamp
              ) {
                messages.push({
                  id: eventData.message.id,
                  text: eventData.message.text,
                  timestamp: eventData.timestamp,
                  senderId: eventData.source.userId,
                  groupId: eventData.source.groupId,
                });
              }
            } catch (parseError) {
              console.warn("JSON解析エラー:", parseError.message);
            }
          });

          resolve(messages);
        }
      );
    });
  }

  /**
   * データベースを閉じる
   */
  closeDatabase() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error(
            "データベースを閉じる際にエラーが発生しました:",
            err.message
          );
        } else {
          console.log("データベース接続を閉じました");
        }
      });
    }
  }
}

module.exports = LineDataParser;
