/* ============================================================
   💱 작두 투자 센터 | 환전 시스템 (exchange.js)
   기준: 시뚜님 최신 통합본 (파트2)
   ============================================================ */

// ======= 환전 모달 열기/닫기 =======
function openExchangeModal() {
  if (!currentUser) return alert('로그인 후 이용해주세요.');
  document.getElementById('exchangeModal').style.display = 'flex';
}

function closeExchangeModal() {
  document.getElementById('exchangeModal').style.display = 'none';
}

// ======= 현금 → 코인 환전 =======
async function exchangeCashToCoin() {
  if (!currentUser) return alert('로그인 후 이용해주세요.');

  const amount = parseNumber(document.getElementById('exchangeAmount').value);
  if (amount <= 0) return alert('올바른 금액을 입력하세요.');
  if (player.cash < amount) return alert('보유 현금이 부족합니다.');

  // 보유 현금 차감 / 코인 증가
  player.cash -= amount;
  player.coin += amount;

  try {
    await setDoc(doc(db, "users", currentUser.id), {
      cash: player.cash,
      coin: player.coin,
      holdings: player.holdings,
      updatedAt: Date.now()
    }, { merge: true });

    renderUserInfo();
    alert(`💱 ${amount.toLocaleString()} RWW → COIN 환전 완료`);

    // 입력값 초기화
    document.getElementById('exchangeAmount').value = '';
    closeExchangeModal();
  } catch (e) {
    console.error("환전 저장 실패:", e);
    alert("환전 저장 실패: " + (e.message || e));
  }
}

// ======= 전역 바인딩 =======
window.openExchangeModal = openExchangeModal;
window.closeExchangeModal = closeExchangeModal;
window.exchangeCashToCoin = exchangeCashToCoin;
