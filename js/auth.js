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
    deleteUser,
    reauthenticateWithPopup,
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
    arrayRemove,
    deleteField,
    setDoc,
    updateDoc,
    deleteDoc,
    increment,
    getCountFromServer,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
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

function filterActiveActivities(activities = []) {
    if (typeof window.isActivityActive === "function") {
        return activities.filter(activity => window.isActivityActive(activity));
    }
    const todayISO = getTodayISO();
    return activities.filter(activity => activity.playDate && activity.playDate >= todayISO);
}

function assertActivityNotEnded(activity) {
    if (typeof window.isActivityEnded === "function" && window.isActivityEnded(activity)) {
        const error = new Error("場次已結束");
        error.code = "activity/ended";
        throw error;
    }
}

function resolveSessionEndsAtTimestamp(activityData = {}) {
    const raw = activityData.sessionEndsAt;
    if (raw && typeof raw.toDate === "function") return raw;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return Timestamp.fromDate(raw);
    }
    if (typeof window.buildActivityEndsAtDate === "function") {
        const endsAt = window.buildActivityEndsAtDate(
            activityData.playDate,
            activityData.startTime || activityData.startTimeValue
        );
        if (endsAt && !Number.isNaN(endsAt.getTime())) {
            return Timestamp.fromDate(endsAt);
        }
    }
    return null;
}

function buildActivityPublishPayload(activityData = {}, user) {
    const sessionEndsAt = resolveSessionEndsAtTimestamp(activityData);
    if (!sessionEndsAt) {
        const error = new Error("無法計算場次截止時間，請重新選擇開場日期與時間");
        error.code = "activity/missing-session-ends-at";
        throw error;
    }

    const maxSlots = Math.trunc(Number(activityData.maxSlots) || 6);
    const currentPlayers = Math.trunc(Number(activityData.currentPlayers) || 0);
    if (currentPlayers > maxSlots) {
        const error = new Error("現時人數不能超過總名額");
        error.code = "activity/invalid-current-players";
        throw error;
    }

    return {
        hostUid: user.uid,
        hostEmail: activityData.hostEmail || user.email || null,
        isPrivate: activityData.isPrivate === true,
        region: String(activityData.region || ""),
        venue: String(activityData.venue || ""),
        playDate: String(activityData.playDate || ""),
        playTime: String(activityData.playTime || ""),
        startTime: String(activityData.startTime || ""),
        endTime: String(activityData.endTime || ""),
        sessionEndsAt,
        duration: Number(activityData.duration) || 0,
        courtCount: Math.trunc(Number(activityData.courtCount) || 1),
        displayTimeSlot: String(activityData.displayTimeSlot || activityData.playTime || ""),
        fee: Math.trunc(Number(activityData.fee) || 50),
        shuttleInfo: String(activityData.shuttleInfo || ""),
        skillLevel: String(activityData.skillLevel || ""),
        contact: String(activityData.contact || ""),
        maxSlots,
        currentPlayers,
        participants: {},
        participantUids: [],
        pendingParticipantUids: [],
        waitlist: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}

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
    const modal = byId("auth-modal");
    if (modal && typeof window.openMujiOverlay === "function") {
        window.openMujiOverlay(modal);
    } else {
        modal?.classList.remove("hidden");
    }
}

function updateAuthHeader(user) {
    const loginBtn = byId("loginBtn");
    const userWrap = byId("auth-user-wrap");
    const userLabel = byId("auth-user-email");
    const avatar = byId("auth-user-avatar");
    if (!loginBtn || !userWrap || !userLabel || !avatar) return;

    const profileLogoutWrap = byId("profile-logout-wrap");

    if (user) {
        loginBtn.classList.add("hidden");
        userWrap.classList.remove("hidden");
        userWrap.classList.add("flex");
        profileLogoutWrap?.classList.remove("hidden");
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
    profileLogoutWrap?.classList.add("hidden");
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
        "auth/too-many-requests": "嘗試次數過多，請稍後再試",
        "auth/requires-recent-login": "為保障帳戶安全，請重新登入後再注銷帳號"
    };
    return map[errorCode] || "操作失敗，請稍後再試";
}

async function closeAuthModal() {
    const modal = byId("auth-modal");
    if (modal && typeof window.closeMujiOverlay === "function") {
        await window.closeMujiOverlay(modal);
    } else {
        modal?.classList.add("hidden");
    }
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
        hostSessionCount: 0,
        hostComplaintCount: 0,
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
    byId("profile-logout-btn")?.addEventListener("click", logoutCurrentUser);

    const modal = byId("auth-modal");
    modal?.addEventListener("click", event => {
        if (event.target === modal || event.target.classList.contains("muji-overlay__backdrop")) {
            closeAuthModal();
        }
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

    let authStateInitialSettled = false;

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
        if (!authStateInitialSettled) {
            authStateInitialSettled = true;
            window.firebaseAuthReady = true;
            window.dispatchEvent(new CustomEvent("firebase-auth-ready"));
        }
        if (typeof window.handleAuthUserChange === "function") {
            await window.handleAuthUserChange(user);
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

        const payload = buildActivityPublishPayload(activityData, user);
        const docRef = await addDoc(collection(db, "activities"), payload);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                hostSessionCount: increment(1),
                updatedAt: serverTimestamp()
            });
        } catch (userErr) {
            console.warn("場次已發佈，但更新場主開局次數失敗:", userErr);
        }

        console.info("場次已寫入 Firestore activities:", docRef.id);
        return docRef.id;
    } catch (err) {
        console.error("發佈場次到 Firestore 失敗:", err);
        throw err;
    }
};

window.dbDeleteActivity = async function dbDeleteActivity(activityId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再刪除場次");
            error.code = "auth/not-signed-in";
            throw error;
        }
        if (!activityId) {
            const error = new Error("缺少場次 ID");
            error.code = "activity/missing-id";
            throw error;
        }

        const activityRef = doc(db, "activities", activityId);
        const activitySnap = await getDoc(activityRef);
        if (!activitySnap.exists()) {
            const error = new Error("場次不存在");
            error.code = "activity/not-found";
            throw error;
        }
        if (activitySnap.data().hostUid !== user.uid) {
            const error = new Error("只有場主可以刪除此場次");
            error.code = "activity/not-host";
            throw error;
        }

        await deleteDoc(activityRef);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                hostSessionCount: increment(-1),
                updatedAt: serverTimestamp()
            });
        } catch (userErr) {
            console.warn("場次已刪除，但更新場主開局次數失敗:", userErr);
        }

        return { deleted: true };
    } catch (err) {
        console.error("刪除 Firestore 場次失敗:", err);
        throw err;
    }
};

const HOST_QUALITY_MIN_SESSIONS = 5;

function resolveHostTier(sessionCount, complaintCount) {
    const hosted = Number(sessionCount) || 0;
    const complaints = Number(complaintCount) || 0;
    if (hosted < HOST_QUALITY_MIN_SESSIONS) return "newbie";
    if (complaints === 0) return "quality";
    return null;
}

async function resolveHostSessionCount(uid, storedCount) {
    const parsed = Number(storedCount);
    if (Number.isFinite(parsed) && storedCount !== undefined) {
        return parsed;
    }
    try {
        const countSnap = await getCountFromServer(query(
            collection(db, "activities"),
            where("hostUid", "==", uid)
        ));
        return countSnap.data().count || 0;
    } catch (err) {
        console.error(`統計場主 ${uid} 開局次數失敗:`, err);
        return 0;
    }
}

window.dbFetchHostProfiles = async function dbFetchHostProfiles(uids = []) {
    const uniqueUids = [...new Set((uids || []).filter(Boolean))];
    const result = {};
    if (!uniqueUids.length) return result;

    const attendanceRates = typeof window.dbFetchUsersAttendanceRates === "function"
        ? await window.dbFetchUsersAttendanceRates(uniqueUids)
        : {};

    await Promise.all(uniqueUids.map(async uid => {
        try {
            const userSnap = await getDoc(doc(db, "users", uid));
            const data = userSnap.exists() ? userSnap.data() : {};
            const sessionCount = await resolveHostSessionCount(uid, data.hostSessionCount);
            const complaintCount = Number(data.hostComplaintCount) || 0;
            const attendance = attendanceRates[uid] || mapAttendanceRate(data.recentAttendance);
            result[uid] = {
                sessionCount,
                complaintCount,
                tier: resolveHostTier(sessionCount, complaintCount),
                attendance
            };
        } catch (err) {
            console.error(`讀取場主檔案 ${uid} 失敗:`, err);
            result[uid] = {
                sessionCount: 0,
                complaintCount: 0,
                tier: "newbie",
                attendance: mapAttendanceRate()
            };
        }
    }));

    return result;
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
        const mapped = snapshot.docs
            .map(docSnap => ({
                ...docSnap.data(),
                firestoreId: docSnap.id
            }))
            .filter(activity => activity.playDate && activity.playDate >= todayISO)
            .filter(activity => !activity.isPrivate);
        const active = filterActiveActivities(mapped);
        if (mapped.length > 0 && active.length === 0) {
            console.info(
                `[+1] Firestore 讀到 ${mapped.length} 筆場次，但開場逾 30 分鐘的已隱藏。`
            );
        }
        return active;
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
            assertActivityNotEnded(activity);

            const participantUids = Array.isArray(activity.participantUids) ? activity.participantUids : [];
            const pendingUids = Array.isArray(activity.pendingParticipantUids) ? activity.pendingParticipantUids : [];
            if (participantUids.includes(user.uid) || pendingUids.includes(user.uid)) {
                return { alreadyJoined: true };
            }

            const maxSlots = Number(activity.maxSlots ?? 6);
            const currentPlayers = Number(activity.currentPlayers ?? 0);
            const pendingCount = pendingUids.length;
            if (currentPlayers + pendingCount >= maxSlots) {
                const error = new Error("場次已滿額");
                error.code = "activity/full";
                throw error;
            }

            const waitlist = Array.isArray(activity.waitlist) ? activity.waitlist : [];
            const updatePayload = {
                pendingParticipantUids: arrayUnion(user.uid),
                [`participants.${user.uid}`]: {
                    uid: user.uid,
                    displayName: user.displayName || user.email?.split("@")[0] || "波友",
                    email: user.email || null,
                    photoURL: user.photoURL || null,
                    status: "pending",
                    joinedAt: serverTimestamp()
                },
                updatedAt: serverTimestamp()
            };

            if (waitlist.includes(user.uid)) {
                updatePayload.waitlist = arrayRemove(user.uid);
                updatePayload[`waitlistProfiles.${user.uid}`] = deleteField();
            }

            transaction.update(activityRef, updatePayload);

            return { alreadyJoined: false, pending: true };
        });
    } catch (err) {
        console.error("留位寫入 Firestore 失敗:", err);
        throw err;
    }
};

function mapAttendanceRate(data = {}) {
    const total = Number(data.total) || 0;
    const attended = Number(data.attended) || 0;
    const percent = total > 0 ? Math.round((attended / total) * 100) : 100;
    return {
        attended,
        total,
        percent,
        label: data.label || (total > 0 ? `${attended}／${total}` : "—")
    };
}

window.dbFetchUsersAttendanceRates = async function dbFetchUsersAttendanceRates(uids = []) {
    const uniqueUids = [...new Set((uids || []).filter(Boolean))];
    const result = {};
    if (!uniqueUids.length) return result;

    await Promise.all(uniqueUids.map(async uid => {
        try {
            const attendanceSnap = await getDoc(doc(db, "users", uid, "attendance", "recent"));
            if (attendanceSnap.exists()) {
                result[uid] = mapAttendanceRate(attendanceSnap.data());
                return;
            }

            const userSnap = await getDoc(doc(db, "users", uid));
            if (userSnap.exists()) {
                const recentAttendance = userSnap.data()?.recentAttendance;
                if (recentAttendance) {
                    result[uid] = mapAttendanceRate(recentAttendance);
                    return;
                }
            }

            result[uid] = mapAttendanceRate({ attended: 0, total: 0, label: "—" });
        } catch (err) {
            console.error(`讀取用戶 ${uid} 出席率失敗:`, err);
            result[uid] = mapAttendanceRate({ attended: 0, total: 0, label: "—" });
        }
    }));

    return result;
};

window.dbJoinWaitlist = async function dbJoinWaitlist(activityData) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再加入後補");
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
            assertActivityNotEnded(activity);

            const participantUids = Array.isArray(activity.participantUids) ? activity.participantUids : [];
            const pendingUids = Array.isArray(activity.pendingParticipantUids) ? activity.pendingParticipantUids : [];
            if (participantUids.includes(user.uid) || pendingUids.includes(user.uid)) {
                const error = new Error("你已預約此場次");
                error.code = "activity/already-joined";
                throw error;
            }

            const waitlist = Array.isArray(activity.waitlist) ? activity.waitlist : [];
            if (waitlist.includes(user.uid)) {
                return { alreadyWaitlisted: true };
            }

            const maxSlots = Number(activity.maxSlots ?? 6);
            const currentPlayers = Number(activity.currentPlayers ?? 0);
            if (currentPlayers < maxSlots) {
                const error = new Error("場次仍有空位，請直接報名");
                error.code = "activity/not-full";
                throw error;
            }

            transaction.update(activityRef, {
                waitlist: arrayUnion(user.uid),
                [`waitlistProfiles.${user.uid}`]: {
                    uid: user.uid,
                    displayName: user.displayName || user.email?.split("@")[0] || "波友",
                    photoURL: user.photoURL || null,
                    joinedAt: serverTimestamp()
                },
                updatedAt: serverTimestamp()
            });

            return { alreadyWaitlisted: false };
        });
    } catch (err) {
        console.error("加入後補名單失敗:", err);
        throw err;
    }
};

window.dbCancelReservation = async function dbCancelReservation(activityData) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再取消預約");
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
            const pendingUids = Array.isArray(activity.pendingParticipantUids) ? activity.pendingParticipantUids : [];
            const isApproved = participantUids.includes(user.uid);
            const isPending = pendingUids.includes(user.uid);

            if (!isApproved && !isPending) {
                const error = new Error("你尚未預約此場次");
                error.code = "activity/not-joined";
                throw error;
            }

            const currentPlayers = Number(activity.currentPlayers ?? 0);
            const updatePayload = {
                [`participants.${user.uid}`]: deleteField(),
                updatedAt: serverTimestamp()
            };

            if (isApproved) {
                updatePayload.currentPlayers = Math.max(0, currentPlayers - 1);
                updatePayload.participantUids = arrayRemove(user.uid);
            }
            if (isPending) {
                updatePayload.pendingParticipantUids = arrayRemove(user.uid);
            }

            transaction.update(activityRef, updatePayload);

            return { cancelled: true };
        });
    } catch (err) {
        console.error("取消預約失敗:", err);
        throw err;
    }
};

window.dbApproveParticipant = async function dbApproveParticipant(activityId, participantUid) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入");
            error.code = "auth/not-signed-in";
            throw error;
        }
        if (!activityId || !participantUid) {
            const error = new Error("缺少必要參數");
            error.code = "activity/missing-params";
            throw error;
        }

        const activityRef = doc(db, "activities", activityId);

        return await runTransaction(db, async transaction => {
            const activitySnap = await transaction.get(activityRef);
            if (!activitySnap.exists()) {
                const error = new Error("場次不存在");
                error.code = "activity/not-found";
                throw error;
            }

            const activity = activitySnap.data();
            if (activity.hostUid !== user.uid) {
                const error = new Error("只有場主可以批准報名");
                error.code = "activity/not-host";
                throw error;
            }

            const pendingUids = Array.isArray(activity.pendingParticipantUids) ? activity.pendingParticipantUids : [];
            if (!pendingUids.includes(participantUid)) {
                const error = new Error("找不到待批准的報名");
                error.code = "activity/not-pending";
                throw error;
            }

            const maxSlots = Number(activity.maxSlots ?? 6);
            const currentPlayers = Number(activity.currentPlayers ?? 0);
            if (currentPlayers >= maxSlots) {
                const error = new Error("名額已滿，無法批准");
                error.code = "activity/full";
                throw error;
            }

            const profile = activity.participants?.[participantUid] || {};

            transaction.update(activityRef, {
                currentPlayers: currentPlayers + 1,
                participantUids: arrayUnion(participantUid),
                pendingParticipantUids: arrayRemove(participantUid),
                [`participants.${participantUid}`]: {
                    uid: participantUid,
                    displayName: profile.displayName || "波友",
                    email: profile.email || null,
                    photoURL: profile.photoURL || null,
                    status: "reserved",
                    joinedAt: profile.joinedAt || serverTimestamp(),
                    approvedAt: serverTimestamp()
                },
                updatedAt: serverTimestamp()
            });

            return { approved: true };
        });
    } catch (err) {
        console.error("批准報名失敗:", err);
        throw err;
    }
};

window.dbRejectParticipant = async function dbRejectParticipant(activityId, participantUid) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入");
            error.code = "auth/not-signed-in";
            throw error;
        }
        if (!activityId || !participantUid) {
            const error = new Error("缺少必要參數");
            error.code = "activity/missing-params";
            throw error;
        }

        const activityRef = doc(db, "activities", activityId);

        return await runTransaction(db, async transaction => {
            const activitySnap = await transaction.get(activityRef);
            if (!activitySnap.exists()) {
                const error = new Error("場次不存在");
                error.code = "activity/not-found";
                throw error;
            }

            const activity = activitySnap.data();
            if (activity.hostUid !== user.uid) {
                const error = new Error("只有場主可以拒絕報名");
                error.code = "activity/not-host";
                throw error;
            }

            const pendingUids = Array.isArray(activity.pendingParticipantUids) ? activity.pendingParticipantUids : [];
            if (!pendingUids.includes(participantUid)) {
                const error = new Error("找不到待拒絕的報名");
                error.code = "activity/not-pending";
                throw error;
            }

            transaction.update(activityRef, {
                pendingParticipantUids: arrayRemove(participantUid),
                [`participants.${participantUid}`]: deleteField(),
                updatedAt: serverTimestamp()
            });

            return { rejected: true };
        });
    } catch (err) {
        console.error("拒絕報名失敗:", err);
        throw err;
    }
};

window.dbFetchMyHostedPrivateActivities = async function dbFetchMyHostedPrivateActivities() {
    const user = auth.currentUser;
    if (!user) return [];
    const todayISO = getTodayISO();

    const mapPrivateHosted = docs => filterActiveActivities(docs
        .map(docSnap => ({ ...docSnap.data(), firestoreId: docSnap.id }))
        .filter(activity => (activity.isPrivate === true || activity.isPrivate === 'private')
            && activity.playDate && activity.playDate >= todayISO));

    try {
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("hostUid", "==", user.uid),
            where("isPrivate", "==", true),
            where("playDate", ">=", todayISO),
            orderBy("playDate", "desc")
        ));
        return mapPrivateHosted(snapshot.docs);
    } catch (err) {
        console.error("讀取我發佈的私人場次失敗，改為前端篩選:", err);
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("hostUid", "==", user.uid),
            where("playDate", ">=", todayISO),
            orderBy("playDate", "desc")
        ));
        return mapPrivateHosted(snapshot.docs);
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
        return filterActiveActivities(snapshot.docs.map(docSnap => ({ ...docSnap.data(), firestoreId: docSnap.id })));
    } catch (err) {
        console.error("讀取我發佈的場次失敗，改為前端篩選:", err);
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("hostUid", "==", user.uid)
        ));
        return filterActiveActivities(snapshot.docs
            .map(docSnap => ({ ...docSnap.data(), firestoreId: docSnap.id }))
            .filter(activity => activity.playDate && activity.playDate >= todayISO))
            .sort((a, b) => (b.playDate || "").localeCompare(a.playDate || ""))
            .slice(0, limit);
    }
};

window.dbFetchMyJoinedActivities = async function dbFetchMyJoinedActivities(limit = 3) {
    const user = auth.currentUser;
    if (!user) return [];
    const todayISO = getTodayISO();

    const mergeActivities = docs => {
        const map = new Map();
        docs.forEach(docSnap => {
            map.set(docSnap.id, { ...docSnap.data(), firestoreId: docSnap.id });
        });
        return filterActiveActivities([...map.values()]
            .filter(activity => activity.playDate && activity.playDate >= todayISO))
            .sort((a, b) => (b.playDate || "").localeCompare(a.playDate || ""))
            .slice(0, limit);
    };

    try {
        const [reservedSnap, pendingSnap] = await Promise.all([
            getDocs(query(
                collection(db, "activities"),
                where("participantUids", "array-contains", user.uid),
                where("playDate", ">=", todayISO),
                orderBy("playDate", "desc"),
                limit(limit)
            )),
            getDocs(query(
                collection(db, "activities"),
                where("pendingParticipantUids", "array-contains", user.uid),
                where("playDate", ">=", todayISO),
                orderBy("playDate", "desc"),
                limit(limit)
            ))
        ]);
        return mergeActivities([...reservedSnap.docs, ...pendingSnap.docs]);
    } catch (err) {
        console.error("讀取我參加的場次失敗，改為前端篩選:", err);
        const snapshot = await getDocs(collection(db, "activities"));
        return filterActiveActivities(snapshot.docs
            .map(docSnap => ({ ...docSnap.data(), firestoreId: docSnap.id }))
            .filter(activity => {
                const reserved = Array.isArray(activity.participantUids) && activity.participantUids.includes(user.uid);
                const pending = Array.isArray(activity.pendingParticipantUids) && activity.pendingParticipantUids.includes(user.uid);
                return (reserved || pending) && activity.playDate && activity.playDate >= todayISO;
            }))
            .sort((a, b) => (b.playDate || "").localeCompare(a.playDate || ""))
            .slice(0, limit);
    }
};

function mapHostPaymentSettings(data = {}) {
    return {
        paymeQrUrl: data.paymeQR || data.hostPaymeQrUrl || "",
        fpsQrUrl: data.fpsQR || data.hostFpsQrUrl || "",
        fpsId: data.hostFpsId || data.fpsId || ""
    };
}

async function syncHostPublicPayment(uid, settings = {}) {
    if (!uid) return;
    await setDoc(doc(db, "hostPublicPayment", uid), {
        hostUid: uid,
        paymeQR: settings.paymeQrUrl || "",
        fpsQR: settings.fpsQrUrl || "",
        hostPaymeQrUrl: settings.paymeQrUrl || "",
        hostFpsQrUrl: settings.fpsQrUrl || "",
        hostFpsId: settings.fpsId || "",
        fpsId: settings.fpsId || "",
        updatedAt: serverTimestamp()
    }, { merge: true });
}

window.dbFetchHostPaymentSettings = async function dbFetchHostPaymentSettings(uid) {
    try {
        if (!uid) return mapHostPaymentSettings();

        const currentUid = auth.currentUser?.uid;
        if (currentUid && currentUid === uid) {
            const userSnap = await getDoc(doc(db, "users", uid));
            if (!userSnap.exists()) return mapHostPaymentSettings();
            const mapped = mapHostPaymentSettings(userSnap.data());
            try {
                await syncHostPublicPayment(uid, mapped);
            } catch (syncErr) {
                console.warn("同步公開收款設定失敗:", syncErr);
            }
            return mapped;
        }

        const publicSnap = await getDoc(doc(db, "hostPublicPayment", uid));
        if (!publicSnap.exists()) return mapHostPaymentSettings();
        return mapHostPaymentSettings(publicSnap.data());
    } catch (err) {
        console.error("讀取場主收款設定失敗:", err);
        return mapHostPaymentSettings();
    }
};

window.dbUploadHostPaymentQr = async function dbUploadHostPaymentQr(type, imageFile) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再上傳收款碼");
            error.code = "auth/not-signed-in";
            throw error;
        }
        if (type !== "payme" && type !== "fps") {
            const error = new Error("不支援的收款碼類型");
            error.code = "host-payment/invalid-type";
            throw error;
        }
        if (!imageFile || !imageFile.type?.startsWith("image/")) {
            const error = new Error("請選擇圖片檔案");
            error.code = "host-payment/invalid-file";
            throw error;
        }

        const qrRef = ref(storage, `payment-qr/${user.uid}/${type}`);
        await uploadBytes(qrRef, imageFile, { contentType: imageFile.type });
        const downloadUrl = await getDownloadURL(qrRef);
        const canonicalField = type === "payme" ? "paymeQR" : "fpsQR";
        const legacyField = type === "payme" ? "hostPaymeQrUrl" : "hostFpsQrUrl";

        await updateDoc(doc(db, "users", user.uid), {
            [canonicalField]: downloadUrl,
            [legacyField]: downloadUrl,
            hostPaymentUpdatedAt: serverTimestamp()
        });

        const userSnap = await getDoc(doc(db, "users", user.uid));
        const mapped = mapHostPaymentSettings(userSnap.exists() ? userSnap.data() : {});
        if (type === "payme") {
            mapped.paymeQrUrl = downloadUrl;
        } else {
            mapped.fpsQrUrl = downloadUrl;
        }
        await syncHostPublicPayment(user.uid, mapped);

        return downloadUrl;
    } catch (err) {
        console.error("上傳場主收款碼失敗:", err);
        throw err;
    }
};

window.dbSaveHostFpsId = async function dbSaveHostFpsId(fpsId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再儲存 WhatsApp 號碼");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const trimmedFpsId = (fpsId || "").trim();
        await updateDoc(doc(db, "users", user.uid), {
            hostFpsId: trimmedFpsId,
            fpsId: trimmedFpsId,
            hostPaymentUpdatedAt: serverTimestamp()
        });

        const userSnap = await getDoc(doc(db, "users", user.uid));
        const mapped = mapHostPaymentSettings(userSnap.exists() ? userSnap.data() : {});
        mapped.fpsId = trimmedFpsId;
        await syncHostPublicPayment(user.uid, mapped);

        return true;
    } catch (err) {
        console.error("儲存 WhatsApp 號碼失敗:", err);
        throw err;
    }
};

async function deleteStorageObjectIfExists(path) {
    try {
        await deleteObject(ref(storage, path));
    } catch (err) {
        if (err?.code !== "storage/object-not-found") {
            console.warn(`刪除 Storage 檔案失敗 (${path}):`, err);
        }
    }
}

async function deleteUserStorageAssets(uid) {
    if (!uid) return;
    await Promise.all([
        deleteStorageObjectIfExists(`avatars/${uid}`),
        deleteStorageObjectIfExists(`payment-qr/${uid}/payme`),
        deleteStorageObjectIfExists(`payment-qr/${uid}/fps`)
    ]);
}

async function deleteUserHostedActivities(uid) {
    if (!uid) return;
    const hostedSnap = await getDocs(query(
        collection(db, "activities"),
        where("hostUid", "==", uid)
    ));
    await Promise.all(hostedSnap.docs.map(docSnap => deleteDoc(docSnap.ref)));
}

async function deleteUserFirestoreData(uid) {
    if (!uid) return;
    try {
        await deleteDoc(doc(db, "users", uid, "attendance", "recent"));
    } catch (err) {
        console.warn("刪除出席紀錄失敗（可能不存在）:", err);
    }
    try {
        await deleteDoc(doc(db, "hostPublicPayment", uid));
    } catch (err) {
        console.warn("刪除公開收款設定失敗（可能不存在）:", err);
    }
    await deleteDoc(doc(db, "users", uid));
}

window.dbDeleteUserAccount = async function dbDeleteUserAccount() {
    const user = auth.currentUser;
    if (!user) {
        const error = new Error("請先登入後再注銷帳號");
        error.code = "auth/not-signed-in";
        throw error;
    }

    const uid = user.uid;

    await reauthenticateWithPopup(user, provider);
    await deleteUserHostedActivities(uid);
    await deleteUserFirestoreData(uid);
    await deleteUserStorageAssets(uid);
    await deleteUser(user);
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
