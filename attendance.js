// ======= 출석체크 모듈 =======
import { db, auth, log, formatDate } from "./app.js";
import { collection, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const btn = document.getElementById("attendanceBtn");
if (btn) btn.addEventListener("click", openAttendanceModal);

// ===== 모달 생성 =====
function openAttendanceModal() {
  let modal = document.getElementById("attendanceModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "attendanceModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <button class="xbtn" onclick="closeAttendance()">✕</button>
        <h2>📅 출석체크</h2>
        <div id="attendanceStatus" style="margin-bottom:12px;color:#cbd5e1;">확인 중...</div>
        <button id="checkAttendanceBtn">출석하기</button>
        <hr style="margin:16px 0;opacity:.3;">
        <h3>내 출석 기록</h3>
        <div id="attendanceList" style="max-height:200px;overflow-y:auto;"></div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.style.display = "flex";
  renderAttendanceStatus();
}

// ===== 모달 닫기 =====
window.closeAttendance = function() {
  const modal = document.getElementById("attendanceModal");
  if (modal) modal.style.display = "none";
};

// ===== 출석 상태 확인 =====
async function renderAttendanceStatus() {
  const user = auth.currentUser;
  if (!user) return alert("로그인이 필요합니다.");

  const uid = user.uid;
  const todayKey = getTodayKey();
  const ref = doc(db, "attendance", uid);
  const snap = await getDoc(ref);

  let data = snap.exists() ? snap.data() : {};
  const attendedToday = data.records?.[todayKey];

  const status = document.getElementById("attendanceStatus");
  if (attendedToday) {
    status.textContent = `✅ 오늘(${todayKey}) 출석 완료!`;
    disableCheckButton();
  } else {
    status.textContent = `🕒 오늘(${todayKey}) 아직 출석 전`;
    enableCheckButton(uid, data);
  }

  renderAttendanceList(data.records || {});
}

// ===== 출석 기록 렌더링 =====
function renderAttendanceList(records) {
  const wrap = document.getElementById("attendanceList");
  if (!wrap) return;
  wrap.innerHTML = "";
  const sorted = Object.entries(records).sort(([a], [b]) => b.localeCompare(a));
  sorted.forEach(([date, info]) => {
    const div = document.createElement("div");
    div.textContent = `📆 ${date} | ${info.time}`;
    wrap.appendChild(div);
  });
}

// ===== 출석하기 =====
function enableCheckButton(uid, data) {
  const btn = document.getElementById("checkAttendanceBtn");
  btn.disabled = false;
  btn.textContent = "출석하기";
  btn.onclick = async () => {
    btn.disabled = true;
    const todayKey = getTodayKey();
    const now = new Date();

    try {
      const newData = {
        ...data,
        records: {
          ...(data.records || {}),
          [todayKey]: { time: now.toLocaleTimeString("ko-KR", { hour12: false }) }
        },
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, "attendance", uid), newData);
      log(`✅ ${todayKey} 출석 완료`);
      renderAttendanceStatus();
    } catch (e) {
      console.error(e);
      alert("출석 체크 중 오류가 발생했습니다.");
    }
  };
}

// ===== 오늘 날짜 키 =====
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ===== 버튼 비활성화 =====
function disableCheckButton() {
  const btn = document.getElementById("checkAttendanceBtn");
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = "오늘은 이미 출석 완료!";
}
