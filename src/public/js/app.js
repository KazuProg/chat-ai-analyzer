// グローバル変数
let questionHistory = [];

// DOM要素の取得
const questionInput = document.getElementById("questionInput");
const contextSelect = document.getElementById("contextSelect");
const askButton = document.getElementById("askButton");
const chatHistory = document.getElementById("chatHistory");

// Markdownパーサーの設定
marked.setOptions({
  breaks: true, // 改行を<br>に変換
  gfm: true, // GitHub Flavored Markdown
  sanitize: false, // HTMLタグを許可
  highlight: function (code, lang) {
    if (lang && Prism.languages[lang]) {
      try {
        return Prism.highlight(code, Prism.languages[lang], lang);
      } catch (err) {
        console.warn("Prism highlight error:", err);
      }
    }
    return code;
  },
});

// 質問送信
async function askQuestion() {
  const question = questionInput.value.trim();
  const context = contextSelect.value;

  if (!question) {
    showError("質問を入力してください");
    return;
  }

  // ユーザーメッセージを追加
  addUserMessage(question);

  // ボタンを無効化
  askButton.disabled = true;
  askButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  // ローディングメッセージを追加
  const loadingMessageId = addLoadingMessage();

  try {
    const response = await fetch("/api/ai/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: question,
        context: context,
      }),
    });

    const result = await response.json();

    // ローディングメッセージを削除
    removeLoadingMessage(loadingMessageId);

    if (result.success) {
      // AI回答を追加
      addAIMessage(result.answer, result.useGemini);
    } else {
      throw new Error(result.error);
    }

    // 質問をクリア
    questionInput.value = "";

    // 入力フィールドをリセット
    resetInputField();
  } catch (error) {
    // ローディングメッセージを削除
    removeLoadingMessage(loadingMessageId);

    // エラーメッセージを追加
    addErrorMessage("AI回答の生成に失敗しました: " + error.message);
  } finally {
    // ボタンを有効化
    askButton.disabled = false;
    askButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
  }
}

// ユーザーメッセージを追加
function addUserMessage(text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message user-message";

  const timestamp = new Date().toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(text)}</div>
            <div class="message-time">${timestamp}</div>
        </div>
    `;

  chatHistory.appendChild(messageDiv);
  scrollToBottom();
}

// AIメッセージを追加
function addAIMessage(text, useGemini = true) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message ai-message";

  const timestamp = new Date().toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const icon = useGemini ? "fas fa-robot" : "fas fa-chart-bar";
  const source = useGemini ? "AI分析" : "統計分析";

  // MarkdownをHTMLに変換
  const markdownHtml = marked.parse(text);

  messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="${icon}"></i>
        </div>
        <div class="message-content">
            <div class="message-text markdown-content">
                ${markdownHtml}
                <div style="margin-top: 8px; font-size: 0.8rem; opacity: 0.7;">
                    <i class="fas fa-info-circle"></i> ${source}
                </div>
            </div>
            <div class="message-time">${timestamp}</div>
        </div>
    `;

  chatHistory.appendChild(messageDiv);

  // シンタックスハイライトを適用
  applySyntaxHighlighting(messageDiv);

  scrollToBottom();
}

// シンタックスハイライトを適用
function applySyntaxHighlighting(messageDiv) {
  const codeBlocks = messageDiv.querySelectorAll("pre code");
  codeBlocks.forEach((block) => {
    if (block.className) {
      // 既にハイライトが適用されている場合はスキップ
      return;
    }

    const language = block.className.replace("language-", "");
    if (language && Prism.languages[language]) {
      try {
        block.innerHTML = Prism.highlight(
          block.textContent,
          Prism.languages[language],
          language
        );
      } catch (err) {
        console.warn("Prism highlight error:", err);
      }
    }
  });
}

// ローディングメッセージを追加
function addLoadingMessage() {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message ai-message";
  messageDiv.id = "loading-message-" + Date.now();

  messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-text">
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    AIが分析中
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </div>
    `;

  chatHistory.appendChild(messageDiv);
  scrollToBottom();

  return messageDiv.id;
}

// ローディングメッセージを削除
function removeLoadingMessage(messageId) {
  const loadingMessage = document.getElementById(messageId);
  if (loadingMessage) {
    loadingMessage.remove();
  }
}

// エラーメッセージを追加
function addErrorMessage(text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message ai-message";

  const timestamp = new Date().toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="message-content">
            <div class="message-text error-message">
                <i class="fas fa-exclamation-circle"></i>
                ${escapeHtml(text)}
            </div>
            <div class="message-time">${timestamp}</div>
        </div>
    `;

  chatHistory.appendChild(messageDiv);
  scrollToBottom();
}

// HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// チャット履歴を最下部にスクロール
function scrollToBottom() {
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// 入力フィールドをリセット
function resetInputField() {
  questionInput.style.height = "auto";
}

// エラー表示
function showError(message) {
  addErrorMessage(message);
}

// イベントリスナーの設定
document.addEventListener("DOMContentLoaded", function () {
  // Enterキーで送信
  questionInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  });

  // テキストエリアの自動リサイズ
  questionInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });

  // 初期フォーカス
  questionInput.focus();
});

// エラーハンドリング
window.addEventListener("error", function (e) {
  console.error("JavaScript error:", e.error);
  addErrorMessage(
    "予期しないエラーが発生しました。ページを再読み込みしてください。"
  );
});

// ネットワークエラーハンドリング
window.addEventListener("unhandledrejection", function (e) {
  console.error("Unhandled promise rejection:", e.reason);
  addErrorMessage(
    "ネットワークエラーが発生しました。インターネット接続を確認してください。"
  );
});
