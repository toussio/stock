// ====== Firebase & Firestore 초기화 ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs,
  setDoc, updateDoc, addDoc, onSnapshot, increment
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// ====== Firebase 설정 ======
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ====== Firebase 초기화 ======
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ====== 익명 로그인 ======
signInAnonymously(auth)
  .then(() => console.log("✅ 익명 로그인 성공"))
  .catch(err => console.error("❌ 로그인 실패:", err));

onAuthStateChanged(auth, user => {
  if (user) {
    console.log("👤 유저 UID:", user.uid);
    initUser(user.uid);
  }
});

// ====== 유저 초기화 ======
async function initUser(uid) {
  try {
    const uref = doc(db, "users", uid);
    const usnap = await getDoc(uref);

    if (!usnap.exists()) {
      await setDoc(uref, {
        uid,
        name: "게스트",
        cash: 0,
        coin: 0,
        holdings: {},
        createdAt: Date.now(),
      });
      console.log("🆕 신규 유저 생성 완료");
    } else {
      console.log("✅ 기존 유저 로그인 완료");
    }

    // 로그인 UI 업데이트
    const info = document.getElementById("userInfo");
    if (info) info.textContent = `UID: ${uid}`;
  } catch (e) {
    console.error("❌ 유저 초기화 실패:", e);
  }
}

// ====== 공용 로그 함수 ======
export function log(msg) {
  const area = document.getElementById("log");
  const time = new Date().toLocaleTimeString("ko-KR", { hour12: false });
  if (area) {
    const line = document.createElement("div");
    line.textContent = `[${time}] ${msg}`;
    area.appendChild(line);
    area.scrollTop = area.scrollHeight;
  }
  console.log(msg);
}

// ====== 기업/코인 목록 관리 ======
export let companiesStock = [];
export let companiesCoin = [];

// Firestore 실시간 업데이트
onSnapshot(collection(db, "companies_stock"), snap => {
  companiesStock = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log("📊 주식 데이터 업데이트:", companiesStock.length);
});
onSnapshot(collection(db, "companies_coin"), snap => {
  companiesCoin = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log("🪙 코인 데이터 업데이트:", companiesCoin.length);
});

// ====== 공용 헬퍼 함수 ======
export function getDisplayPrice(c) {
  return Number(c?.price || 0);
}

export function findCompanyById(id) {
  return (
    companiesStock.find(c => c.id === id) ||
    companiesCoin.find(c => c.id === id)
  );
}

// ====== 출금/입금 요청 전송 ======
export async function requestTransaction(type, uid, amount) {
  try {
    if (!uid || !amount) return alert("유저 정보나 금액이 잘못되었습니다.");
    await addDoc(collection(db, "transactions"), {
      uid,
      type,
      amount,
      createdAt: Date.now(),
      status: "pending"
    });
    log(`📨 ${type === "deposit" ? "입금" : "출금"} 요청 전송 완료 (${amount.toLocaleString()} RWW)`);
  } catch (e) {
    console.error(e);
    alert("요청 중 오류 발생");
  }
}

// ====== 날짜 포맷 ======
export function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ====== 전역 바인딩 (테스트용) ======
window.log = log;
window.requestTransaction = requestTransaction;
