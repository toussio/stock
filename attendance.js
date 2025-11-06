/* ============================================================
   🗓️ 작두 투자 센터 | 출석체크 시스템 (attendance.js)
   기준: 시뚜님 최신 통합본 (파트2)
   ============================================================ */

// ======= 출석 모달 열기/닫기 =======
function openAttendanceModal() {
  if (!currentUser) return alert('로그인 후 이용해주세요.');
  renderAttendanceGrid();
  document.getElementById('attendanceModal').style.display = 'flex';
}

function closeAttendanceModal() {
  document.getElementById('attendanceModal').style.display = 'none';
}

// ======= 출석 현황 렌더링 =======
async function renderAttendanceGrid() {
  const host = document.getElementById('attendanceGrid');
  if (!host) return;

  let daysMap = {};
  try {
    const ref = doc(db, "attendance", currentUser.id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      daysMap = snap.data().days || {};
    }
  } catch (e) {
    console.error("출석 데이터 불러오기 실패:", e);
  }

  let html = "";
  for (let d = 1; d <= 30; d++) {
    const checked = !!daysMap[d];
    html += `<div class="attendance-day ${checked ? 'checked' : ''}" onclick="checkAttendance(${d})">${d}일</div>`;
  }
  host.innerHTML = html;
}

// ======= 출석체크 처리 =======
async function checkAttendance(day) {
  if (!currentUser) return alert('로그인 후 이용해주세요.');
  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const ref = doc(db, "attendance", currentUser.id);
  let data = { days: {}, lastCheckDate: "" };

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) data = snap.data();
  } catch (e) {
    console.error("출석 데이터 조회 오류:", e);
  }

  // 이미 오늘 체크했는지 확인
  if (data.lastCheckDate === todayKey) {
    alert('오늘은 이미 출석체크를 했습니다.');
    return;
  }

  // 출석 데이터 업데이트
  if (!data.days) data.days = {};
  data.days[day] = true;
  data.lastCheckDate = todayKey;

  try {
    await setDoc(ref, data, { merge: true });
    await updateDoc(doc(db, "users", currentUser.id), {
      cash: increment(10000000), // 보상: +10,000,000 RWW
      updatedAt: Date.now()
    });
    alert('✅ 출석체크 완료! +10,000,000 RWW');
    renderAttendanceGrid();
  } catch (e) {
    console.error("출석 저장 오류:", e);
    alert('출석체크 오류: ' + (e.message || e));
  }
}

// ======= 전역 바인딩 =======
window.openAttendanceModal = openAttendanceModal;
window.closeAttendanceModal = closeAttendanceModal;
window.checkAttendance = checkAttendance;
