// ====== 실시간 채팅 모듈 ======
import { db, auth, log, formatDate } from "./app.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ====== 전역 변수 ======
let chatBox, chatMessages, chatInput, chatSendBtn;
let isDragging = false, dragOffset = {x:0, y:0};

// ====== 초기화 ======
document.addEventListener("DOMContentLoaded", () => {
  createChatUI();
  initChatRealtime();
});

// ====== UI 생성 ======
function createChatUI() {
  chatBox = document.createElement("div");
  chatBox.id = "chatBox";
  chatBox.innerHTML = `
    <div id="chatHeader">
      💬 작두 채팅
      <div style="display:flex;gap:6px;">
        <button id="chatMinimize" title="최소화">－</button>
        <button id="chatClose" title="닫기">✕</button>
      </div>
    </div>
    <div id="chatMessages"></div>
    <div id="chatInputWrap">
      <input id="chatInput" type="text" placeholder="메시지 입력..." maxlength="100">
      <button id="chatSendBtn">보내기</button>
    </div>
    <div id="chatResizer"></div>
  `;
  document.body.appendChild(chatBox);

  chatMessages = document.getElementById("chatMessages");
  chatInput = document.getElementById("chatInput");
  chatSendBtn = document.getElementById("chatSendBtn");

  // 이벤트 연결
  chatSendBtn.addEventListener("click", sendChat);
  chatInput.addEventListener("keypress", e => { if (e.key === "Enter") sendChat(); });
  document.getElementById("chatClose").addEventListener("click", () => chatBox.style.display = "none");
  document.getElementById("chatMinimize").addEventListener("click", toggleMinimize);

  // 드래그 기능
  const header = document.getElementById("chatHeader");
  header.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", stopDrag);
}

// ====== 최소화 기능 ======
function toggleMinimize() {
  const msgs = document.getElementById("chatMessages");
  const inputWrap = document.getElementById("chatInputWrap");
  const resize = document.getElementById("chatResizer");
  const minimized = msgs.style.display === "none";
  msgs.style.display = minimized ? "block" : "none";
  inputWrap.style.display = minimized ? "flex" : "none";
  resize.style.display = minimized ? "block" : "none";
}

// ====== 드래그 기능 ======
function startDrag(e) {
  if (e.target.id !== "chatHeader") return;
  isDragging = true;
  dragOffset.x = e.clientX - chatBox.offsetLeft;
  dragOffset.y = e.clientY - chatBox.offsetTop;
  chatBox.style.transition = "none";
}
function drag(e) {
  if (!isDragging) return;
  chatBox.style.left = `${e.clientX - dragOffset.x}px`;
  chatBox.style.top = `${e.clientY - dragOffset.y}px`;
}
function stopDrag() {
  isDragging = false;
  chatBox.style.transition = "";
}

// ====== 메시지 전송 ======
async function sendChat() {
  const user = auth.currentUser;
  if (!user) return alert("로그인 후 이용 가능합니다.");
  const text = chatInput.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "chat"), {
      uid: user.uid,
      text,
      time: serverTimestamp()
    });
    chatInput.value = "";
  } catch (e) {
    console.error(e);
    alert("메시지 전송 실패");
  }
}

// ====== 실시간 수신 ======
function initChatRealtime() {
  const q = query(collection(db, "chat"), orderBy("time", "asc"));
  onSnapshot(q, snap => {
    chatMessages.innerHTML = "";
    snap.forEach(docu => {
      const msg = docu.data();
      renderMessage(msg);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// ====== 메시지 렌더링 ======
function renderMessage(msg) {
  const div = document.createElement("div");
  div.style.margin = "4px 0";
  div.style.wordBreak = "break-word";
  const time = msg.time?.toDate ? formatDate(msg.time.toDate()) : "";
  div.innerHTML = `
    <span style="color:#60a5fa;">${msg.uid.slice(0,6)}</span>
    <span style="opacity:.7;"> [${time}]</span><br>
    ${escapeHtml(msg.text)}
  `;
  chatMessages.appendChild(div);
}

// ====== HTML escape ======
function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
