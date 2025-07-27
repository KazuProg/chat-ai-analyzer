# グループ LINE 会話データ活用 AI ツール 技術仕様書

## 1. システムアーキテクチャ

### 1.1 全体構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser  │    │   Express.js    │    │   SQLite DB     │
│   (Frontend)   │◄──►│   (Backend)     │◄──►│   (LINE Data)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Gemini API     │
                       │  (AI Service)   │
                       └─────────────────┘
```

### 1.2 技術スタック

- **バックエンド**: Node.js + Express.js
- **フロントエンド**: HTML5 + CSS3 + JavaScript (ES6+)
- **データベース**: SQLite3
- **AI API**: Google Gemini API
- **開発環境**: npm + nodemon

## 2. プロジェクト構造

```
chat-ai-analyzer/
├── src/
│   ├── server/
│   │   ├── app.js              # Express.js メインアプリケーション
│   │   ├── routes/
│   │   │   ├── api.js          # API エンドポイント
│   │   │   └── web.js          # Web ページルート
│   │   ├── services/
│   │   │   ├── database.js     # SQLite データベース操作
│   │   │   ├── gemini.js       # Gemini API 連携
│   │   │   └── lineParser.js   # LINE データ解析
│   │   ├── middleware/
│   │   │   ├── cors.js         # CORS 設定
│   │   │   └── errorHandler.js # エラーハンドリング
│   │   └── utils/
│   │       ├── logger.js       # ログ機能
│   │       └── validator.js    # 入力検証
│   ├── public/
│   │   ├── index.html          # メインページ
│   │   ├── css/
│   │   │   └── style.css       # スタイルシート
│   │   ├── js/
│   │   │   └── app.js          # フロントエンドJavaScript
│   │   └── assets/             # 画像・アイコン等
│   └── config/
│       ├── database.js         # データベース設定
│       └── gemini.js           # Gemini API設定
├── data/
│   └── line_chat.db           # LINE会話データSQLiteファイル
├── .env                        # 環境変数
├── .gitignore
├── package.json
├── requirements.md             # 要件定義書
└── technical-specification.md # 技術仕様書
```

## 3. データベース設計

### 3.1 SQLite ファイル構造（想定）

```sql
-- LINE会話データの一般的な構造（実際の構造に応じて調整）
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    sender_name TEXT,
    message TEXT,
    timestamp DATETIME,
    message_type TEXT,
    group_id TEXT
);

CREATE TABLE participants (
    id INTEGER PRIMARY KEY,
    name TEXT,
    user_id TEXT,
    group_id TEXT
);

CREATE TABLE groups (
    id INTEGER PRIMARY KEY,
    name TEXT,
    created_at DATETIME
);
```

### 3.2 データ処理仕様

- **文字エンコーディング**: UTF-8
- **日時フォーマット**: ISO 8601 (YYYY-MM-DD HH:MM:SS)
- **絵文字処理**: Unicode 絵文字として保持
- **スタンプ処理**: スタンプ名として保存

## 4. API 設計

### 4.1 RESTful API エンドポイント

#### データ取得 API

```
GET /api/chat/summary          # チャット概要取得
GET /api/chat/messages         # メッセージ一覧取得
GET /api/chat/participants     # 参加者一覧取得
GET /api/chat/statistics       # 統計情報取得
```

#### AI 質問 API

```
POST /api/ai/ask              # 質問送信
GET /api/ai/history           # 質問履歴取得
```

#### ファイル管理 API

```
POST /api/file/upload          # SQLiteファイルアップロード
GET /api/file/status          # ファイル処理状況確認
```

### 4.2 リクエスト・レスポンス形式

#### 質問送信 API

```javascript
// POST /api/ai/ask
{
  "question": "このグループで最も話されている話題は何ですか？",
  "context": "recent" // "all", "recent", "monthly"
}

// レスポンス
{
  "success": true,
  "answer": "このグループでは...",
  "confidence": 0.85,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### チャット概要 API

```javascript
// GET /api/chat/summary
{
  "success": true,
  "data": {
    "totalMessages": 1500,
    "totalParticipants": 25,
    "dateRange": {
      "start": "2023-01-01",
      "end": "2024-01-01"
    },
    "mostActiveUser": "田中太郎",
    "averageMessagesPerDay": 15.2
  }
}
```

## 5. Gemini API 連携

### 5.1 プロンプト設計

```javascript
const systemPrompt = `
あなたはLINEグループの会話データを分析するAIアシスタントです。
以下の会話データを基に、ユーザーの質問に回答してください。

会話データ:
${conversationData}

質問: ${userQuestion}

回答は以下の形式で提供してください：
- 具体的なデータに基づいた回答
- 必要に応じて統計情報を含める
- 日本語で自然な文章で回答
`;
```

### 5.2 コンテキスト管理

- **最大トークン数**: 32,000 トークン
- **会話データの圧縮**: 重要なメッセージのみ抽出
- **時系列データ**: 最新のデータを優先

## 6. フロントエンド設計

### 6.1 UI 構成

```
┌─────────────────────────────────────┐
│  LINEグループ会話分析AIツール        │
├─────────────────────────────────────┤
│  [ファイル選択] [分析開始]           │
├─────────────────────────────────────┤
│  📊 統計情報                        │
│  - 総メッセージ数: 1,500            │
│  - 参加者数: 25                     │
│  - 期間: 2023/01/01 - 2024/01/01   │
├─────────────────────────────────────┤
│  💬 質問入力                        │
│  [質問を入力してください...]         │
│  [送信]                            │
├─────────────────────────────────────┤
│  🤖 AI回答                          │
│  [回答がここに表示されます]         │
└─────────────────────────────────────┘
```

### 6.2 レスポンシブデザイン

- **デスクトップ**: 1200px 以上
- **タブレット**: 768px - 1199px
- **モバイル**: 767px 以下

## 7. セキュリティ仕様

### 7.1 API キー管理

```javascript
// .env ファイル
GEMINI_API_KEY = your_api_key_here;
PORT = 3000;
NODE_ENV = development;
```

### 7.2 入力検証

- **SQLite ファイル**: ファイル形式・サイズ制限
- **質問入力**: XSS 対策・文字数制限
- **API リクエスト**: レート制限

## 8. エラーハンドリング

### 8.1 エラーコード

```javascript
const ERROR_CODES = {
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  INVALID_FILE_FORMAT: "INVALID_FILE_FORMAT",
  API_ERROR: "API_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
};
```

### 8.2 ログ仕様

- **ログレベル**: error, warn, info, debug
- **ログ形式**: JSON 形式
- **ログ出力**: ファイル + コンソール

## 9. パフォーマンス最適化

### 9.1 データベース最適化

- **インデックス**: 頻繁に検索されるカラムにインデックス設定
- **クエリ最適化**: 必要なカラムのみ取得
- **接続プール**: データベース接続の再利用

### 9.2 フロントエンド最適化

- **キャッシュ**: 静的ファイルのキャッシュ
- **圧縮**: gzip 圧縮の適用
- **遅延読み込み**: 大きなデータの段階的読み込み

## 10. テスト仕様

### 10.1 単体テスト

- **データベース操作**: SQLite ファイル読み取りテスト
- **API 連携**: Gemini API 通信テスト
- **入力検証**: バリデーション機能テスト

### 10.2 統合テスト

- **エンドツーエンド**: 質問から回答までの流れ
- **パフォーマンス**: 大量データ処理テスト
- **エラー処理**: 異常系テスト

## 11. デプロイメント

### 11.1 開発環境

```bash
npm install
npm run dev
```

### 11.2 本番環境

```bash
npm install --production
npm start
```

### 11.3 環境変数

- **開発**: `.env.development`
- **本番**: `.env.production`
- **テスト**: `.env.test`
