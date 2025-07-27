# Gemini API セットアップガイド

## 1. Google AI Studio での API キー取得

### 1.1 Google AI Studio にアクセス

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. Google アカウントでログイン

### 1.2 API キーの作成

1. 左側のメニューから「Get API key」をクリック
2. 「Create API key」をクリック
3. API キーが生成されます（例: `AIzaSyC...`）

### 1.3 API キーの保存

生成された API キーを安全に保存してください。このキーは後で `.env` ファイルで使用します。

## 2. プロジェクトでの設定

### 2.1 環境変数ファイルの作成

プロジェクトルートに `.env` ファイルを作成し、以下の内容を追加：

```env
GEMINI_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=development
```

### 2.2 必要なパッケージのインストール

```bash
npm install @google/generative-ai dotenv
```

## 3. Gemini API の使用制限

### 3.1 無料枠

- **1 分あたり**: 60 リクエスト
- **1 日あたり**: 1,500 リクエスト
- **コンテキスト長**: 最大 32,000 トークン

### 3.2 有料枠

- **1 分あたり**: 1,000 リクエスト
- **1 日あたり**: 50,000 リクエスト
- **コンテキスト長**: 最大 1,000,000 トークン

## 4. セキュリティ注意事項

### 4.1 API キーの保護

- `.env` ファイルを `.gitignore` に追加
- API キーを公開リポジトリにコミットしない
- 本番環境では環境変数として設定

### 4.2 レート制限の対応

- リクエスト間隔の調整
- エラーハンドリングの実装
- ユーザーへの適切なフィードバック

## 5. トラブルシューティング

### 5.1 よくあるエラー

- **403 Forbidden**: API キーが無効または権限不足
- **429 Too Many Requests**: レート制限に達した
- **400 Bad Request**: リクエスト形式が不正

### 5.2 解決方法

1. API キーが正しく設定されているか確認
2. レート制限に達していないか確認
3. リクエスト形式が正しいか確認

## 6. テスト用コード

### 6.1 基本的な接続テスト

```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testConnection() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("こんにちは");
    const response = await result.response;
    console.log("接続成功:", response.text());
  } catch (error) {
    console.error("接続エラー:", error);
  }
}

testConnection();
```

## 7. 次のステップ

1. API キーを取得
2. `.env` ファイルを作成
3. 必要なパッケージをインストール
4. 接続テストを実行
5. アプリケーションの実装を開始
