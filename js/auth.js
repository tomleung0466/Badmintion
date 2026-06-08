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
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    collection,
    addDoc,
    getDoc,
    getDocs,
    query,
    orderBy,
    where,
    runTransaction,
    arrayUnion,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

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
const storage = getStorage(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

window.firebaseAuthUid = null;
window.firebaseAuthUser = null;

function getTodayISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

window.getTodayISO = getTodayISO;

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

window.dbPublishActivity = async function dbPublishActivity(activityData) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再發佈場次");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const docRef = await addDoc(collection(db, "activities"), {
            ...activityData,
            hostUid: activityData.hostUid || user.uid,
            hostEmail: activityData.hostEmail || user.email || null,
            participants: activityData.participants || {},
            participantUids: Array.isArray(activityData.participantUids) ? activityData.participantUids : [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        console.info("場次已寫入 Firestore activities:", docRef.id);
        return docRef.id;
    } catch (err) {
        console.error("發佈場次到 Firestore 失敗:", err);
        throw err;
    }
};

window.dbFetchActivityById = async function dbFetchActivityById(activityId) {
    try {
        if (!activityId) return null;
        const activitySnap = await getDoc(doc(db, "activities", activityId));
        if (!activitySnap.exists()) return null;
        return {
            ...activitySnap.data(),
            firestoreId: activitySnap.id
        };
    } catch (err) {
        console.error("讀取單一 Firestore 場次失敗:", err);
        throw err;
    }
};

window.dbFetchActivities = async function dbFetchActivities() {
    try {
        const todayISO = getTodayISO();
        const activitiesQuery = query(
            collection(db, "activities"),
            where("playDate", ">=", todayISO),
            orderBy("playDate", "desc")
        );
        const snapshot = await getDocs(activitiesQuery);

        return snapshot.docs
            .map(docSnap => ({
                ...docSnap.data(),
                firestoreId: docSnap.id
            }))
            .filter(activity => activity.playDate && activity.playDate >= todayISO)
            .filter(activity => !activity.isPrivate);
    } catch (err) {
        console.error("讀取 Firestore 場次失敗:", err);
        throw err;
    }
};

window.dbReserveActivity = async function dbReserveActivity(activityData) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再留位");
            error.code = "auth/not-signed-in";
            throw error;
        }
        if (!activityData?.firestoreId) {
            const error = new Error("缺少 Firestore 場次 ID");
            error.code = "activity/missing-firestore-id";
            throw error;
        }

        const activityRef = doc(db, "activities", activityData.firestoreId);

        return await runTransaction(db, async transaction => {
            const activitySnap = await transaction.get(activityRef);
            if (!activitySnap.exists()) {
                const error = new Error("場次不存在");
                error.code = "activity/not-found";
                throw error;
            }

            const activity = activitySnap.data();
            const participantUids = Array.isArray(activity.participantUids) ? activity.participantUids : [];
            if (participantUids.includes(user.uid)) {
                return { alreadyJoined: true };
            }

            const maxSlots = Number(activity.maxSlots ?? 6);
            const currentPlayers = Number(activity.currentPlayers ?? 0);
            if (currentPlayers >= maxSlots) {
                const error = new Error("場次已滿額");
                error.code = "activity/full";
                throw error;
            }

            transaction.update(activityRef, {
                currentPlayers: currentPlayers + 1,
                participantUids: arrayUnion(user.uid),
                [`participants.${user.uid}`]: {
                    uid: user.uid,
                    displayName: user.displayName || user.email?.split("@")[0] || "波友",
                    email: user.email || null,
                    photoURL: user.photoURL || null,
                    status: "reserved",
                    joinedAt: serverTimestamp()
                },
                updatedAt: serverTimestamp()
            });

            return { alreadyJoined: false };
        });
    } catch (err) {
        console.error("留位寫入 Firestore 失敗:", err);
        throw err;
    }
};

window.dbFetchMyHostedActivities = async function dbFetchMyHostedActivities(limit = 3) {
    const user = auth.currentUser;
    if (!user) return [];
    const todayISO = getTodayISO();
    try {
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("hostUid", "==", user.uid),
            where("playDate", ">=", todayISO),
            orderBy("playDate", "desc"),
            limit(limit)
        ));
        return snapshot.docs.map(docSnap => ({ ...docSnap.data(), firestoreId: docSnap.id }));
    } catch (err) {
        console.error("讀取我發佈的場次失敗，改為前端篩選:", err);
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("hostUid", "==", user.uid)
        ));
        return snapshot.docs
            .map(docSnap => ({ ...docSnap.data(), firestoreId: docSnap.id }))
            .filter(activity => activity.playDate && activity.playDate >= todayISO)
            .sort((a, b) => (b.playDate || "").localeCompare(a.playDate || ""))
            .slice(0, limit);
    }
};

window.dbFetchMyJoinedActivities = async function dbFetchMyJoinedActivities(limit = 3) {
    const user = auth.currentUser;
    if (!user) return [];
    const todayISO = getTodayISO();
    try {
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("participantUids", "array-contains", user.uid),
            where("playDate", ">=", todayISO),
            orderBy("playDate", "desc"),
            limit(limit)
        ));
        return snapshot.docs.map(docSnap => ({ ...docSnap.data(), firestoreId: docSnap.id }));
    } catch (err) {
        console.error("讀取我參加的場次失敗，改為前端篩選:", err);
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("participantUids", "array-contains", user.uid)
        ));
        return snapshot.docs
            .map(docSnap => ({ ...docSnap.data(), firestoreId: docSnap.id }))
            .filter(activity => activity.playDate && activity.playDate >= todayISO)
            .sort((a, b) => (b.playDate || "").localeCompare(a.playDate || ""))
            .slice(0, limit);
    }
};

window.dbUpdateUserProfile = async function dbUpdateUserProfile(newName, imageFile) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再修改個人資料");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const displayName = (newName || "").trim() || user.displayName || user.email?.split("@")[0] || "波友";
        let photoURL = user.photoURL || null;

        if (imageFile) {
            const avatarRef = ref(storage, `avatars/${user.uid}`);
            await uploadBytes(avatarRef, imageFile);
            photoURL = await getDownloadURL(avatarRef);
        }

        await updateProfile(user, {
            displayName,
            photoURL
        });

        await updateDoc(doc(db, "users", user.uid), {
            displayName,
            photoURL,
            updatedAt: serverTimestamp()
        });

        window.firebaseAuthUser = {
            uid: user.uid,
            email: user.email || null,
            displayName,
            photoURL
        };
        updateAuthHeader(user);

        return true;
    } catch (err) {
        console.error("更新個人資料失敗:", err);
        throw err;
    }
};

window.firebaseDbBridgeReady = true;
window.dispatchEvent(new CustomEvent("firebase-db-bridge-ready"));
