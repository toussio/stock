// ======= 관리자 기능 모듈 =======
import { db, companiesStock, companiesCoin, getDisplayPrice, findCompanyById } from "./app.js";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, writeBatch, onSnapshot, increment, deleteDoc } 
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let ADMIN_MODE = false;

// ✅ 관리자 로그인
export function checkAdmin() {
  const code = document.getElementById('adminCode').value.trim();
  if (code !== 'ADBEN7732') {
    alert('❌ 잘못된 코드입니다.');
    document.getElementById('adminCode').value = '';
    return;
  }
  ADMIN_MODE = true;
  document.getElementById('adminCode').value = '';
  alert("✅ 관리자 패널이 열렸습니다.");
  openAdminPanel();
}

// ✅ 관리자 패널 열기
export function openAdminPanel() {
  const panel = document.getElementById('adminPanelAll');
  if (panel) panel.style.display = 'flex';
  showTab('graph');
  renderAdminSummary().catch(() => {});
}

// ✅ 관리자 패널 닫기
export function closeAdmin(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ✅ 탭 전환
export function showTab(name) {
  document.querySelectorAll('#adminPanelAll .tab-section')
    .forEach(sec => sec.style.display = 'none');
  const t = document.getElementById('tab-' + name);
  if (t) t.style.display = 'block';
}

// ======= 관리자 요약 =======
export async function renderAdminSummary() {
  try {
    const all = await getDocs(collection(db, "users"));
    const totalsStock = {}, totalsCoin = {};
    companiesStock.forEach(c => totalsStock[c.name] = 0);
    companiesCoin.forEach(c => totalsCoin[c.name] = 0);

    all.forEach(docu => {
      const u = docu.data();
      const hold = u.holdings || {};
      for (const [k, v] of Object.entries(hold)) {
        if (totalsStock.hasOwnProperty(k)) totalsStock[k] += Number(v || 0);
        else if (totalsCoin.hasOwnProperty(k)) totalsCoin[k] += Number(v || 0);
      }
    });

    const listStock = Object.entries(totalsStock)
      .filter(([k, v]) => v > 0)
      .map(([k, v]) => `${k}:${v.toLocaleString()}주`)
      .join(', ');
    const listCoin = Object.entries(totalsCoin)
      .filter(([k, v]) => v > 0)
      .map(([k, v]) => `${k}:${v.toLocaleString()}개`)
      .join(', ');

    const tgt = document.getElementById('adminSummary');
    if (tgt) {
      tgt.style.whiteSpace = 'pre-line';
      tgt.textContent =
        (listStock ? `📊 주식 통합 보유량\n${listStock}` : '📊 주식 보유 없음') +
        '\n\n' +
        (listCoin ? `🪙 코인 통합 보유량\n${listCoin}` : '🪙 코인 보유 없음');
    }
  } catch (e) {
    console.error(e);
  }
}

// ======= 입금/출금 승인 =======
export async function approveDeposit(id, amount, userId) {
  try {
    await updateDoc(doc(db, "users", userId), { cash: increment(amount), updatedAt: Date.now() });
    await updateDoc(doc(db, "depositRequests", id), { status: 'approved', updatedAt: Date.now() });
  } catch (e) {
    console.error(e);
    alert('승인 처리 실패: ' + (e.message || e));
  }
}

export async function rejectDeposit(id) {
  try {
    await updateDoc(doc(db, "depositRequests", id), { status: 'rejected', updatedAt: Date.now() });
  } catch (e) {
    console.error(e);
    alert('거절 처리 실패: ' + (e.message || e));
  }
}

export async function approveWithdraw(id, amount, userId, type) {
  try {
    const uref = doc(db, "users", userId);
    const usnap = await getDoc(uref);
    const data = usnap.data() || {};
    const cash = Number(data.cash || 0);
    const coin = Number(data.coin || 0);

    if (type === 'coin') {
      if (coin < amount) return alert('사용자 코인 부족으로 승인할 수 없습니다.');
      await updateDoc(uref, { coin: increment(-amount), updatedAt: Date.now() });
    } else {
      if (cash < amount) return alert('사용자 현금 부족으로 승인할 수 없습니다.');
      await updateDoc(uref, { cash: increment(-amount), updatedAt: Date.now() });
    }
    await updateDoc(doc(db, "withdrawRequests", id), { status: 'approved', updatedAt: Date.now() });
  } catch (e) {
    console.error(e);
    alert('승인 처리 실패: ' + (e.message || e));
  }
}

export async function rejectWithdraw(id) {
  try {
    await updateDoc(doc(db, "withdrawRequests", id), { status: 'rejected', updatedAt: Date.now() });
  } catch (e) {
    console.error(e);
    alert('거절 처리 실패: ' + (e.message || e));
  }
}

// ======= 관리자 권한 =======
export async function promoteAdmin(uid, name) {
  if (!uid || !name) return alert('고유번호와 이름을 입력하세요.');
  try {
    await setDoc(doc(db, "users", uid), { name, isAdmin: true, updatedAt: Date.now() }, { merge: true });
    alert(`✅ ${name} (${uid}) 관리자 권한 부여`);
  } catch (e) {
    console.error(e);
    alert('권한 부여 실패: ' + (e.message || e));
  }
}

export async function demoteAdmin(uid) {
  if (!uid) return alert('고유번호를 입력하세요.');
  try {
    await setDoc(doc(db, "users", uid), { isAdmin: false, updatedAt: Date.now() }, { merge: true });
    alert(`✅ (${uid}) 관리자 권한 해제`);
  } catch (e) {
    console.error(e);
    alert('권한 해제 실패: ' + (e.message || e));
  }
}

// ======= 전역 바인딩 =======
window.checkAdmin = checkAdmin;
window.openAdminPanel = openAdminPanel;
window.closeAdmin = closeAdmin;
window.showTab = showTab;
window.renderAdminSummary = renderAdminSummary;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;
window.approveWithdraw = approveWithdraw;
window.rejectWithdraw = rejectWithdraw;
window.promoteAdmin = promoteAdmin;
window.demoteAdmin = demoteAdmin;
