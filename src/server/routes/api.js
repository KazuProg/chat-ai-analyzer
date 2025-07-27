const express = require("express");
const path = require("path");
const fs = require("fs");
const LineDataParser = require("../../services/lineParser");
const GeminiService = require("../../services/gemini");
const StatisticsAnalyzer = require("../../services/statisticsAnalyzer");

const router = express.Router();

// グローバル変数としてLINEデータパーサーを保持
let lineParser = null;

// データベース初期化関数
async function initializeDatabase() {
  try {
    const dbPath = process.env.LINE_DATABASE_PATH;

    if (!dbPath) {
      console.log("LINE_DATABASE_PATHが設定されていません");
      return false;
    }

    // ファイルの存在確認
    if (!fs.existsSync(dbPath)) {
      console.log(`データベースファイルが見つかりません: ${dbPath}`);
      return false;
    }

    // LINEデータパーサーを初期化
    lineParser = new LineDataParser();
    await lineParser.openDatabase(dbPath);

    return true;
  } catch (error) {
    console.error("データベース初期化エラー:", error);
    return false;
  }
}

// サーバー起動時にデータベースを初期化
initializeDatabase();

// データベース状態確認API
router.get("/database/status", async (req, res) => {
  try {
    if (!lineParser) {
      return res.json({
        success: false,
        error: "データベースが読み込まれていません",
        message: "LINE_DATABASE_PATH環境変数を確認してください",
      });
    }

    const structure = await lineParser.analyzeStructure();

    res.json({
      success: true,
      message: "データベースが正常に読み込まれています",
      structure: structure,
      filePath: process.env.LINE_DATABASE_PATH,
    });
  } catch (error) {
    console.error("データベース状態確認エラー:", error);
    res.status(500).json({
      success: false,
      error: "データベース状態の確認中にエラーが発生しました",
    });
  }
});

// データベース再読み込みAPI
router.post("/database/reload", async (req, res) => {
  try {
    const success = await initializeDatabase();

    if (success) {
      res.json({
        success: true,
        message: "データベースが正常に再読み込みされました",
      });
    } else {
      res.status(400).json({
        success: false,
        error: "データベースの再読み込みに失敗しました",
      });
    }
  } catch (error) {
    console.error("データベース再読み込みエラー:", error);
    res.status(500).json({
      success: false,
      error: "データベースの再読み込み中にエラーが発生しました",
    });
  }
});

// チャット概要取得API
router.get("/chat/summary", async (req, res) => {
  try {
    if (!lineParser) {
      return res.status(400).json({
        success: false,
        error: "データベースが読み込まれていません",
      });
    }

    const statistics = await lineParser.getStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("統計情報取得エラー:", error);
    res.status(500).json({
      success: false,
      error: "統計情報の取得中にエラーが発生しました",
    });
  }
});

// メッセージ一覧取得API
router.get("/chat/messages", async (req, res) => {
  try {
    if (!lineParser) {
      return res.status(400).json({
        success: false,
        error: "データベースが読み込まれていません",
      });
    }

    const limit = parseInt(req.query.limit) || 100;
    const recent = req.query.recent === "true";

    let data;
    if (recent) {
      // 最近のメッセージを取得（時系列順）
      data = await lineParser.getRecentMessages(limit);
    } else {
      // 全期間のメッセージを取得
      data = await lineParser.parseLineEvents(limit);
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("メッセージ取得エラー:", error);
    res.status(500).json({
      success: false,
      error: "メッセージの取得中にエラーが発生しました",
    });
  }
});

// AI質問API
router.post("/ai/ask", async (req, res) => {
  try {
    const { question, context = "recent" } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "質問が入力されていません",
      });
    }

    if (!lineParser) {
      return res.status(400).json({
        success: false,
        error: "データベースが読み込まれていません",
      });
    }

    // コンテキストに応じてメッセージを取得
    let messages;
    if (context === "recent") {
      // 最近のメッセージを取得（時系列順）
      const data = await lineParser.getRecentMessages(50);
      messages = data.messages;
    } else if (context === "monthly") {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      messages = await lineParser.getMessagesByDateRange(startDate, endDate);
    } else {
      // 全期間のメッセージを取得
      const data = await lineParser.parseLineEvents(200);
      messages = data.messages;
    }

    // クライアントから送信された質問文を出力
    console.log(`\n質問: ${question}`);

    let answer;
    let confidence = 0.85;
    let useGemini = true;

    try {
      // Gemini APIを使用して回答を生成
      const geminiService = new GeminiService();
      answer = await geminiService.generateAnswer(question, messages);
    } catch (error) {
      console.log(
        "\nGemini APIが利用できないため、統計分析を使用します:",
        error.message
      );

      // 統計分析を使用
      const statisticsAnalyzer = new StatisticsAnalyzer();
      answer = statisticsAnalyzer.analyzeMessages(messages, question);
      confidence = 0.7; // 統計分析の信頼度
      useGemini = false;
    }

    res.json({
      success: true,
      answer: answer,
      confidence: confidence,
      timestamp: new Date().toISOString(),
      context: context,
      messageCount: messages.length,
      useGemini: useGemini,
    });
  } catch (error) {
    console.error("\nAI質問エラー:", error);
    res.status(500).json({
      success: false,
      error: "AI回答の生成中にエラーが発生しました",
    });
  }
});

// ファイル処理状況確認API
router.get("/file/status", (req, res) => {
  res.json({
    success: true,
    data: {
      isLoaded: lineParser !== null,
      timestamp: lineParser ? new Date().toISOString() : null,
    },
  });
});

// ヘルスチェックエンドポイント
router.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "chat-ai-analyzer",
  });
});

module.exports = router;
