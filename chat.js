/* ============================================================
   💬 작두 투자 센터 | 실시간 채팅 시스템 (chat.js)
   기준: 시뚜님 최신 통합본 (파트2)
   ============================================================ */

// ======= 채팅 전송 =======
async function sendChat() {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg) return;

  const uname = currentUser?.name || "익명";
  const uid   = currentUser?.id || "guest";

  try {
    await addDoc(collection(db, "chat"), {
      userId: uid,
      userName: uname,
      message: msg,
      createdAt: Date.now()
    });
  } catch (e) {
    console.error("채팅 저장 오류:", e);
  }

  input.value = "";
}

// ======= 실시간 채팅 수신 =======
function subscribeChat() {
  const qy = query(collection(db, "chat"), orderBy("createdAt", "asc"));
  onSnapshot(qy, (snap) => {
    const chatDiv = document.getElementById("chatMessages");
    chatDiv.innerHTML = "";
    snap.forEach(docu => {
      const d = docu.data();
      const dt = new Date(d.createdAt || Date.now());
      const time = dt.toLocaleTimeString();
      const uname = d.userName || "익명";
      const uid   = d.userId || "guest";
      const isMine = currentUser && currentUser.id === uid;

      chatDiv.innerHTML += `
        <div class="${isMine ? 'chat-right' : 'chat-left'}">
          <div class="chat-msg">
            ${d.message}
            <div class="chat-meta">
              <span class="name">${uname}</span>
              <span class="uid">(${uid})</span>
              <span class="time">• ${time}</span>
            </div>
          </div>
        </div>
      `;
    });
    chatDiv.scrollTop = chatDiv.scrollHeight;
  });
}

// ======= 채팅창 UI 초기화 =======
function initChatUI() {
  const chatBox = document.getElementById('chatBox');
  const toggleBtn = document.getElementById('chatToggleBtn');
  const resizer = document.getElementById('chatResizer');
  const input = document.getElementById('chatInput');

  let minimized = false;

  // ✅ 최소화 / 복원 토글
  toggleBtn.addEventListener('click', () => {
    if (!minimized) {
      // ▼ 최소화: 헤더만 남기기
      chatBox.querySelectorAll('#chatMessages, #chatInputWrap, #chatResizer')
        .forEach(el => el.style.display = 'none');
      chatBox.style.height = '45px';
      chatBox.style.minHeight = '0';
      chatBox.style.paddingBottom = '0';
      chatBox.style.overflow = 'hidden';
      chatBox.style.background = '#1f2937';
      chatBox.style.border = '1px solid #334155';
      chatBox.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      toggleBtn.textContent = '＋';
      minimized = true;
    } else {
      // ▲ 복원
      chatBox.querySelectorAll('#chatMessages, #chatInputWrap, #chatResizer')
        .forEach(el => el.style.display = '');
      chatBox.style.height = '';
      chatBox.style.minHeight = '';
      chatBox.style.paddingBottom = '';
      chatBox.style.overflow = '';
      chatBox.style.background = 'var(--card)';
      chatBox.style.border = '';
      chatBox.style.boxShadow = '';
      toggleBtn.textContent = '—';
      minimized = false;
    }
  });

  // ✅ Enter 키 전송
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }

  // ✅ 채팅창 높이 조절 (드래그)
  let startY = 0, startH = 0, dragging = false;
  const onDown = (e) => {
    dragging = true;
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    startH = parseInt(window.getComputedStyle(chatBox).height, 10);
    document.body.style.userSelect = 'none';
  };
  const onMove = (e) => {
    if (!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    const delta = y - startY;
    let newH = startH + delta;
    newH = Math.max(300, Math.min(900, newH));
    chatBox.style.height = newH + 'px';
  };
  const onUp = () => {
    dragging = false;
    document.body.style.userSelect = '';
  };
  resizer.addEventListener('mousedown', onDown);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  resizer.addEventListener('touchstart', onDown, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);

  // ✅ 드래그 이동 가능 (채팅창 위치 변경)
  const chatHeader = document.getElementById('chatHeader');
  let offsetX = 0, offsetY = 0, isDragging = false;

  chatHeader.style.cursor = 'grab';
  chatHeader.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - chatBox.offsetLeft;
    offsetY = e.clientY - chatBox.offsetTop;
    chatHeader.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    chatBox.style.left = `${x}px`;
    chatBox.style.top = `${y}px`;
    chatBox.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    chatHeader.style.cursor = 'grab';
    document.body.style.userSelect = '';
  });
}

// ======= 전역 바인딩 =======
window.sendChat = sendChat;
window.subscribeChat = subscribeChat;
window.initChatUI = initChatUI;
