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
      const userName = msg.userName || msg.senderId; // ユーザー名があれば使用、なければIDを使用
      return `**${userName}** (${timestamp}): ${msg.text}`;
    });

    return formattedMessages.join("\n\n");
  }

  buildPrompt(question, messages) {
    const formattedMessages = this.formatMessagesForPrompt(messages);
    const messageCount = messages.length;

    return `あなたはLINEグループの会話を覚えているAIアシスタントです。
グループの過去の会話を思い出して、ユーザーの質問に回答してください。

## 会話データ
\`\`\`
${formattedMessages}
\`\`\`

## ユーザーの質問
${question}

## 回答の指示
- 見出し（##、###）を適切に使用して構造化してください
- 重要な情報は箇条書き（-、*）で簡潔にまとめてください
- 文章と箇条書きを適度に組み合わせて読みやすくしてください
- 具体的な会話の内容やエピソードを自然に織り交ぜてください
- 統計や数字よりも、実際の会話の雰囲気や内容を重視してください
- 長すぎず、簡潔で読みやすい形式にしてください
- グループの雰囲気や特徴を自然に表現してください

## 回答形式の例
### 主要な話題
グループでは〇〇についての議論が活発でした。特に〇〇さんの提案が注目を集めていました。

**具体的な内容：**
- 〇〇についての詳細な議論
- みんなの反応と意見
- 〇〇さんの具体的な提案

### 覚えている会話
〇〇さんが「〇〇」と言った時、みんなで盛り上がりました。特に〇〇時に話題が集中していました。

**印象に残っているやり取り：**
- 〇〇さんの発言
- みんなの反応
- その時の雰囲気

## 注意事項
- データに基づく実際の会話内容のみを述べてください
- 推測や創作は避けてください
- 見出しと箇条書きを適度に組み合わせてください
- 簡潔で読みやすい形式にしてください`;
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
      return "## データ状況\n\n- 会話データがありません\n- グループで話し始めたら、またお聞かせください";
    }

    const participants = this.getUniqueParticipants(messages);
    const messageCount = messages.length;

    return `## グループ概要\n\n- **メッセージ数**: ${messageCount}件\n- **参加者数**: ${participants.length}人\n\n## 質問例\n\n- 最近どんな話題で盛り上がっていましたか？\n- 〇〇さんはどんな話をよくしていますか？\n- あの時の会話を覚えていますか？\n\n何でもお聞かせください。`;
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
      return "## データ状況\n\n- 会話データがありません\n- グループで話し始めたら、またお聞かせください";
    }

    return `## 話題分析\n\n## 質問例\n\n- 最近どんな話題で盛り上がっていましたか？\n- 〇〇について話していましたか？\n- あの時の会話を覚えていますか？\n\n何でもお聞かせください。`;
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
      return "## データ状況\n\n- 会話データがありません\n- グループで話し始めたら、またお聞かせください";
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

    return `## メンバー概要\n\n- **参加者数**: ${participants.length}人\n\n## 質問例\n\n- 〇〇さんはどんな話をよくしていますか？\n- 誰が一番よく話していますか？\n- あの時の会話を覚えていますか？\n\n何でもお聞かせください。`;
  }

  generateTimeAnalysis(messages) {
    if (!messages || messages.length === 0) {
      return "## データ状況\n\n- 会話データがありません\n- グループで話し始めたら、またお聞かせください";
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

    return `## 活動時間分析\n\n## 質問例\n\n- いつ頃よく話していますか？\n- 〇〇時頃の会話を覚えていますか？\n- あの時の会話を覚えていますか？\n\n何でもお聞かせください。`;
  }

  generateGeneralAnalysis(messages) {
    if (!messages || messages.length === 0) {
      return "## データ状況\n\n- 会話データがありません\n- グループで話し始めたら、またお聞かせください";
    }

    const participants = this.getUniqueParticipants(messages);
    const dateRange = this.getDateRange(messages);

    return `## グループ概要\n\n- **参加者数**: ${participants.length}人\n\n## 質問例\n\n- 最近どんな話題で盛り上がっていましたか？\n- 〇〇について話していましたか？\n- あの時の会話を覚えていますか？\n\n何でもお聞かせください。`;
  }
}

module.exports = GeminiService;
