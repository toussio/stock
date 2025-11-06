/* ============================================================
   📰 작두 투자 센터 | 뉴스 시스템 (news.js)
   기준: 시뚜님 최신 통합본 (파트2)
   ============================================================ */

// ======= 실시간 뉴스 구독 =======
function subscribeNews() {
  const qy = query(collection(db, "news"), orderBy("createdAt", "desc"));
  onSnapshot(qy, (snap) => {
    const wrap = document.getElementById("newsList");
    if (!wrap) return;
    let html = "";
    snap.forEach(docu => {
      const d = docu.data();
      if (!d.visible) return;
      const date = new Date(d.createdAt || Date.now()).toLocaleString();
      html += `
        <div class="req-card">
          <div><strong>${d.title}</strong></div>
          <div style="color:var(--ink2); font-size:14px;">${d.content}</div>
          <div style="font-size:12px; color:#94a3b8;">${date} (${d.type === "real" ? "🟢진짜" : "🟣가짜"})</div>
        </div>`;
    });
    wrap.innerHTML = html || "<div style='opacity:0.6;'>표시할 뉴스가 없습니다.</div>";
  });
}

// ======= 관리자 전용 뉴스 목록 =======
async function renderNewsAdminList() {
  const host = document.getElementById('adminNewsList');
  if (!host) return;
  host.innerHTML = '불러오는 중...';

  try {
    const snap = await getDocs(query(collection(db, "news"), orderBy("createdAt", "desc")));
    let html = "";
    snap.forEach(docu => {
      const d = docu.data();
      const id = docu.id;
      const date = new Date(d.createdAt || Date.now()).toLocaleString();
      html += `
        <div class="req-card">
          <div><strong>${d.title}</strong> <span style="font-size:12px;color:#94a3b8;">${date}</span></div>
          <div style="font-size:14px;color:var(--ink2);margin-top:4px;">${d.content}</div>
          <div style="margin-top:6px;display:flex;gap:6px;">
            <button onclick="toggleNewsVisibility('${id}', ${d.visible ? 'false' : 'true'})">
              ${d.visible ? '숨기기' : '표시하기'}
            </button>
            <button onclick="deleteNews('${id}')">삭제</button>
          </div>
        </div>`;
    });
    host.innerHTML = html || '뉴스 없음';
  } catch (e) {
    console.error('뉴스 목록 불러오기 오류:', e);
    host.innerHTML = '오류 발생';
  }
}

// ======= 뉴스 표시/숨김 =======
async function toggleNewsVisibility(id, visible) {
  try {
    await updateDoc(doc(db, "news", id), { visible });
    renderNewsAdminList();
  } catch (e) {
    console.error(e);
    alert('표시 상태 변경 실패: ' + (e.message || e));
  }
}

// ======= 뉴스 삭제 =======
async function deleteNews(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    await deleteDoc(doc(db, "news", id));
    alert('삭제 완료');
    renderNewsAdminList();
  } catch (e) {
    console.error(e);
    alert('삭제 실패: ' + (e.message || e));
  }
}

// ======= 뉴스 생성 (자동/수동) =======
const fakeNewsPool = {
  "사쿠라": [
    "사쿠라 조직원 A씨의 발언 “꽃길이 아닌 불꽃길이었다”",
    "사쿠라의 신상품 '벚꽃 주가 예측기' 출시!"
  ],
  "리얼월드 관리자": [
    "금일 리얼월드 리붓 예정, 호황인가 불황인가?",
    "긴급 리붓, 디도스의 소행인가?"
  ],
  "칠성파": [
    "칠성파 본거지 앞에서 대규모 주가 조작 의혹?",
    "칠성파, 투자 신사업 진출 선언!"
  ]
};

// ======= 진짜 뉴스 생성 =======
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

  await addDoc(collection(db, "news"), {
    title, content, type: "real", createdAt: Date.now(), visible: true
  });
}

// ======= 가짜 뉴스 생성 =======
async function generateFakeNews() {
  const keys = Object.keys(fakeNewsPool);
  const topic = keys[Math.floor(Math.random() * keys.length)];
  const newsList = fakeNewsPool[topic];
  const text = newsList[Math.floor(Math.random() * newsList.length)];
  const title = `[속보] ${topic}`;

  await addDoc(collection(db, "news"), {
    title, content: text, type: "fake", createdAt: Date.now(), visible: true
  });
}

// ======= 자동 뉴스 생성 타이머 =======
let newsTimer = null;

function startAutoNews() {
  if (newsTimer) clearInterval(newsTimer);
  newsTimer = setInterval(() => {
    const isReal = Math.random() < 0.5;
    if (isReal) generateRealNews();
    else generateFakeNews();
  }, 5 * 60 * 1000); // 5분 간격
  console.log("📰 자동 뉴스 생성 시작됨");
}

function stopAutoNews() {
  if (newsTimer) { clearInterval(newsTimer); newsTimer = null; }
  console.log("🛑 자동 뉴스 생성 중지됨");
}

// ======= 전역 바인딩 =======
window.subscribeNews = subscribeNews;
window.renderNewsAdminList = renderNewsAdminList;
window.toggleNewsVisibility = toggleNewsVisibility;
window.deleteNews = deleteNews;
window.generateRealNews = generateRealNews;
window.generateFakeNews = generateFakeNews;
window.startAutoNews = startAutoNews;
window.stopAutoNews = stopAutoNews;
