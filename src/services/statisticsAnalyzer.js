class StatisticsAnalyzer {
  /**
   * メッセージデータから基本的な統計分析を生成
   * @param {Array} messages - LINEメッセージ配列
   * @param {string} question - ユーザーの質問
   * @returns {string} - 分析結果
   */
  analyzeMessages(messages, question) {
    if (!messages || messages.length === 0) {
      return "会話データがありません。";
    }

    const analysis = this.performAnalysis(messages);
    return this.generateResponse(question, analysis);
  }

  /**
   * メッセージデータの分析を実行
   * @param {Array} messages - メッセージ配列
   * @returns {Object} - 分析結果
   */
  performAnalysis(messages) {
    // ユーザー別メッセージ数
    const userCounts = {};
    const userMessages = {};

    // 時間帯別分析
    const hourCounts = {};

    // キーワード分析
    const keywords = {};

    messages.forEach((message) => {
      // ユーザー別カウント
      const userId = message.senderId;
      userCounts[userId] = (userCounts[userId] || 0) + 1;

      if (!userMessages[userId]) {
        userMessages[userId] = [];
      }
      userMessages[userId].push(message.text);

      // 時間帯分析
      const date = new Date(message.timestamp);
      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;

      // キーワード分析（簡単な単語カウント）
      const words = message.text.split(/\s+/);
      words.forEach((word) => {
        if (word.length > 1) {
          keywords[word] = (keywords[word] || 0) + 1;
        }
      });
    });

    // 最もアクティブなユーザー
    const mostActiveUser = Object.entries(userCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    // 最も話されている時間帯
    const mostActiveHour = Object.entries(hourCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    // 最も使われているキーワード
    const topKeywords = Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      totalMessages: messages.length,
      uniqueUsers: Object.keys(userCounts).length,
      mostActiveUser: mostActiveUser ? mostActiveUser[0] : null,
      mostActiveUserCount: mostActiveUser ? mostActiveUser[1] : 0,
      mostActiveHour: mostActiveHour ? mostActiveHour[0] : null,
      mostActiveHourCount: mostActiveHour ? mostActiveHour[1] : 0,
      topKeywords: topKeywords,
      userMessages: userMessages,
      dateRange: this.getDateRange(messages),
    };
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
   * 質問に基づいて回答を生成
   * @param {string} question - ユーザーの質問
   * @param {Object} analysis - 分析結果
   * @returns {string} - 回答
   */
  generateResponse(question, analysis) {
    const questionLower = question.toLowerCase();

    // 質問の種類を判定
    if (
      questionLower.includes("話題") ||
      questionLower.includes("話") ||
      questionLower.includes("キーワード")
    ) {
      return this.generateTopicAnalysis(analysis);
    } else if (
      questionLower.includes("アクティブ") ||
      questionLower.includes("活発") ||
      questionLower.includes("誰")
    ) {
      return this.generateUserAnalysis(analysis);
    } else if (
      questionLower.includes("時間") ||
      questionLower.includes("いつ")
    ) {
      return this.generateTimeAnalysis(analysis);
    } else if (
      questionLower.includes("統計") ||
      questionLower.includes("概要")
    ) {
      return this.generateGeneralAnalysis(analysis);
    } else {
      return this.generateGeneralAnalysis(analysis);
    }
  }

  /**
   * 話題分析の回答を生成
   * @param {Object} analysis - 分析結果
   * @returns {string} - 回答
   */
  generateTopicAnalysis(analysis) {
    let response = `このグループの話題分析結果です：\n\n`;

    if (analysis.topKeywords.length > 0) {
      response += `【最も使われているキーワード】\n`;
      analysis.topKeywords.slice(0, 5).forEach(([word, count], index) => {
        response += `${index + 1}. "${word}" (${count}回)\n`;
      });
    }

    response += `\n【統計情報】\n`;
    response += `- 総メッセージ数: ${analysis.totalMessages}件\n`;
    response += `- 参加者数: ${analysis.uniqueUsers}人\n`;

    return response;
  }

  /**
   * ユーザー分析の回答を生成
   * @param {Object} analysis - 分析結果
   * @returns {string} - 回答
   */
  generateUserAnalysis(analysis) {
    let response = `このグループのユーザー分析結果です：\n\n`;

    if (analysis.mostActiveUser) {
      response += `【最もアクティブなユーザー】\n`;
      response += `- ユーザーID: ${analysis.mostActiveUser}\n`;
      response += `- メッセージ数: ${analysis.mostActiveUserCount}件\n`;
    }

    response += `\n【統計情報】\n`;
    response += `- 総メッセージ数: ${analysis.totalMessages}件\n`;
    response += `- 参加者数: ${analysis.uniqueUsers}人\n`;
    response += `- 平均メッセージ数/人: ${Math.round(
      analysis.totalMessages / analysis.uniqueUsers
    )}件\n`;

    return response;
  }

  /**
   * 時間分析の回答を生成
   * @param {Object} analysis - 分析結果
   * @returns {string} - 回答
   */
  generateTimeAnalysis(analysis) {
    let response = `このグループの時間帯分析結果です：\n\n`;

    if (analysis.mostActiveHour !== null) {
      response += `【最も活発な時間帯】\n`;
      response += `- 時間: ${analysis.mostActiveHour}時\n`;
      response += `- メッセージ数: ${analysis.mostActiveHourCount}件\n`;
    }

    if (analysis.dateRange.start && analysis.dateRange.end) {
      const startDate = new Date(analysis.dateRange.start);
      const endDate = new Date(analysis.dateRange.end);
      response += `\n【期間】\n`;
      response += `- 開始: ${startDate.toLocaleDateString("ja-JP")}\n`;
      response += `- 終了: ${endDate.toLocaleDateString("ja-JP")}\n`;
    }

    return response;
  }

  /**
   * 一般的な分析の回答を生成
   * @param {Object} analysis - 分析結果
   * @returns {string} - 回答
   */
  generateGeneralAnalysis(analysis) {
    let response = `このグループの分析結果です：\n\n`;

    response += `【基本統計】\n`;
    response += `- 総メッセージ数: ${analysis.totalMessages}件\n`;
    response += `- 参加者数: ${analysis.uniqueUsers}人\n`;
    response += `- 平均メッセージ数/人: ${Math.round(
      analysis.totalMessages / analysis.uniqueUsers
    )}件\n`;

    if (analysis.mostActiveUser) {
      response += `- 最もアクティブなユーザー: ${analysis.mostActiveUser} (${analysis.mostActiveUserCount}件)\n`;
    }

    if (analysis.mostActiveHour !== null) {
      response += `- 最も活発な時間帯: ${analysis.mostActiveHour}時 (${analysis.mostActiveHourCount}件)\n`;
    }

    if (analysis.topKeywords.length > 0) {
      response += `\n【よく使われるキーワード】\n`;
      analysis.topKeywords.slice(0, 3).forEach(([word, count], index) => {
        response += `${index + 1}. "${word}" (${count}回)\n`;
      });
    }

    return response;
  }
}

module.exports = StatisticsAnalyzer;
