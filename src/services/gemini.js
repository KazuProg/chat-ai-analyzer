const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEYが設定されていません");
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * LINE会話データを基に質問に回答を生成
   * @param {string} question - ユーザーの質問
   * @param {Array} messages - LINEメッセージ配列
   * @returns {Promise<string>} - AI回答
   */
  async generateAnswer(question, messages) {
    try {
      // メッセージデータをテキスト形式に変換
      const conversationText = this.formatMessagesForPrompt(messages);

      // プロンプトを構築
      const prompt = this.buildPrompt(question, conversationText);

      // Gemini APIにリクエスト
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

  /**
   * メッセージデータをプロンプト用のテキスト形式に変換
   * @param {Array} messages - メッセージ配列
   * @returns {string} - フォーマットされたテキスト
   */
  formatMessagesForPrompt(messages) {
    if (!messages || messages.length === 0) {
      return "会話データがありません。";
    }

    // メッセージを時系列順にソート
    const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);

    // テキスト形式に変換
    const formattedMessages = sortedMessages.map((msg, index) => {
      const date = new Date(msg.timestamp);
      const timeStr = date.toLocaleString("ja-JP");

      return `${index + 1}. [${timeStr}] ユーザー${msg.senderId}: ${msg.text}`;
    });

    return formattedMessages.join("\n");
  }

  /**
   * AIプロンプトを構築
   * @param {string} question - ユーザーの質問
   * @param {string} conversationText - 会話テキスト
   * @returns {string} - 構築されたプロンプト
   */
  buildPrompt(question, conversationText) {
    return `
あなたはLINEグループの会話データを分析するAIアシスタントです。
以下の会話データを基に、ユーザーの質問に回答してください。

【会話データ】
${conversationText}

【質問】
${question}

【回答の指示】
- 会話データに基づいて具体的に回答してください
- データが不足している場合は、その旨を明記してください
- 統計情報がある場合は、数値も含めて回答してください
- 日本語で自然な文章で回答してください
- 回答は簡潔で分かりやすくしてください

【回答】
`;
  }

  /**
   * 統計情報を基にした分析回答を生成
   * @param {Object} statistics - 統計情報
   * @returns {Promise<string>} - 分析結果
   */
  async generateStatisticsAnalysis(statistics) {
    try {
      const prompt = `
以下のLINEグループの統計情報を分析してください：

【統計情報】
- 総メッセージ数: ${statistics.totalMessages}
- 参加者数: ${statistics.uniqueParticipants}
- 期間: ${statistics.dateRange.start} から ${statistics.dateRange.end}
- 最もアクティブなユーザー: ${statistics.mostActiveUser}
- 1日あたりの平均メッセージ数: ${statistics.averageMessagesPerDay}

【分析の指示】
- このグループの特徴を分析してください
- 活動レベルについて評価してください
- 改善点があれば提案してください
- 日本語で自然な文章で回答してください

【分析結果】
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;

      return response.text();
    } catch (error) {
      console.error("統計分析エラー:", error);
      throw new Error("統計分析の生成に失敗しました");
    }
  }

  /**
   * 特定の話題に関する分析を生成
   * @param {string} topic - 分析したい話題
   * @param {Array} messages - メッセージ配列
   * @returns {Promise<string>} - 話題分析結果
   */
  async generateTopicAnalysis(topic, messages) {
    try {
      const conversationText = this.formatMessagesForPrompt(messages);

      const prompt = `
以下の会話データから「${topic}」に関する分析を行ってください：

【会話データ】
${conversationText}

【分析の指示】
- 「${topic}」に関する言及を抽出してください
- どのような文脈で話題に上がっているか分析してください
- 参加者の反応や意見を分析してください
- 話題の頻度や重要度を評価してください
- 日本語で自然な文章で回答してください

【分析結果】
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;

      return response.text();
    } catch (error) {
      console.error("話題分析エラー:", error);
      throw new Error("話題分析の生成に失敗しました");
    }
  }

  /**
   * 感情分析を生成
   * @param {Array} messages - メッセージ配列
   * @returns {Promise<string>} - 感情分析結果
   */
  async generateSentimentAnalysis(messages) {
    try {
      const conversationText = this.formatMessagesForPrompt(messages);

      const prompt = `
以下の会話データの感情分析を行ってください：

【会話データ】
${conversationText}

【分析の指示】
- 全体的な会話の雰囲気を分析してください
- 感情的な表現や反応を分析してください
- グループの関係性について分析してください
- ポジティブ・ネガティブな要素を抽出してください
- 日本語で自然な文章で回答してください

【分析結果】
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;

      return response.text();
    } catch (error) {
      console.error("感情分析エラー:", error);
      throw new Error("感情分析の生成に失敗しました");
    }
  }
}

module.exports = GeminiService;
