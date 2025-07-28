# LINE グループ会話分析 AI ツール

LINE のグループ会話データを AI で分析して、グループの特徴を理解するための Web アプリケーションです。

## 🚀 機能

- **AI 分析**: Google Gemini API を使用した高度な会話分析
- **統計分析**: AI が利用できない場合のフォールバック機能
- **時系列分析**: 最近のメッセージから全期間まで柔軟な分析範囲
- **シンプル UI**: 直感的で使いやすい Web インターフェース
- **質問履歴**: 過去の質問と回答の管理

## 📋 要件

- Node.js 16.0 以上
- npm または yarn
- Google Gemini API キー
- LINE の SQLite データベースファイル（chat テーブル形式）

## 🛠️ セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd chat-ai-analyzer
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp env.example .env
```

`.env`ファイルを編集して以下を設定：

```env
# Gemini API設定
GEMINI_API_KEY=your_gemini_api_key_here

# データベース設定
LINE_DATABASE_PATH=./data/line_chat.db

# サーバー設定
PORT=3000
NODE_ENV=development
```

### 4. Gemini API キーの取得

1. [Google AI Studio](https://aistudio.google.com/)にアクセス
2. API キーを生成
3. `.env`ファイルの`GEMINI_API_KEY`に設定

### 5. LINE データベースファイルの配置

データベースファイルは以下の構造のテーブルを含む必要があります：

### chat テーブル

```sql
CREATE TABLE "chat" (
	"id"	TEXT,
	"timestamp"	TEXT,
	"user"	TEXT,
	"message"	TEXT,
	PRIMARY KEY("id")
);
```

### user テーブル（オプション）

```sql
CREATE TABLE "user" (
	"id"	TEXT,
	"name"	TEXT,
	PRIMARY KEY("id")
);
```

**注意**: `user`テーブルが存在する場合、AI の応答でユーザー ID ではなくユーザー名が表示されます。

```bash
mkdir -p data
cp your_line_chat.db ./data/line_chat.db
```

## 🚀 起動方法

### Docker での実行（推奨）

#### 1. Docker と Docker Compose のインストール

Docker と Docker Compose がインストールされていることを確認してください。

#### 2. 環境変数の設定

```bash
cp env.example .env
```

`.env`ファイルを編集して以下を設定：

```env
# Gemini API設定
GEMINI_API_KEY=your_gemini_api_key_here

# サーバー設定
PORT=3000
NODE_ENV=production
```

**注意**: `LINE_DATABASE_PATH`は Docker Compose で自動設定されるため、.env ファイルには記載不要です。

#### 3. LINE データベースファイルの配置

```bash
# データディレクトリを作成
mkdir -p data

# LINEデータベースファイルを配置
# ファイル名は必ず line_chat.db にしてください
cp your_line_chat.db ./data/line_chat.db
```

**重要**:

- データベースファイルは必ず `./data/line_chat.db` という名前で配置してください
- データベースには `chat` テーブルが含まれている必要があります
- `user` テーブルはオプションですが、存在する場合 AI の応答でユーザー名が表示されます

#### 4. Docker Compose で起動

```bash
# アプリケーションをビルドして起動
docker-compose up --build

# バックグラウンドで起動する場合
docker-compose up -d --build
```

#### 5. アプリケーションにアクセス

ブラウザで `http://localhost:3000` を開きます。

#### 6. ログの確認

```bash
# ログを確認
docker-compose logs -f

# 特定のサービスのログを確認
docker-compose logs -f chat-ai-analyzer
```

#### 7. 停止

```bash
# アプリケーションを停止
docker-compose down

# ボリュームも削除する場合
docker-compose down -v
```

### 従来の方法（Node.js 直接実行）

#### 開発モード

```bash
npm run dev
```

#### 本番モード

```bash
npm start
```

アプリケーションは `http://localhost:3000` で起動します。

## 📖 使用方法

### 1. アプリケーションにアクセス

ブラウザで `http://localhost:3000` を開きます。

### 2. 質問を入力

- テキストエリアに質問を入力
- 分析範囲を選択：
  - **最近のメッセージ（50 件）**: 最新の会話を分析
  - **過去 1 ヶ月**: 過去 1 ヶ月の会話を分析
  - **全期間（1000 件）**: 全期間の会話を分析

### 3. 質問を送信

「質問を送信」ボタンをクリックして AI 分析を実行します。

### 4. 結果を確認

AI の回答が表示され、質問履歴に保存されます。

## 💡 質問例

- 「このグループで最も話されている話題は何ですか？」
- 「最もアクティブな人は誰ですか？」
- 「最近の会話の傾向を教えてください」
- 「このグループの特徴を分析してください」

## 🏗️ アーキテクチャ

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

### ディレクトリ構造

```
chat-ai-analyzer/
├── src/
│   ├── public/           # フロントエンド
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   ├── server/           # バックエンド
│   │   ├── app.js
│   │   └── routes/
│   └── services/         # ビジネスロジック
│       ├── gemini.js
│       ├── lineParser.js
│       └── statisticsAnalyzer.js
├── data/                 # データベースファイル
├── .env                  # 環境変数
└── package.json
```

## 🔧 技術スタック

### バックエンド

- **Node.js**: サーバーサイド JavaScript
- **Express.js**: Web フレームワーク
- **SQLite3**: データベース
- **@google/generative-ai**: Gemini API 統合

### フロントエンド

- **HTML5**: マークアップ
- **CSS3**: スタイリング
- **Vanilla JavaScript**: インタラクション

### 開発ツール

- **nodemon**: 開発時の自動再起動
- **dotenv**: 環境変数管理

## 🔍 API エンドポイント

### データベース関連

- `GET /api/database/status` - データベース状態確認
- `POST /api/database/reload` - データベース再読み込み

### チャット関連

- `GET /api/chat/summary` - 統計情報取得
- `GET /api/chat/messages` - メッセージ一覧取得

### AI 関連

- `POST /api/ai/ask` - AI 質問

## 🛡️ セキュリティ

- 環境変数による機密情報管理
- ファイルアップロード機能なし（環境変数で指定）
- エラーハンドリングによる情報漏洩防止

## 🐛 トラブルシューティング

### よくある問題

#### 1. Gemini API エラー

```
Gemini API エラー: [429 Too Many Requests]
```

**解決方法**:

- API 利用制限に達した場合、統計分析が自動的に使用されます
- しばらく待ってから再試行してください

#### 2. データベースファイルが見つからない

```
データベースファイルが見つかりません
```

**解決方法**:

- `./data/line_chat.db` にファイルが配置されているか確認
- ファイル名が正確に `line_chat.db` になっているか確認
- ファイルの権限が適切か確認

```bash
# ファイルの存在確認
ls -la ./data/line_chat.db

# ファイルの権限確認
chmod 644 ./data/line_chat.db
```

#### 3. メッセージが取得できない

```
メッセージが取得できませんでした
```

**解決方法**:

- LINE データベースファイルの形式を確認
- `chat` テーブルが存在するか確認
- サーバーログでデバッグ情報を確認

```sql
-- データベース構造の確認
SELECT name FROM sqlite_master WHERE type='table';
PRAGMA table_info(chat);
```

## 📝 開発

### Docker での開発

#### 開発サーバーの起動

```bash
# 開発用のDocker Compose設定で起動
docker-compose -f docker-compose.dev.yml up --build

# または、開発用のDockerfileを使用
docker build -f Dockerfile.dev -t chat-ai-analyzer:dev .
docker run -p 3000:3000 -v $(pwd):/app chat-ai-analyzer:dev
```

#### ログの確認

```bash
# リアルタイムでログを確認
docker-compose logs -f chat-ai-analyzer
```

### 従来の方法（Node.js 直接実行）

#### 開発サーバーの起動

```bash
npm run dev
```

#### ログの確認

サーバー起動時に詳細なデバッグ情報が表示されます：

```
getRecentMessages クエリ実行: 50件取得
getRecentMessages 解析済みメッセージ数: 49
分析対象メッセージ数: 49
```

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🤝 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📞 サポート

問題や質問がある場合は、GitHub の Issues ページで報告してください。

---

**注意**: このツールは個人の学習・研究目的で使用してください。LINE の利用規約に従って適切に使用してください。
