// グローバル変数
let questionHistory = [];

// DOM要素の取得
const questionInput = document.getElementById("questionInput");
const contextSelect = document.getElementById("contextSelect");
const askButton = document.getElementById("askButton");
const answerLoading = document.getElementById("answerLoading");
const answerText = document.getElementById("answerText");

// セクション要素
const questionSection = document.getElementById("questionSection");
const answerSection = document.getElementById("answerSection");
const historySection = document.getElementById("historySection");

// モーダル要素
const errorModal = document.getElementById("errorModal");
const errorMessage = document.getElementById("errorMessage");

// 初期化
document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
});

// イベントリスナーの設定
function setupEventListeners() {
  // 質問送信
  askButton.addEventListener("click", askQuestion);

  // Enterキーで質問送信
  questionInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  });
}

// 質問送信
async function askQuestion() {
  const question = questionInput.value.trim();
  const context = contextSelect.value;

  if (!question) {
    showError("質問を入力してください");
    return;
  }

  // ボタンを無効化
  askButton.disabled = true;
  askButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 分析中...';

  // 回答セクションを表示
  answerSection.style.display = "block";
  historySection.style.display = "block";

  // ローディング表示
  answerLoading.style.display = "block";
  answerText.style.display = "none";

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

    if (result.success) {
      // 回答を表示
      answerText.textContent = result.answer;
      answerText.style.display = "block";
      answerLoading.style.display = "none";

      // 履歴に追加
      addToHistory(question, result.answer, result.timestamp);

      // 質問をクリア
      questionInput.value = "";
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showError("AI回答の生成に失敗しました: " + error.message);
    answerLoading.style.display = "none";
  } finally {
    // ボタンを有効化
    askButton.disabled = false;
    askButton.innerHTML = '<i class="fas fa-paper-plane"></i> 質問を送信';
  }
}

// 履歴に追加
function addToHistory(question, answer, timestamp) {
  const historyItem = {
    question: question,
    answer: answer,
    timestamp: timestamp,
  };

  questionHistory.unshift(historyItem);

  // 履歴を10件まで保持
  if (questionHistory.length > 10) {
    questionHistory = questionHistory.slice(0, 10);
  }

  updateHistoryDisplay();
}

// 履歴表示の更新
function updateHistoryDisplay() {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";

  questionHistory.forEach((item, index) => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    historyItem.onclick = () => showHistoryAnswer(item);

    const date = new Date(item.timestamp).toLocaleString("ja-JP");

    historyItem.innerHTML = `
            <div class="history-question">${item.question}</div>
            <div class="history-timestamp">${date}</div>
        `;

    historyList.appendChild(historyItem);
  });
}

// 履歴の回答を表示
function showHistoryAnswer(item) {
  answerText.textContent = item.answer;
  answerText.style.display = "block";
  answerLoading.style.display = "none";
}

// エラー表示
function showError(message) {
  errorMessage.textContent = message;
  errorModal.style.display = "block";
}

// 成功メッセージ表示
function showSuccess(message) {
  // 簡単な成功メッセージ（後でトースト通知に変更可能）
  console.log("成功:", message);
}

// モーダルを閉じる
function closeModal() {
  errorModal.style.display = "none";
}

// モーダル外クリックで閉じる
window.onclick = function (event) {
  if (event.target === errorModal) {
    closeModal();
  }
};

// キーボードショートカット
document.addEventListener("keydown", function (e) {
  // Ctrl+Enter で質問送信
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    askQuestion();
  }

  // Escape でモーダルを閉じる
  if (e.key === "Escape") {
    closeModal();
  }
});
