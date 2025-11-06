/* ============================================================
   🛡️ 작두 투자 센터 | 관리자 스크립트 (admin.js)
   기준: 시뚜님 최신 통합본 (파트1 + 파트2)
   ============================================================ */

// ======= 관리자 패널/권한 =======
function checkAdmin() {
  const code = document.getElementById('adminCode').value.trim();
  if (code !== 'ADBEN7732') {
    alert('❌ 잘못된 코드입니다.');
    document.getElementById('adminCode').value = '';
    return;
  }
  ADMIN_MODE = true;
  openAdminPanel();
  document.getElementById('adminCode').value = '';
  alert("✅ 관리자 패널이 열렸습니다. (graph703)");

  renderGraphAdjustPanel();
  renderUserList(true);
  renderFinanceQueues(true);
  renderChangePanel();
  renderNewsAdminList();
  renderNoticeAdminList();
  renderDelistPanel();
}

function openAdminPanel() {
  const panel = document.getElementById('adminPanelAll');
  if (panel) panel.style.display = 'flex';
  showTab('graph');
  updateAdminSummary().catch(() => {});
}

function closeAdmin(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ======= 유저/재무 패널 =======
async function updateAdminSummary() {
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
      .map(([k, v]) => `${k}:${v.toLocaleString()}주`).join(', ');
    const listCoin = Object.entries(totalsCoin)
      .filter(([k, v]) => v > 0)
      .map(([k, v]) => `${k}:${v.toLocaleString()}개`).join(', ');

    const tgt = document.getElementById('adminSummary');
    if (tgt) {
      tgt.style.whiteSpace = 'pre-line';
      tgt.textContent =
        (listStock ? `📊 주식 통합 보유량\n${listStock}` : '📊 주식 보유 없음') + '\n\n' +
        (listCoin ? `🪙 코인 통합 보유량\n${listCoin}` : '🪙 코인 보유 없음');
    }
  } catch (e) { console.error(e); }
}

function renderUserList(startListen = false) {
  const box = document.getElementById('userList'); if (!box) return;
  box.textContent = '불러오는 중...';
  if (startListen) {
    if (unsubUsers) { try { unsubUsers(); } catch (e) {} unsubUsers = null; }
    unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      let html = "";
      snap.forEach(docu => {
        const u = docu.data();
        const hold = u.holdings || {};
        const holdTxt = Object.entries(hold).map(([k, v]) => `${k}:${v}`).join(', ') || '보유 없음';
        html += `
          <div class="req-card">
            <div>
              <div><strong>${u.name || '-'}</strong> (${docu.id}) ${u.active ? '🟢' : '🔴'} ${u.isAdmin ? ' <span style="color:#10b981;">관리자🛡️</span>' : ''}</div>
              <div>현금: ${Number(u.cash || 0).toLocaleString()} RWW | 코인: ${Number(u.coin || 0).toLocaleString()} COIN</div>
              <div>보유: ${holdTxt}</div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <button onclick="forceLogout('${docu.id}')">강제 로그아웃</button>
              ${u.isAdmin
                ? `<button onclick="demoteAdmin('${docu.id}')">권한 해제</button>`
                : `<button onclick="promoteAdmin('${docu.id}','${(u.name || '').replace(/'/g, "\\'")}')">권한 부여</button>`}
            </div>
          </div>`;
      });
      box.innerHTML = html || "유저 없음";
      updateAdminSummary().catch(() => {});
    });
  }
}

// ======= 관리자 권한 제어 =======
window.forceLogout = async (uid) => {
  try {
    await updateDoc(doc(db, "users", uid), { active: false, lastLogoutAt: Date.now() });
    alert('해당 유저를 로그아웃 처리했습니다.');
  } catch (e) { console.error(e); alert('로그아웃 처리 실패: ' + (e.message || e)); }
};

window.promoteAdmin = async (uidOpt = null, nameOpt = null) => {
  const uid = uidOpt || document.getElementById('promoteIdInput')?.value.trim();
  const name = nameOpt || document.getElementById('promoteNameInput')?.value.trim();
  if (!uid || !name) { alert('고유번호와 이름을 입력해주세요.'); return; }
  try {
    await setDoc(doc(db, "users", uid), { name, isAdmin: true, updatedAt: Date.now() }, { merge: true });
    alert(`✅ ${name} (${uid}) 관리자 권한 부여`);
  } catch (e) { console.error(e); alert('권한 부여 실패: ' + (e.message || e)); }
};

window.demoteAdmin = async (uidOpt = null) => {
  const uid = uidOpt || document.getElementById('promoteIdInput')?.value.trim();
  if (!uid) { alert('고유번호를 입력해주세요.'); return; }
  try {
    await setDoc(doc(db, "users", uid), { isAdmin: false, updatedAt: Date.now() }, { merge: true });
    alert(`✅ (${uid}) 관리자 권한 해제`);
  } catch (e) { console.error(e); alert('권한 해제 실패: ' + (e.message || e)); }
};

// ======= 관리자 탭 전환 =======
window.showTab = function (name) {
  document.querySelectorAll('#adminPanelAll .tab-section')
    .forEach(sec => sec.style.display = 'none');
  const t = document.getElementById('tab-' + name);
  if (t) t.style.display = 'block';
};
