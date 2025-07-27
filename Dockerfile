# Node.js 18 Alpine ベースイメージを使用
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係をインストール（package-lock.jsonがない場合はnpm installを使用）
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi

# ソースコードをコピー
COPY . .

# データディレクトリを作成
RUN mkdir -p data

# ポート3000を公開
EXPOSE 3000

# 環境変数を設定
ENV NODE_ENV=production
ENV PORT=3000

# アプリケーションを起動
CMD ["npm", "start"] 