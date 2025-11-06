/* ============================================================
   ⚙️ 작두 투자 센터 | 메인 애플리케이션 스크립트 (app.js)
   기준: 시뚜님 최신 통합본 (파트1 + 파트2)
   ============================================================ */

// ======= Firebase 초기화 =======
const firebaseConfig = {
 apiKey: "AIzaSyAVCFjQ0ton4HPtkcYAHMeuMubH1gD1KWg",
 authDomain: "cotyledons-of-stock-a1241.firebaseapp.com",
 projectId: "cotyledons-of-stock-a1241",
 storageBucket: "cotyledons-of-stock-a1241.appspot.com",
 messagingSenderId: "962984742513",
 appId: "1:962984742513:web:25082eed6cdcc9c37b95d0",
 measurementId: "G-NRPT075Q3X"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ======= 전역 변수 =======
let currentUser = null;
let player = { cash: 0, coin: 0, holdings: {} };
let ADMIN_MODE = false;
let currentMode = 'stock';
let companies = [];
let companiesStock = [];
let companiesCoin = [];
let unsubUsers = null, unsubscribeUser = null;
let unsubDeposits = null, unsubWithdraws = null;
let newsTimer = null;
let marketOpenFlag = false;

// ======= 로그인 / 세션 =======
async function ensureAuth() {
  return new Promise(resolve => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user);
      else signInAnonymously(auth)
        .then(res => resolve(res.user))
        .catch(e => { console.error('익명 로그인 실패:', e); resolve(null); });
    });
  });
}

loginBtn.onclick = async () => {
  const cid   = document.getElementById("customId").value.trim();
  const cname = document.getElementById("customName").value.trim();
  if (!cid || !cname) { alert("고유번호와 이름을 입력하세요."); return; }

  try {
    await ensureAuth();
    const userRef = doc(db, "users", cid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const d = snap.data();
      const isAdminFlag = d.isAdmin === true;
      if (!isAdminFlag && d.active === true) {
        alert("⚠️ 이미 다른 기기에서 로그인 중입니다.");
        return;
      }

      currentUser = { id: cid, name: cname, isAdmin: isAdminFlag, active: true };
      player.cash = Number(d.cash || 0);
      player.coin = Number(d.coin || 0);
      player.holdings = d.holdings || {};

      await setDoc(userRef, {
        ...currentUser, holdings: player.holdings,
        lastLoginAt: Date.now(), active: true
      }, { merge: true });

    } else {
      currentUser = { id: cid, name: cname, cash: 0, coin: 0, holdings: {}, active: true, isAdmin: false };
      await setDoc(userRef, currentUser);
    }

    localStorage.setItem("stockUser", JSON.stringify({ id: cid, name: cname }));
    loginModal.style.display = "none";
    renderUserInfo(); initCompaniesUI(); subscribeCurrentUser(cid); renderMarketStatus();

  } catch (e) {
    console.error("⚠️ 로그인 오류:", e);
    alert("로그인 중 오류 발생: " + (e.message || e));
  }
};

function subscribeCurrentUser(uid) {
  if (unsubscribeUser) { try { unsubscribeUser(); } catch (e) {} unsubscribeUser = null; }
  const uref = doc(db, "users", uid);
  unsubscribeUser = onSnapshot(uref, (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    if (typeof d.cash === 'number') player.cash = d.cash;
    if (typeof d.coin === 'number') player.coin = d.coin;
    if (d.holdings) player.holdings = d.holdings;
    currentUser.isAdmin = d.isAdmin === true;
    renderUserInfo(); updateHoldingsUI();
  });
}

async function logout() {
  try {
    if (currentUser)
      await updateDoc(doc(db, "users", currentUser.id), { active: false, lastLogoutAt: Date.now() });
  } catch (e) {}
  if (unsubscribeUser) { try { unsubscribeUser(); } catch (e) {} unsubscribeUser = null; }
  localStorage.removeItem('stockUser');
  location.reload();
}

window.addEventListener("beforeunload", async () => {
  try { if (currentUser) await updateDoc(doc(db, "users", currentUser.id), { active: false, lastLogoutAt: Date.now() }); }
  catch (e) {}
});

// ======= 초기화 =======
window.onload = async () => {
  await ensureAuth();
  const saved = localStorage.getItem('stockUser');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.id && parsed.name) {
        currentUser = { id: parsed.id, name: parsed.name };
        loginModal.style.display = 'none';
        try { await updateDoc(doc(db, "users", parsed.id), { active: true, lastLoginAt: Date.now() }); } catch (e) {}
        renderUserInfo(); initCompaniesUI(); subscribeCurrentUser(parsed.id);
      } else loginModal.style.display = 'flex';
    } catch (e) {
      localStorage.removeItem('stockUser');
      loginModal.style.display = 'flex';
    }
  } else loginModal.style.display = 'flex';

  initChart();
  subscribeCompanyPrices();
  subscribeCompanySettings();
  subscribeDelistTimers();
  subscribeCompanyChances();
  subscribeGlobals();
  subscribeNews();
  subscribeNotices();
  subscribeChat();
  initChatUI();
  renderMarketStatus();
  initCompaniesUI();
  enableDrag('adminPanelAll', 'adminPanelHeaderSticky');
};

// ======= 모드 전환 (주식/코인) =======
function toggleMode() {
  currentMode = (currentMode === 'stock') ? 'coin' : 'stock';
  companies = (currentMode === 'stock') ? companiesStock : companiesCoin;
  initCompaniesUI();
  renderGraphAdjustPanel();
  renderChangePanel();
  renderDelistPanel();
  renderMarketStatus();
  renderUserInfo();
  const btn = document.getElementById('modeToggleBtn');
  if (btn) btn.textContent = '🔁 주식 ⇄ 코인';
  lastChartTick = 0;
}

// ======= 채팅 =======
async function sendChat() {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg) return;
  const uname = currentUser?.name || "익명";
  const uid = currentUser?.id || "guest";
  try {
    await addDoc(collection(db, "chat"), {
      userId: uid, userName: uname, message: msg, createdAt: Date.now()
    });
  } catch (e) { console.error("채팅 저장 오류:", e); }
  input.value = "";
}

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
      const uid = d.userId || "guest";
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
        </div>`;
    });
    chatDiv.scrollTop = chatDiv.scrollHeight;
  });
}

// ======= 뉴스 자동 생성 =======
const fakeNewsPool = {
  "사쿠라": ["사쿠라 조직원 A씨의 발언 “꽃길이 아닌 불꽃길이었다”"],
  "리얼월드 관리자": [
    "금일 리얼월드 리붓 예정, 호황인가 불황인가?",
    "긴급 리붓, 디도스의 소행인가?"
  ]
};

async function generateRealNews() {
  const rising = companiesStock.filter(c => c.livePrice > c.basePrice * 1.05);
  const falling = companiesStock.filter(c => c.livePrice < c.basePrice * 0.95);
  let title = "", content = "";
  if (rising.length) {
    const c = rising[Math.floor(Math.random() * rising.length)];
    title = `${c.name} 주가 상승세 지속`;
    content = `${c.name}의 주가가 ${Math.round((c.livePrice / c.basePrice - 1) * 100)}% 상승했습니다.`;
  } else if (falling.length) {
    const c = falling[Math.floor(Math.random() * falling.length)];
    title = `${c.name} 주가 급락 소식`;
    content = `${c.name}의 주가가 ${Math.round((1 - c.livePrice / c.basePrice) * 100)}% 하락했습니다.`;
  } else {
    const c = companiesStock[Math.floor(Math.random() * companiesStock.length)];
    title = `${c.name} 보합세 유지`;
    content = `${c.name}의 주가가 안정적인 흐름을 보이고 있습니다.`;
  }
  await addDoc(collection(db, "news"), { title, content, type: "real", createdAt: Date.now(), visible: true });
}

async function generateFakeNews() {
  const keys = Object.keys(fakeNewsPool);
  const topic = keys[Math.floor(Math.random() * keys.length)];
  const newsList = fakeNewsPool[topic];
  const text = newsList[Math.floor(Math.random() * newsList.length)];
  const title = `[속보] ${topic}`;
  await addDoc(collection(db, "news"), { title, content: text, type: "fake", createdAt: Date.now(), visible: true });
}

function startAutoNews() {
  if (newsTimer) clearInterval(newsTimer);
  newsTimer = setInterval(() => {
    const isReal = Math.random() < 0.5;
    if (isReal) generateRealNews(); else generateFakeNews();
  }, 5 * 60 * 1000);
}

function stopAutoNews() {
  if (newsTimer) { clearInterval(newsTimer); newsTimer = null; }
}

// ======= 출석체크 =======
async function renderAttendanceGrid() {
  const host = document.getElementById('attendanceGrid');
  if (!host) return;
  let daysMap = {};
  try {
    const ref = doc(db, "attendance", currentUser.id);
    const snap = await getDoc(ref);
    if (snap.exists()) daysMap = snap.data().days || {};
  } catch (e) { console.error(e); }

  let html = "";
  for (let d = 1; d <= 30; d++) {
    const checked = !!daysMap[d];
    html += `<div class="attendance-day ${checked ? 'checked' : ''}" onclick="checkAttendance(${d})">${d}일</div>`;
  }
  host.innerHTML = html;
}

async function checkAttendance(day) {
  if (!currentUser) return alert('로그인 후 이용해주세요.');
  const todayKey = new Date().toISOString().slice(0, 10);
  const ref = doc(db, "attendance", currentUser.id);
  let data = { days: {}, lastCheckDate: "" };
  try { const snap = await getDoc(ref); if (snap.exists()) data = snap.data(); } catch (e) {}

  if (data.lastCheckDate === todayKey) return alert('오늘은 이미 출석체크 완료.');

  data.days[day] = true;
  data.lastCheckDate = todayKey;
  try {
    await setDoc(ref, data, { merge: true });
    await updateDoc(doc(db, "users", currentUser.id), { cash: increment(10000000), updatedAt: Date.now() });
    alert('✅ 출석체크 완료! +10,000,000 RWW');
    renderAttendanceGrid();
  } catch (e) { console.error(e); alert('출석체크 오류: ' + (e.message || e)); }
}
