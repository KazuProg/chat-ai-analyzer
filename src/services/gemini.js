const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEYが設定されていません");
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateAnswer(question, messages) {
    try {
      const prompt = this.buildPrompt(question, messages);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;

      return response.text();
    } catch (error) {
      console.error("Gemini API エラー:", error);

      // レート制限エラーの場合
      if (error.message && error.message.includes("429")) {
        throw new Error(
          "APIの利用制限に達しました。しばらく待ってから再試行してください。"
        );
      }

      // その他のエラー
      throw new Error("AI回答の生成に失敗しました: " + error.message);
    }
  }

  formatMessagesForPrompt(messages) {
    if (!messages || messages.length === 0) {
      return "会話データがありません。";
    }

    const formattedMessages = messages.map((msg) => {
      const timestamp = new Date(msg.timestamp).toLocaleString("ja-JP");
      return `**${msg.senderId}** (${timestamp}): ${msg.text}`;
    });

    return formattedMessages.join("\n\n");
  }

  buildPrompt(question, messages) {
    const formattedMessages = this.formatMessagesForPrompt(messages);
    const messageCount = messages.length;

    return `あなたはLINEグループの会話データを分析するAIアシスタントです。

## 分析対象データ
- メッセージ数: ${messageCount}件
- 期間: ${this.getDateRange(messages)}

## 会話データ
\`\`\`
${formattedMessages}
\`\`\`

## ユーザーの質問
${question}

## 回答形式
以下の形式でMarkdownを使用して回答してください：

### 📊 分析結果
- 主要な発見や洞察を箇条書きで
- データに基づく具体的な数値や割合

### 🔍 詳細分析
- より深い分析や背景情報
- パターンや傾向の説明

### 💡 考察
- 分析結果の解釈
- グループの特徴や傾向

### 📈 統計情報（該当する場合）
| 項目 | 数値 |
|------|------|
| 総メッセージ数 | ${messageCount} |
| 参加者数 | ${this.getUniqueParticipants(messages).length} |

## 注意事項
- データに基づく客観的な分析を行ってください
- 推測ではなく、実際のデータから読み取れる情報のみを述べてください
- 日本語で回答してください
- Markdown形式を使用して見やすく構造化してください
- 絵文字を適切に使用して視覚的に分かりやすくしてください`;
  }

  getDateRange(messages) {
    if (!messages || messages.length === 0) {
      return "データなし";
    }

    const timestamps = messages.map((msg) => msg.timestamp);
    const startDate = new Date(Math.min(...timestamps));
    const endDate = new Date(Math.max(...timestamps));

    return `${startDate.toLocaleDateString(
      "ja-JP"
    )} ～ ${endDate.toLocaleDateString("ja-JP")}`;
  }

  getUniqueParticipants(messages) {
    if (!messages) return [];
    const participants = new Set();
    messages.forEach((msg) => {
      if (msg.senderId) {
        participants.add(msg.senderId);
      }
    });
    return Array.from(participants);
  }

  generateStatisticsAnalysis(messages) {
    if (!messages || messages.length === 0) {
      return "## 📊 統計分析\n\n会話データがありません。";
    }

    const participants = this.getUniqueParticipants(messages);
    const messageCount = messages.length;
    const dateRange = this.getDateRange(messages);

    return `## 📊 統計分析

### 基本情報
- **総メッセージ数**: ${messageCount}件
- **参加者数**: ${participants.length}人
- **分析期間**: ${dateRange}

### 参加者別メッセージ数
${this.generateParticipantStats(messages)}

### 時間帯別分析
${this.generateTimeStats(messages)}`;
  }

  generateParticipantStats(messages) {
    const participantCounts = {};
    messages.forEach((msg) => {
      const sender = msg.senderId || "不明";
      participantCounts[sender] = (participantCounts[sender] || 0) + 1;
    });

    const sortedParticipants = Object.entries(participantCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return sortedParticipants
      .map(([participant, count]) => `- **${participant}**: ${count}件`)
      .join("\n");
  }

  generateTimeStats(messages) {
    const hourCounts = {};
    messages.forEach((msg) => {
      const hour = new Date(msg.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const mostActiveHour = Object.entries(hourCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    return `- **最も活発な時間帯**: ${mostActiveHour[0]}時 (${mostActiveHour[1]}件)`;
  }

  generateTopicAnalysis(messages) {
    if (!messages || messages.length === 0) {
      return "## 🗣️ 話題分析\n\n会話データがありません。";
    }

    return `## 🗣️ 話題分析

### 主要な話題
${this.extractTopics(messages)}

### 会話の特徴
- グループの雰囲気や特徴を分析
- 頻出するキーワードや表現
- 参加者の関心分野`;
  }

  extractTopics(messages) {
    // 簡単なキーワード抽出（実際の実装ではより高度な分析が必要）
    const commonWords = ["ありがとう", "了解", "OK", "はい", "いいえ"];
    const wordCounts = {};

    messages.forEach((msg) => {
      const text = msg.text || "";
      commonWords.forEach((word) => {
        if (text.includes(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    const topWords = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return topWords
      .map(([word, count]) => `- **${word}**: ${count}回`)
      .join("\n");
  }

  generateUserAnalysis(messages) {
    if (!messages || messages.length === 0) {
      return "## 👥 ユーザー分析\n\n会話データがありません。";
    }

    const participants = this.getUniqueParticipants(messages);
    const participantCounts = {};

    messages.forEach((msg) => {
      const sender = msg.senderId || "不明";
      participantCounts[sender] = (participantCounts[sender] || 0) + 1;
    });

    const sortedParticipants = Object.entries(participantCounts).sort(
      ([, a], [, b]) => b - a
    );

    return `## 👥 ユーザー分析

### 参加者別活動度
${sortedParticipants
  .map(
    ([participant, count], index) =>
      `${index + 1}. **${participant}**: ${count}件`
  )
  .join("\n")}

### 分析結果
- **最もアクティブな参加者**: ${sortedParticipants[0]?.[0] || "不明"}
- **総参加者数**: ${participants.length}人
- **平均メッセージ数**: ${Math.round(
      messages.length / participants.length
    )}件/人`;
  }

  generateTimeAnalysis(messages) {
    if (!messages || messages.length === 0) {
      return "## ⏰ 時間分析\n\n会話データがありません。";
    }

    const hourCounts = {};
    const dayCounts = {};

    messages.forEach((msg) => {
      const date = new Date(msg.timestamp);
      const hour = date.getHours();
      const day = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const mostActiveHour = Object.entries(hourCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    const mostActiveDay = Object.entries(dayCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

    return `## ⏰ 時間分析

### 時間帯別活動
- **最も活発な時間帯**: ${mostActiveHour[0]}時 (${mostActiveHour[1]}件)
- **最も活発な曜日**: ${dayNames[mostActiveDay[0]]}曜日 (${mostActiveDay[1]}件)

### 活動パターン
- グループの活動時間帯の特徴
- 週間での活動パターン
- 時間帯による話題の変化`;
  }

  generateGeneralAnalysis(messages) {
    if (!messages || messages.length === 0) {
      return "## �� 総合分析\n\n会話データがありません。";
    }

    const participants = this.getUniqueParticipants(messages);
    const dateRange = this.getDateRange(messages);

    return `## 📈 総合分析

### 基本統計
| 項目 | 数値 |
|------|------|
| 総メッセージ数 | ${messages.length} |
| 参加者数 | ${participants.length} |
| 分析期間 | ${dateRange} |

### グループの特徴
- 活動レベルと参加者の関与度
- 会話の質と内容の多様性
- グループの雰囲気とコミュニケーションスタイル

### 推奨事項
- データに基づく改善提案
- グループ活性化のためのアドバイス`;
  }
}

module.exports = GeminiService;
