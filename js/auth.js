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
    Timestamp,
    limit
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

function resolveSessionStartsAtTimestamp(activityData = {}) {
    const raw = activityData.sessionStartsAt;
    if (raw && typeof raw.toDate === "function") return raw;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return Timestamp.fromDate(raw);
    }
    if (typeof window.buildActivityStartAtDate === "function") {
        const startsAt = window.buildActivityStartAtDate(
            activityData.playDate,
            activityData.startTime || activityData.startTimeValue
        );
        if (startsAt && !Number.isNaN(startsAt.getTime())) {
            return Timestamp.fromDate(startsAt);
        }
    }
    return null;
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

const AVATAR_CHANGE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

function resolveAvatarUpdatedAtDate(raw) {
    if (!raw) return null;
    if (typeof raw.toDate === "function") return raw.toDate();
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildAvatarChangeStatus(avatarUpdatedAtRaw, now = new Date()) {
    const lastChangedAt = resolveAvatarUpdatedAtDate(avatarUpdatedAtRaw);
    if (!lastChangedAt) {
        return { canChange: true, nextChangeAt: null, hoursRemaining: 0 };
    }
    const nextChangeAt = new Date(lastChangedAt.getTime() + AVATAR_CHANGE_COOLDOWN_MS);
    const canChange = now.getTime() >= nextChangeAt.getTime();
    const hoursRemaining = canChange
        ? 0
        : Math.max(1, Math.ceil((nextChangeAt.getTime() - now.getTime()) / (60 * 60 * 1000)));
    return { canChange, nextChangeAt, hoursRemaining };
}

async function syncHostPublicProfile(uid, profile = {}) {
    if (!uid) return;
    const displayName = String(profile.displayName || "").trim();
    const photoURL = profile.photoURL || null;
    if (!displayName && !photoURL) return;

    await setDoc(doc(db, "hostPublicProfile", uid), {
        uid,
        displayName: displayName || "場主",
        photoURL,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

function buildActivityPublishPayload(activityData = {}, user) {
    const sessionStartsAt = resolveSessionStartsAtTimestamp(activityData);
    if (!sessionStartsAt) {
        const error = new Error("無法計算場次開始時間，請重新選擇開場日期與時間");
        error.code = "activity/missing-session-starts-at";
        throw error;
    }
    if (typeof window.isActivityStartInPast === "function"
        && window.isActivityStartInPast({
            playDate: activityData.playDate,
            startTime: activityData.startTime || activityData.startTimeValue
        })) {
        const error = new Error("不能發佈已過去的時段");
        error.code = "activity/start-in-past";
        throw error;
    }

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
        hostDisplayName: String(
            activityData.hostDisplayName
            || user.displayName
            || user.email?.split("@")[0]
            || "場主"
        ),
        hostPhotoURL: activityData.hostPhotoURL || user.photoURL || null,
        isPrivate: activityData.isPrivate === true,
        audience: String(activityData.audience || (activityData.isPrivate ? "private" : "public")),
        communityId: String(activityData.communityId || ""),
        communityName: String(activityData.communityName || ""),
        region: String(activityData.region || ""),
        venue: String(activityData.venue || ""),
        playDate: String(activityData.playDate || ""),
        playTime: String(activityData.playTime || ""),
        startTime: String(activityData.startTime || ""),
        endTime: String(activityData.endTime || ""),
        sessionStartsAt,
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
        guestParticipants: {},
        allowGuestSignupBy: normalizeAllowGuestSignupBy(activityData.allowGuestSignupBy),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}

const GUEST_SIGNUP_MAX_PER_USER = 2;
const GUEST_DISPLAY_NAME_MAX = 20;
const GUEST_NOTE_MAX = 80;

function normalizeAllowGuestSignupBy(value) {
    const raw = String(value || "none");
    if (raw === "host_only" || raw === "host_and_participants") return raw;
    return "none";
}

function getGuestParticipantsMap(activity = {}) {
    const guests = activity.guestParticipants;
    return guests && typeof guests === "object" ? guests : {};
}

function generateGuestParticipantId() {
    return `guest_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function countGuestsAddedBy(activity = {}, uid = "") {
    return Object.values(getGuestParticipantsMap(activity))
        .filter(guest => guest?.addedByUid === uid).length;
}

function normalizeGuestDisplayName(raw) {
    const name = String(raw || "").trim();
    if (!name) {
        const error = new Error("請輸入球友名稱");
        error.code = "guest/invalid-name";
        throw error;
    }
    if (name.length > GUEST_DISPLAY_NAME_MAX) {
        const error = new Error(`名稱不能超過 ${GUEST_DISPLAY_NAME_MAX} 字`);
        error.code = "guest/invalid-name";
        throw error;
    }
    return name;
}

function assertGuestNameNotDuplicate(activity = {}, displayName = "") {
    const normalized = displayName.trim().toLowerCase();
    const guests = Object.values(getGuestParticipantsMap(activity));
    const participants = activity.participants && typeof activity.participants === "object"
        ? activity.participants
        : {};
    const participantUids = Array.isArray(activity.participantUids) ? activity.participantUids : [];

    const existingNames = [
        ...guests.map(guest => String(guest.displayName || "").trim().toLowerCase()),
        ...participantUids.map(uid => String(participants[uid]?.displayName || "").trim().toLowerCase())
    ].filter(Boolean);

    if (existingNames.includes(normalized)) {
        const error = new Error("此場次已有同名球友");
        error.code = "guest/duplicate-name";
        throw error;
    }
}

function assertUserCanAddGuest(activity = {}, user) {
    const mode = normalizeAllowGuestSignupBy(activity.allowGuestSignupBy);
    if (mode === "none") {
        const error = new Error("此場次未開放代報名");
        error.code = "guest/not-allowed";
        throw error;
    }
    if (activity.hostUid === user.uid) return;
    if (mode === "host_and_participants") {
        const participantUids = Array.isArray(activity.participantUids) ? activity.participantUids : [];
        if (participantUids.includes(user.uid)) return;
        const error = new Error("只有已批准參加者可以代報名");
        error.code = "guest/not-participant";
        throw error;
    }
    const error = new Error("只有場主可以代報名");
    error.code = "guest/not-host";
    throw error;
}

function getGuestAddedByRole(activity = {}, user) {
    return activity.hostUid === user.uid ? "host" : "participant";
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

async function openAuthModal() {
    const modal = byId("auth-modal");
    if (!modal) return;
    const errorEl = byId("auth-error");
    if (errorEl) {
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
    }
    if (typeof window.openMujiOverlay === "function") {
        await window.openMujiOverlay(modal);
    } else {
        modal.classList.remove("hidden");
    }
}

window.openAuthModal = openAuthModal;

function showWelcomeMessage(user) {
    if (!user) return;
    const name = user.displayName || user.email?.split("@")[0] || "VibeUp 波友";
    const welcome = typeof window.t === "function"
        ? window.t("auth.welcomeBack", { name })
        : `歡迎回來，${name}！\n一起在同城搵玩伴、開波上浮 vibe 🏸`;
    alert(welcome);
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

    const profilePayload = {
        ...buildUserProfile(user),
        ...(userSnap.exists() ? {} : { createdAt: now })
    };

    await setDoc(userRef, profilePayload, { merge: true });

    await syncHostPublicProfile(user.uid, {
        displayName: profilePayload.displayName,
        photoURL: profilePayload.photoURL
    });

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

function normalizeSlotTimeValue(timeValue) {
    const raw = String(timeValue || "").trim();
    if (!raw) return "";
    if (raw.includes(":")) {
        const [hours, minutes] = raw.split(":").map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return raw;
        return `${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}`;
    }
    if (/^\d{3,4}$/.test(raw)) {
        return raw.padStart(4, "0");
    }
    return raw;
}

window.activityMatchesDuplicateSlot = function activityMatchesDuplicateSlot(activity = {}, criteria = {}) {
    return String(activity.playDate || "").trim() === String(criteria.playDate || "").trim()
        && String(activity.region || "").trim() === String(criteria.region || "").trim()
        && String(activity.venue || "").trim() === String(criteria.venue || "").trim()
        && normalizeSlotTimeValue(activity.startTime) === normalizeSlotTimeValue(criteria.startTime)
        && normalizeSlotTimeValue(activity.endTime) === normalizeSlotTimeValue(criteria.endTime)
        && String(activity.skillLevel || "").trim() === String(criteria.skillLevel || "").trim();
};

window.dbCountHostDuplicateActivities = async function dbCountHostDuplicateActivities(criteria = {}) {
    const user = auth.currentUser;
    if (!user) return 0;

    const playDate = String(criteria.playDate || "").trim();
    if (!playDate) return 0;

    const mapMatching = docs => filterActiveActivities(docs
        .map(docSnap => ({ ...docSnap.data(), firestoreId: docSnap.id }))
        .filter(activity => activity.hostUid === user.uid)
        .filter(activity => activityMatchesDuplicateSlot(activity, criteria)));

    try {
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("hostUid", "==", user.uid),
            where("playDate", "==", playDate)
        ));
        return mapMatching(snapshot.docs).length;
    } catch (err) {
        console.error("讀取重複場次失敗，改為查詢場主全部場次:", err);
        try {
            const snapshot = await getDocs(query(
                collection(db, "activities"),
                where("hostUid", "==", user.uid)
            ));
            return mapMatching(snapshot.docs).length;
        } catch (fallbackErr) {
            console.error("讀取場主場次失敗:", fallbackErr);
            return 0;
        }
    }
};

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
            const [userSnap, publicSnap] = await Promise.all([
                getDoc(doc(db, "users", uid)),
                getDoc(doc(db, "hostPublicProfile", uid))
            ]);
            const data = userSnap.exists() ? userSnap.data() : {};
            const publicData = publicSnap.exists() ? publicSnap.data() : {};
            const sessionCount = await resolveHostSessionCount(uid, data.hostSessionCount);
            const complaintCount = Number(data.hostComplaintCount) || 0;
            const attendance = attendanceRates[uid] || mapAttendanceRate(data.recentAttendance);
            result[uid] = {
                displayName: publicData.displayName || data.displayName || "場主",
                photoURL: publicData.photoURL || data.photoURL || null,
                sessionCount,
                complaintCount,
                tier: resolveHostTier(sessionCount, complaintCount),
                attendance
            };
        } catch (err) {
            console.error(`讀取場主檔案 ${uid} 失敗:`, err);
            result[uid] = {
                displayName: "場主",
                photoURL: null,
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
            .filter(activity => !activity.isPrivate)
            .filter(activity => activity.audience !== "community" && !activity.communityId);
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

function isCommunityRestrictedActivityData(activity = {}) {
    if (activity.audience === "community") return true;
    return Boolean(String(activity.communityId || "").trim());
}

async function assertUserCanJoinCommunityActivity(user, activity = {}) {
    if (!isCommunityRestrictedActivityData(activity)) return;
    const communityId = String(activity.communityId || "").trim();
    if (!communityId) {
        const error = new Error("此場次僅限社群成員參加");
        error.code = "activity/community-only";
        throw error;
    }
    const memberSnap = await getDoc(doc(db, "communities", communityId, "members", user.uid));
    if (!memberSnap.exists()) {
        const error = new Error("此場次僅限社群成員參加，請先加入該社群");
        error.code = "activity/community-only";
        throw error;
    }
}

window.isCommunityRestrictedActivityData = isCommunityRestrictedActivityData;
window.assertUserCanJoinCommunityActivity = assertUserCanJoinCommunityActivity;

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
        const activitySnap = await getDoc(activityRef);
        if (!activitySnap.exists()) {
            const error = new Error("場次不存在");
            error.code = "activity/not-found";
            throw error;
        }
        await assertUserCanJoinCommunityActivity(user, activitySnap.data());

        return await runTransaction(db, async transaction => {
            const freshSnap = await transaction.get(activityRef);
            if (!freshSnap.exists()) {
                const error = new Error("場次不存在");
                error.code = "activity/not-found";
                throw error;
            }

            const activity = freshSnap.data();
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
        const activitySnap = await getDoc(activityRef);
        if (!activitySnap.exists()) {
            const error = new Error("場次不存在");
            error.code = "activity/not-found";
            throw error;
        }
        await assertUserCanJoinCommunityActivity(user, activitySnap.data());

        return await runTransaction(db, async transaction => {
            const freshSnap = await transaction.get(activityRef);
            if (!freshSnap.exists()) {
                const error = new Error("場次不存在");
                error.code = "activity/not-found";
                throw error;
            }

            const activity = freshSnap.data();
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

window.dbAddGuestParticipant = async function dbAddGuestParticipant(activityId, payload = {}) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再代報名");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const id = String(activityId || "").trim();
        if (!id) {
            const error = new Error("缺少 Firestore 場次 ID");
            error.code = "activity/missing-firestore-id";
            throw error;
        }

        const displayName = normalizeGuestDisplayName(payload.displayName);
        const note = String(payload.note || "").trim().slice(0, GUEST_NOTE_MAX);
        const activityRef = doc(db, "activities", id);
        const activitySnap = await getDoc(activityRef);
        if (!activitySnap.exists()) {
            const error = new Error("場次不存在");
            error.code = "activity/not-found";
            throw error;
        }

        const activity = activitySnap.data();
        assertActivityNotEnded(activity);
        assertUserCanAddGuest(activity, user);

        if (countGuestsAddedBy(activity, user.uid) >= GUEST_SIGNUP_MAX_PER_USER) {
            const error = new Error(`每場最多代報 ${GUEST_SIGNUP_MAX_PER_USER} 人`);
            error.code = "guest/limit-reached";
            throw error;
        }

        const currentPlayers = Number(activity.currentPlayers ?? 0);
        const maxSlots = Number(activity.maxSlots ?? 6);
        if (currentPlayers >= maxSlots) {
            const error = new Error("場次已滿額");
            error.code = "activity/full";
            throw error;
        }

        assertGuestNameNotDuplicate(activity, displayName);

        const guestId = generateGuestParticipantId();
        const guestEntry = {
            id: guestId,
            displayName,
            note,
            addedByUid: user.uid,
            addedByRole: getGuestAddedByRole(activity, user),
            status: "reserved",
            createdAt: serverTimestamp()
        };

        await updateDoc(activityRef, {
            [`guestParticipants.${guestId}`]: guestEntry,
            currentPlayers: currentPlayers + 1,
            updatedAt: serverTimestamp()
        });

        return { guestId, guest: guestEntry };
    } catch (err) {
        console.error("代報名失敗:", err);
        throw err;
    }
};

window.dbRemoveGuestParticipant = async function dbRemoveGuestParticipant(activityId, guestId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const id = String(activityId || "").trim();
        const guestKey = String(guestId || "").trim();
        if (!id || !guestKey) {
            const error = new Error("缺少場次或代報名資料");
            error.code = "guest/missing-id";
            throw error;
        }

        const activityRef = doc(db, "activities", id);
        const activitySnap = await getDoc(activityRef);
        if (!activitySnap.exists()) {
            const error = new Error("場次不存在");
            error.code = "activity/not-found";
            throw error;
        }

        const activity = activitySnap.data();
        const guests = getGuestParticipantsMap(activity);
        const guest = guests[guestKey];
        if (!guest) {
            const error = new Error("找不到此代報名球友");
            error.code = "guest/not-found";
            throw error;
        }

        if (activity.hostUid !== user.uid && guest.addedByUid !== user.uid) {
            const error = new Error("你只能移除自己代報的球友");
            error.code = "guest/not-owner";
            throw error;
        }

        await updateDoc(activityRef, {
            [`guestParticipants.${guestKey}`]: deleteField(),
            currentPlayers: Math.max(0, Number(activity.currentPlayers ?? 0) - 1),
            updatedAt: serverTimestamp()
        });

        return { removed: true, guestId: guestKey };
    } catch (err) {
        console.error("移除代報名失敗:", err);
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

window.dbFetchMyHostedLobbyActivities = async function dbFetchMyHostedLobbyActivities() {
    const user = auth.currentUser;
    if (!user) return [];
    const todayISO = getTodayISO();

    const mapHosted = docs => docs
        .map(docSnap => ({ ...docSnap.data(), firestoreId: docSnap.id }))
        .filter(activity => activity.playDate && activity.playDate >= todayISO);

    try {
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("hostUid", "==", user.uid),
            where("playDate", ">=", todayISO),
            orderBy("playDate", "desc")
        ));
        return mapHosted(snapshot.docs);
    } catch (err) {
        console.error("讀取場主大廳場次失敗，改為前端篩選:", err);
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("hostUid", "==", user.uid)
        ));
        return mapHosted(snapshot.docs);
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
    try {
        await deleteDoc(doc(db, "hostPublicProfile", uid));
    } catch (err) {
        console.warn("刪除 hostPublicProfile 失敗:", err);
    }
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

window.dbFetchAvatarChangeStatus = async function dbFetchAvatarChangeStatus() {
    const user = auth.currentUser;
    if (!user) {
        return { canChange: false, nextChangeAt: null, hoursRemaining: 0 };
    }

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const avatarUpdatedAt = userSnap.exists() ? userSnap.data().avatarUpdatedAt : null;
    return buildAvatarChangeStatus(avatarUpdatedAt);
};

window.dbUpdateUserProfile = async function dbUpdateUserProfile(newName, imageFile) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再修改個人資料");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const existingData = userSnap.exists() ? userSnap.data() : {};

        let displayName;
        const trimmedName = (newName || "").trim();
        if (trimmedName) {
            if (typeof window.validateDisplayName !== "function") {
                const error = new Error("名字驗證服務暫時未連線，請稍後再試。");
                error.code = "profile/invalid-display-name";
                throw error;
            }
            const nameCheck = window.validateDisplayName(trimmedName);
            if (!nameCheck.ok) {
                const error = new Error(nameCheck.message);
                error.code = "profile/invalid-display-name";
                throw error;
            }
            displayName = nameCheck.value;
        } else {
            displayName = user.displayName || user.email?.split("@")[0] || "波友";
        }
        let photoURL = user.photoURL || existingData.photoURL || null;

        if (imageFile) {
            const cooldown = buildAvatarChangeStatus(existingData.avatarUpdatedAt);
            if (!cooldown.canChange) {
                const error = new Error(`頭像每 3 日只可更換一次，請約 ${cooldown.hoursRemaining} 小時後再試。`);
                error.code = "profile/avatar-cooldown";
                error.hoursRemaining = cooldown.hoursRemaining;
                error.nextChangeAt = cooldown.nextChangeAt;
                throw error;
            }

            const avatarRef = ref(storage, `avatars/${user.uid}`);
            await uploadBytes(avatarRef, imageFile);
            photoURL = await getDownloadURL(avatarRef);
        }

        await updateProfile(user, {
            displayName,
            photoURL
        });

        const userUpdate = {
            displayName,
            photoURL,
            updatedAt: serverTimestamp()
        };
        if (imageFile) {
            userUpdate.avatarUpdatedAt = serverTimestamp();
        }

        await updateDoc(userRef, userUpdate);

        await syncHostPublicProfile(user.uid, { displayName, photoURL });
        await syncUserDirectoryIfOptedIn(user.uid, { displayName, photoURL });

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

window.dbSubmitFeedback = async function dbSubmitFeedback(payload = {}) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再提交意見");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const message = String(payload.message || "").trim();
        if (message.length < 5 || message.length > 1000) {
            const error = new Error("意見內容須為 5 至 1000 字");
            error.code = "feedback/invalid-message";
            throw error;
        }

        await addDoc(collection(db, "feedback"), {
            uid: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            message,
            appVersion: String(payload.appVersion || ""),
            appBuild: payload.appBuild ?? null,
            page: String(payload.page || "settings"),
            userAgent: typeof navigator !== "undefined" ? String(navigator.userAgent || "") : "",
            createdAt: serverTimestamp()
        });

        return { submitted: true };
    } catch (err) {
        console.error("提交意見失敗:", err);
        throw err;
    }
};

function buildCommunityMemberProfile(user, role = "member") {
    const rawName = user.displayName || user.email?.split("@")[0] || "波友";
    const profile = {
        uid: user.uid,
        displayName: String(rawName).slice(0, 64),
        role,
        joinedAt: serverTimestamp()
    };
    if (user.photoURL) {
        profile.photoURL = user.photoURL;
    }
    return profile;
}

window.dbCreateCommunity = async function dbCreateCommunity(payload = {}) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再建立社群");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const name = String(payload.name || "").trim();
        const description = String(payload.description || "").trim().slice(0, 200);
        if (name.length < 1 || name.length > 40) {
            const error = new Error("社群名稱須為 1 至 40 字");
            error.code = "community/invalid-name";
            throw error;
        }

        let communityRef;
        try {
            communityRef = await addDoc(collection(db, "communities"), {
                name,
                description,
                ownerUid: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            err.communityStep = "create-community";
            throw err;
        }

        const memberProfile = buildCommunityMemberProfile(user, "owner");
        try {
            await setDoc(doc(db, "communities", communityRef.id, "members", user.uid), memberProfile);
        } catch (err) {
            err.communityStep = "create-member";
            throw err;
        }

        try {
            await setDoc(doc(db, "users", user.uid, "communityMemberships", communityRef.id), {
                communityId: communityRef.id,
                name,
                role: "owner",
                joinedAt: serverTimestamp()
            });
        } catch (err) {
            err.communityStep = "create-membership-index";
            throw err;
        }

        return {
            communityId: communityRef.id,
            name,
            description,
            role: "owner"
        };
    } catch (err) {
        console.error("建立社群失敗:", err);
        throw err;
    }
};

window.dbFetchCommunityById = async function dbFetchCommunityById(communityId) {
    try {
        const id = String(communityId || "").trim();
        if (!id) return null;
        const snap = await getDoc(doc(db, "communities", id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() };
    } catch (err) {
        console.error("讀取社群失敗:", err);
        throw err;
    }
};

window.dbListMyCommunities = async function dbListMyCommunities() {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const snap = await getDocs(collection(db, "users", user.uid, "communityMemberships"));
        return snap.docs
            .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
            .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-HK"));
    } catch (err) {
        console.error("讀取我的社群失敗:", err);
        throw err;
    }
};

window.dbFetchCommunityMembers = async function dbFetchCommunityMembers(communityId) {
    try {
        const id = String(communityId || "").trim();
        if (!id) return [];
        const snap = await getDocs(collection(db, "communities", id, "members"));
        const members = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const roleOrder = { owner: 0, admin: 1, member: 2 };
        return members.sort((a, b) => {
            const roleDiff = (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
            if (roleDiff !== 0) return roleDiff;
            return String(a.displayName || "").localeCompare(String(b.displayName || ""), "zh-HK");
        });
    } catch (err) {
        console.error("讀取社群成員失敗:", err);
        throw err;
    }
};

window.dbFetchCommunityActivities = async function dbFetchCommunityActivities(communityId) {
    try {
        const id = String(communityId || "").trim();
        if (!id) return [];

        const todayISO = getTodayISO();
        const snapshot = await getDocs(query(
            collection(db, "activities"),
            where("communityId", "==", id)
        ));
        const mapped = snapshot.docs
            .map(docSnap => ({
                ...docSnap.data(),
                firestoreId: docSnap.id
            }))
            .filter(activity => activity.playDate && activity.playDate >= todayISO);

        return filterActiveActivities(mapped).sort((a, b) => {
            const dateCompare = String(a.playDate || "").localeCompare(String(b.playDate || ""));
            if (dateCompare !== 0) return dateCompare;
            return String(a.startTime || "").localeCompare(String(b.startTime || ""));
        });
    } catch (err) {
        console.error("讀取社群場次失敗:", err);
        throw err;
    }
};

window.dbJoinCommunity = async function dbJoinCommunity(communityId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入後再加入社群");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const id = String(communityId || "").trim();
        if (!id) {
            const error = new Error("缺少社群 ID");
            error.code = "community/missing-id";
            throw error;
        }

        const communityRef = doc(db, "communities", id);
        const memberRef = doc(db, "communities", id, "members", user.uid);
        const membershipRef = doc(db, "users", user.uid, "communityMemberships", id);

        const communitySnap = await getDoc(communityRef);
        if (!communitySnap.exists()) {
            const error = new Error("社群不存在或連結已失效");
            error.code = "community/not-found";
            throw error;
        }

        const community = communitySnap.data();
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) {
            return { alreadyMember: true, communityId: id, name: community.name };
        }

        const memberProfile = buildCommunityMemberProfile(user, "member");
        await setDoc(memberRef, memberProfile);
        await setDoc(membershipRef, {
            communityId: id,
            name: community.name,
            role: "member",
            joinedAt: serverTimestamp()
        });

        return { joined: true, communityId: id, name: community.name };
    } catch (err) {
        console.error("加入社群失敗:", err);
        throw err;
    }
};

window.dbLeaveCommunity = async function dbLeaveCommunity(communityId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const id = String(communityId || "").trim();
        if (!id) {
            const error = new Error("缺少社群 ID");
            error.code = "community/missing-id";
            throw error;
        }

        const memberRef = doc(db, "communities", id, "members", user.uid);
        const membershipRef = doc(db, "users", user.uid, "communityMemberships", id);
        const memberSnap = await getDoc(memberRef);
        if (!memberSnap.exists()) {
            const error = new Error("你尚未加入此社群");
            error.code = "community/not-member";
            throw error;
        }
        if (memberSnap.data().role === "owner") {
            const error = new Error("建立者請先轉移或刪除社群後再離開");
            error.code = "community/owner-cannot-leave";
            throw error;
        }

        await deleteDoc(memberRef);
        await deleteDoc(membershipRef);
        return { left: true };
    } catch (err) {
        console.error("離開社群失敗:", err);
        throw err;
    }
};

window.dbKickCommunityMember = async function dbKickCommunityMember(communityId, targetUid) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const id = String(communityId || "").trim();
        const target = String(targetUid || "").trim();
        if (!id || !target) {
            const error = new Error("缺少社群或成員資訊");
            error.code = "community/missing-id";
            throw error;
        }
        if (target === user.uid) {
            const error = new Error("無法移除自己，請使用離開社群");
            error.code = "community/cannot-kick-self";
            throw error;
        }

        const communityRef = doc(db, "communities", id);
        const communitySnap = await getDoc(communityRef);
        if (!communitySnap.exists()) {
            const error = new Error("社群不存在");
            error.code = "community/not-found";
            throw error;
        }
        if (communitySnap.data().ownerUid !== user.uid) {
            const error = new Error("只有建立者可以移除成員");
            error.code = "community/not-owner";
            throw error;
        }

        const memberRef = doc(db, "communities", id, "members", target);
        const memberSnap = await getDoc(memberRef);
        if (!memberSnap.exists()) {
            const error = new Error("對方不是此社群的成員");
            error.code = "community/not-member";
            throw error;
        }
        if (memberSnap.data().role === "owner") {
            const error = new Error("無法移除社群建立者");
            error.code = "community/cannot-kick-owner";
            throw error;
        }

        const membershipRef = doc(db, "users", target, "communityMemberships", id);
        const inviteRef = doc(db, "users", target, "communityInvites", id);

        await deleteDoc(memberRef);
        try {
            await deleteDoc(membershipRef);
        } catch (membershipErr) {
            console.warn("移除成員索引失敗（可能已不存在）:", membershipErr);
        }
        try {
            await deleteDoc(inviteRef);
        } catch (inviteErr) {
            console.warn("清除待處理邀請失敗（可能已不存在）:", inviteErr);
        }

        return { kicked: true, displayName: memberSnap.data().displayName || "" };
    } catch (err) {
        console.error("移除成員失敗:", err);
        throw err;
    }
};

window.dbDeleteCommunity = async function dbDeleteCommunity(communityId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error("請先登入");
            error.code = "auth/not-signed-in";
            throw error;
        }

        const id = String(communityId || "").trim();
        const communityRef = doc(db, "communities", id);
        const communitySnap = await getDoc(communityRef);
        if (!communitySnap.exists()) {
            const error = new Error("社群不存在");
            error.code = "community/not-found";
            throw error;
        }
        if (communitySnap.data().ownerUid !== user.uid) {
            const error = new Error("只有建立者可以刪除社群");
            error.code = "community/not-owner";
            throw error;
        }

        const membersSnap = await getDocs(collection(db, "communities", id, "members"));
        if (membersSnap.size > 1) {
            const error = new Error("社群仍有其他成員，請先請成員離開後再刪除");
            error.code = "community/has-members";
            throw error;
        }

        await deleteDoc(doc(db, "communities", id, "members", user.uid));
        await deleteDoc(doc(db, "users", user.uid, "communityMemberships", id));
        await deleteDoc(communityRef);
        return { deleted: true };
    } catch (err) {
        console.error("刪除社群失敗:", err);
        throw err;
    }
};

async function syncUserDirectoryIfOptedIn(uid, { displayName, photoURL } = {}) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    const optIn = userSnap.exists() && userSnap.data().directoryOptIn === true;
    const directoryRef = doc(db, "userDirectory", uid);
    if (!optIn) {
        const directorySnap = await getDoc(directoryRef);
        if (directorySnap.exists()) {
            await deleteDoc(directoryRef);
        }
        return;
    }
    const name = String(displayName || userSnap.data()?.displayName || "").trim();
    if (!name) return;
    await setDoc(directoryRef, {
        uid,
        displayName: name,
        displayNameLower: name.toLowerCase(),
        photoURL: photoURL || userSnap.data()?.photoURL || null,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

window.dbGetUserDirectoryOptIn = async function dbGetUserDirectoryOptIn() {
    const user = auth.currentUser;
    if (!user) return false;
    const userSnap = await getDoc(doc(db, "users", user.uid));
    return userSnap.exists() && userSnap.data().directoryOptIn === true;
};

window.dbSetUserDirectoryOptIn = async function dbSetUserDirectoryOptIn(optIn) {
    const user = auth.currentUser;
    if (!user) {
        const error = new Error("請先登入");
        error.code = "auth/not-signed-in";
        throw error;
    }
    const enabled = optIn === true;
    await setDoc(doc(db, "users", user.uid), {
        directoryOptIn: enabled,
        updatedAt: serverTimestamp()
    }, { merge: true });
    const displayName = user.displayName || user.email?.split("@")[0] || "波友";
    await syncUserDirectoryIfOptedIn(user.uid, {
        displayName,
        photoURL: user.photoURL || null
    });
    return { directoryOptIn: enabled };
};

window.dbSearchUserDirectory = async function dbSearchUserDirectory(rawQuery, maxResults = 20) {
    const user = auth.currentUser;
    if (!user) {
        const error = new Error("請先登入");
        error.code = "auth/not-signed-in";
        throw error;
    }
    const q = String(rawQuery || "").trim().toLowerCase();
    if (q.length < 2) return [];

    const snapshot = await getDocs(query(
        collection(db, "userDirectory"),
        where("displayNameLower", ">=", q),
        where("displayNameLower", "<=", `${q}\uf8ff`),
        limit(Math.min(maxResults, 20))
    ));

    return snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(entry => entry.id !== user.uid);
};

window.dbSendCommunityInvite = async function dbSendCommunityInvite(communityId, targetUid) {
    const user = auth.currentUser;
    if (!user) {
        const error = new Error("請先登入");
        error.code = "auth/not-signed-in";
        throw error;
    }

    const id = String(communityId || "").trim();
    const target = String(targetUid || "").trim();
    if (!id || !target) {
        const error = new Error("缺少社群或邀請對象");
        error.code = "community-invite/missing-target";
        throw error;
    }
    if (target === user.uid) {
        const error = new Error("不能邀請自己");
        error.code = "community-invite/self";
        throw error;
    }

    const communityRef = doc(db, "communities", id);
    const communitySnap = await getDoc(communityRef);
    if (!communitySnap.exists()) {
        const error = new Error("社群不存在");
        error.code = "community/not-found";
        throw error;
    }
    const community = communitySnap.data();
    if (community.ownerUid !== user.uid) {
        const error = new Error("只有建立者可以搜尋邀請");
        error.code = "community-invite/not-owner";
        throw error;
    }

    const targetMemberSnap = await getDoc(doc(db, "communities", id, "members", target));
    if (targetMemberSnap.exists()) {
        const error = new Error("對方已是社群成員");
        error.code = "community-invite/already-member";
        throw error;
    }

    const targetDirectorySnap = await getDoc(doc(db, "userDirectory", target));
    if (!targetDirectorySnap.exists()) {
        const error = new Error("對方未開啟可被搜尋邀請");
        error.code = "community-invite/not-searchable";
        throw error;
    }

    const inviteRef = doc(db, "users", target, "communityInvites", id);
    await setDoc(inviteRef, {
        communityId: id,
        communityName: community.name || "",
        invitedByUid: user.uid,
        invitedByName: user.displayName || user.email?.split("@")[0] || "波友",
        createdAt: serverTimestamp()
    });

    return { invited: true, communityId: id, targetUid: target };
};

window.dbListMyCommunityInvites = async function dbListMyCommunityInvites() {
    const user = auth.currentUser;
    if (!user) return [];
    const snap = await getDocs(collection(db, "users", user.uid, "communityInvites"));
    return snap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => {
            const aMs = a.createdAt?.toMillis?.() || 0;
            const bMs = b.createdAt?.toMillis?.() || 0;
            return bMs - aMs;
        });
};

window.dbAcceptCommunityInvite = async function dbAcceptCommunityInvite(communityId) {
    const id = String(communityId || "").trim();
    if (!id) {
        const error = new Error("缺少社群 ID");
        error.code = "community/missing-id";
        throw error;
    }
    const result = await window.dbJoinCommunity(id);
    const user = auth.currentUser;
    if (user) {
        await deleteDoc(doc(db, "users", user.uid, "communityInvites", id));
    }
    return result;
};

window.dbDeclineCommunityInvite = async function dbDeclineCommunityInvite(communityId) {
    const user = auth.currentUser;
    if (!user) {
        const error = new Error("請先登入");
        error.code = "auth/not-signed-in";
        throw error;
    }
    const id = String(communityId || "").trim();
    if (!id) {
        const error = new Error("缺少社群 ID");
        error.code = "community/missing-id";
        throw error;
    }
    await deleteDoc(doc(db, "users", user.uid, "communityInvites", id));
    return { declined: true };
};

window.firebaseDbBridgeReady = true;
window.dispatchEvent(new CustomEvent("firebase-db-bridge-ready"));
