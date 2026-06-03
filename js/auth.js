/**
 * auth.js — VibeUp | 波友：Firebase Google 登入（ES Module）
 * 僅使用 addEventListener，不依賴 HTML onclick。
 * 須於 app.js、matches.js 之後載入。
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import {
    getAuth,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAt_w77WsAWdVl6-waXdqtErHlerqUX5-Y",
    authDomain: "badminton-app-b08cc.firebaseapp.com",
    projectId: "badminton-app-b08cc",
    storageBucket: "badminton-app-b08cc.firebasestorage.app",
    messagingSenderId: "1052720461135",
    appId: "1:1052720461135:web:495ff32beaddbb7857413a",
    measurementId: "G-15LMCEG479"
};

const app = initializeApp(firebaseConfig);
try {
    getAnalytics(app);
} catch (_) { /* ignore */ }

const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

window.firebaseAuthUid = null;
window.firebaseAuthUser = null;

function byId(id) {
    return document.getElementById(id);
}

function setAuthError(message = "") {
    const errorEl = byId("auth-error");
    if (!errorEl) return;
    if (!message) {
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
        return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
    byId("auth-modal")?.classList.remove("hidden");
}

function updateAuthHeader(user) {
    const loginBtn = byId("loginBtn");
    const userWrap = byId("auth-user-wrap");
    const userLabel = byId("auth-user-email");
    const avatar = byId("auth-user-avatar");
    if (!loginBtn || !userWrap || !userLabel || !avatar) return;

    if (user) {
        loginBtn.classList.add("hidden");
        userWrap.classList.remove("hidden");
        userWrap.classList.add("flex");
        userLabel.textContent = user.displayName || user.email || "已登入會員";
        if (user.photoURL) {
            avatar.src = user.photoURL;
            avatar.classList.remove("hidden");
        } else {
            avatar.removeAttribute("src");
            avatar.classList.add("hidden");
        }
        return;
    }

    loginBtn.classList.remove("hidden");
    userWrap.classList.add("hidden");
    userWrap.classList.remove("flex");
    userLabel.textContent = "";
    avatar.removeAttribute("src");
    avatar.classList.add("hidden");
}

function mapAuthError(errorCode) {
    const map = {
        "auth/popup-closed-by-user": "你已關閉 Google 登入視窗",
        "auth/cancelled-popup-request": "登入流程已取消",
        "auth/popup-blocked": "彈出視窗被封鎖，正在改用跳轉登入",
        "auth/operation-not-supported-in-this-environment": "目前環境不支援彈窗，正在改用跳轉登入",
        "auth/unauthorized-domain": "此網域尚未加入 Firebase 授權清單",
        "auth/too-many-requests": "嘗試次數過多，請稍後再試"
    };
    return map[errorCode] || "操作失敗，請稍後再試";
}

function closeAuthModal() {
    byId("auth-modal")?.classList.add("hidden");
    const errorEl = byId("auth-error");
    if (errorEl) {
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
    }
}

function showWelcomeMessage(user) {
    if (!user) return;
    const name = user.displayName || user.email?.split("@")[0] || "VibeUp 波友";
    alert(`歡迎回來，${name}！\n一起在同城搵玩伴、開波上浮 vibe 🏸`);
}

function buildUserProfile(user) {
    const fallbackName = user.email?.split("@")[0] || "波友";
    return {
        uid: user.uid,
        displayName: user.displayName || fallbackName,
        email: user.email || null,
        photoURL: user.photoURL || null,
        provider: "google",
        appName: "VibeUp 波友",
        recentAttendance: {
            attended: 3,
            total: 3,
            label: "3／3"
        },
        updatedAt: serverTimestamp()
    };
}

async function ensureUserProfileAndAttendance(user) {
    if (!user?.uid) return;

    const userRef = doc(db, "users", user.uid);
    const attendanceRef = doc(db, "users", user.uid, "attendance", "recent");
    const userSnap = await getDoc(userRef);
    const now = serverTimestamp();

    await setDoc(
        userRef,
        {
            ...buildUserProfile(user),
            ...(userSnap.exists() ? {} : { createdAt: now })
        },
        { merge: true }
    );

    await setDoc(
        attendanceRef,
        {
            attended: 3,
            total: 3,
            label: "3／3",
            records: [],
            updatedAt: now,
            ...(userSnap.exists() ? {} : { createdAt: now })
        },
        { merge: true }
    );
}

async function loginWithGoogle() {
    const googleBtn = byId("auth-google-btn");
    const loginBtn = byId("loginBtn");
    try {
        setAuthError("");
        if (googleBtn) googleBtn.disabled = true;
        if (loginBtn) loginBtn.disabled = true;
        const result = await signInWithPopup(auth, provider);
        closeAuthModal();
        showWelcomeMessage(result.user);
    } catch (err) {
        if (err?.code === "auth/popup-blocked" || err?.code === "auth/operation-not-supported-in-this-environment") {
            setAuthError("彈窗受限，正在改用 Google 跳轉登入...");
            await signInWithRedirect(auth, provider);
            return;
        }
        setAuthError(mapAuthError(err?.code));
    } finally {
        if (googleBtn) googleBtn.disabled = false;
        if (loginBtn) loginBtn.disabled = false;
    }
}

async function logoutCurrentUser() {
    try {
        await signOut(auth);
        closeAuthModal();
    } catch (err) {
        setAuthError(mapAuthError(err?.code));
    }
}

function bindAuthUI() {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            console.log("登入按鈕被安全點擊了！");
            loginWithGoogle();
        });
    }

    byId("auth-close-btn")?.addEventListener("click", closeAuthModal);
    byId("auth-google-btn")?.addEventListener("click", loginWithGoogle);
    byId("auth-logout-btn")?.addEventListener("click", logoutCurrentUser);

    const modal = byId("auth-modal");
    modal?.addEventListener("click", event => {
        if (event.target === modal) closeAuthModal();
    });
}

function initAuth() {
    bindAuthUI();

    getRedirectResult(auth)
        .then(result => {
            if (result?.user) showWelcomeMessage(result.user);
        })
        .catch(err => {
            setAuthError(mapAuthError(err?.code));
        });

    onAuthStateChanged(auth, async user => {
        window.firebaseAuthUid = user ? user.uid : null;
        window.firebaseAuthUser = user
            ? {
                uid: user.uid,
                email: user.email || null,
                displayName: user.displayName || null,
                photoURL: user.photoURL || null
            }
            : null;
        console.log("Firebase auth user:", {
            uid: window.firebaseAuthUid,
            email: window.firebaseAuthUser?.email || null
        });
        updateAuthHeader(user);
        if (typeof window.handleAuthUserChange === "function") {
            window.handleAuthUserChange(user);
        }
        if (user) {
            try {
                await ensureUserProfileAndAttendance(user);
            } catch (err) {
                console.error("建立用戶檔案或出席紀錄失敗:", err);
            }
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
} else {
    initAuth();
}
