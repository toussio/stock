// ===== 환전 모듈 (현금 ⇄ 코인 / 주식 ⇄ 코인) =====
import { db, auth, log, companiesCoin, getDisplayPrice } from "./app.js";
import { doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("exchangeBtn");
  if (btn) btn.addEventListener("click", openExchangeModal);
});

// ===== 모달 열기 =====
function openExchangeModal() {
  let modal = document.getElementById("exchangeModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "exchangeModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <button class="xbtn" onclick="closeExchange()">✕</button>
        <h2>💱 환전</h2>
        <p style="color:#94a3b8;">현금 ↔ 코인 변환 / 코인 ↔ 주식 전환</p>

        <label>거래유형</label>
        <select id="exchangeType">
          <option value="cashToCoin">현금 → 코인</option>
          <option value="coinToCash">코인 → 현금</option>
          <option value="coinToStock">코인 → 주식</option>
          <option value="stockToCoin">주식 → 코인</option>
        </select>

        <label style="margin-top:8px;">금액 또는 수량</label>
        <input id="exchangeAmount" type="number" placeholder="금액 입력" style="width:100%;padding:8px;border-radius:6px;border:1px solid #374151;background:#0b1220;color:#e5e7eb;">

        <label style="margin-top:8px;">대상 종목 (코인/주식)</label>
        <select id="exchangeTarget"></select>

        <button id="exchangeDoBtn" style="margin-top:12px;">환전 실행</button>
        <div id="exchangeResult" style="margin-top:10px;color:#9ca3af;font-size:14px;"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // 옵션 채우기
  const targetSel = modal.querySelector("#exchangeTarget");
  targetSel.innerHTML = "";
  companiesCoin.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    targetSel.appendChild(opt);
  });

  // 실행 버튼
  modal.querySelector("#exchangeDoBtn").onclick = doExchange;
  modal.style.display = "flex";
}

// ===== 모달 닫기 =====
window.closeExchange = function() {
  const modal = document.getElementById("exchangeModal");
  if (modal) modal.style.display = "none";
};

// ===== 환전 실행 =====
async function doExchange() {
  const user = auth.currentUser;
  if (!user) return alert("로그인이 필요합니다.");
  const uid = user.uid;

  const type = document.getElementById("exchangeType").value;
  const amount = Number(document.getElementById("exchangeAmount").value);
  const targetId = document.getElementById("exchangeTarget").value;
  const target = companiesCoin.find(c => c.id === targetId);
  const price = getDisplayPrice(target);
  const resultEl = document.getElementById("exchangeResult");

  if (!amount || amount <= 0) return alert("금액 또는 수량을 입력하세요.");

  try {
    const uref = doc(db, "users", uid);
    const snap = await getDoc(uref);
    const u = snap.data();

    if (!u) return alert("유저 정보를 찾을 수 없습니다.");
    let msg = "";
    const feeRate = 0.02; // 2% 수수료

    if (type === "cashToCoin") {
      const total = amount * (1 - feeRate);
      if (u.cash < amount) return alert("현금 잔액이 부족합니다.");
      await updateDoc(uref, {
        cash: increment(-amount),
        coin: increment(total),
        updatedAt: Date.now(),
      });
      msg = `현금 ${amount.toLocaleString()} → 코인 ${total.toLocaleString()} 전환 완료`;
    }
    else if (type === "coinToCash") {
      const total = amount * (1 - feeRate);
      if (u.coin < amount) return alert("코인 잔액이 부족합니다.");
      await updateDoc(uref, {
        coin: increment(-amount),
        cash: increment(total),
        updatedAt: Date.now(),
      });
      msg = `코인 ${amount.toLocaleString()} → 현금 ${total.toLocaleString()} 전환 완료`;
    }
    else if (type === "coinToStock") {
      const shares = Math.floor(amount / price);
      if (shares <= 0) return alert("코인이 부족합니다.");
      if (u.coin < amount) return alert("코인 잔액이 부족합니다.");

      const holdings = u.holdings || {};
      const newHold = (holdings[target.name] || 0) + shares;

      await updateDoc(uref, {
        coin: increment(-amount),
        [`holdings.${target.name}`]: newHold,
        updatedAt: Date.now(),
      });
      msg = `🪙 코인 ${amount.toLocaleString()} → ${target.name} ${shares.toLocaleString()}주 구입`;
    }
    else if (type === "stockToCoin") {
      const holdings = u.holdings || {};
      const stockAmt = holdings[target.name] || 0;
      if (stockAmt < amount) return alert("보유 주식이 부족합니다.");

      const value = amount * price * (1 - feeRate);
      await updateDoc(uref, {
        coin: increment(value),
        [`holdings.${target.name}`]: stockAmt - amount,
        updatedAt: Date.now(),
      });
      msg = `📈 ${target.name} ${amount}주 → 코인 ${value.toLocaleString()} 변환 완료`;
    }

    resultEl.textContent = msg;
    log(`💱 ${msg}`);
  } catch (e) {
    console.error(e);
    alert("환전 처리 중 오류 발생");
  }
}
