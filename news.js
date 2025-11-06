// ===== 뉴스 / 공지 모듈 =====
import { db, auth, log, formatDate } from "./app.js";
import {
  collection, addDoc, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ===== 전역 =====
let newsListEl;

// ===== 초기화 =====
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("newsBtn");
  if (btn) btn.addEventListener("click", openNewsModal);
});

// ===== 뉴스 모달 열기 =====
function openNewsModal() {
  let modal = document.getElementById("newsModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "newsModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <button class="xbtn" onclick="closeNews()">✕</button>
        <h2>📰 최신 뉴스</h2>
        <div id="newsList" style="max-height:300px;overflow-y:auto;margin-bottom:10px;"></div>
        <button id="autoNewsBtn">자동 뉴스 생성</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.style.display = "flex";
  newsListEl = document.getElementById("newsList");
  loadNews();
  document.getElementById("autoNewsBtn").onclick = autoGenerateNews;
}

// ===== 모달 닫기 =====
window.closeNews = function() {
  const modal = document.getElementById("newsModal");
  if (modal) modal.style.display = "none";
};

// ===== 뉴스 로드 =====
async function loadNews() {
  try {
    const q = query(collection(db, "news"), orderBy("time", "desc"), limit(20));
    const snap = await getDocs(q);
    const newsArr = snap.docs.map(d => d.data());
    renderNews(newsArr);
  } catch (e) {
    console.error(e);
    if (newsListEl) newsListEl.innerHTML = "<p>뉴스를 불러올 수 없습니다.</p>";
  }
}

// ===== 뉴스 실시간 갱신 (옵션) =====
onSnapshot(query(collection(db, "news"), orderBy("time", "desc"), limit(20)), snap => {
  const newsArr = snap.docs.map(d => d.data());
  renderNews(newsArr);
});

// ===== 뉴스 렌더링 =====
function renderNews(newsArr) {
  if (!newsListEl) return;
  if (!newsArr.length) {
    newsListEl.innerHTML = "<p>등록된 뉴스가 없습니다.</p>";
    return;
  }

  newsListEl.innerHTML = "";
  newsArr.forEach(n => {
    const div = document.createElement("div");
    div.style.borderBottom = "1px solid #374151";
    div.style.padding = "6px 0";
    const time = n.time?.toDate ? formatDate(n.time.toDate()) : "";
    div.innerHTML = `
      <strong style="color:#facc15;">${n.title || "뉴스"}</strong><br>
      <span style="color:#9ca3af;">${time}</span><br>
      ${n.text || ""}
    `;
    newsListEl.appendChild(div);
  });
}

// ===== 자동 뉴스 생성 =====
async function autoGenerateNews() {
  const user = auth.currentUser;
  if (!user) return alert("로그인 후 이용해주세요.");

  const templates = [
    "📈 ${name}의 주가가 급등했습니다! 투자자들의 관심이 집중되고 있습니다.",
    "📉 ${name}의 시세가 하락세를 보이고 있습니다. 조정 국면일까요?",
    "💥 ${name} 관련 대규모 거래가 발생했습니다!",
    "🔔 ${name} 신규 공시 발표 — 시장에 큰 영향 예상!",
    "🧩 ${name}의 기술 제휴 소식이 전해졌습니다.",
    "⚡ ${name}의 코인 거래량이 폭발적으로 증가했습니다!",
    "🏦 ${name}에서 배당금 지급을 예고했습니다."
  ];

  // 랜덤 기업명 생성 (샘플)
  const companies = ["작두", "사쿠라", "칠성파", "벌집", "느와르", "백호자동차", "중앙경찰"];
  const randomCompany = companies[Math.floor(Math.random() * companies.length)];
  const template = templates[Math.floor(Math.random() * templates.length)];
  const text = template.replace("${name}", randomCompany);

  const newsItem = {
    title: `${randomCompany} 관련 속보`,
    text,
    time: serverTimestamp(),
    author: user.uid
  };

  try {
    await addDoc(collection(db, "news"), newsItem);
    log(`📰 ${newsItem.title}`);
  } catch (e) {
    console.error(e);
    alert("자동 뉴스 생성 실패");
  }
}
