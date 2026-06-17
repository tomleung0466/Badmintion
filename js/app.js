/**
 * app.js — VibeUp | 波友：核心狀態、啟動畫面、登入、分頁切換、滾筒選擇器底層
 * 須於 matches.js 之前載入；透過全域變數 / 函數與 matches.js 閉環協作。
 */

/* ---------- 日期工具 ---------- */
function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateDisplay(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (typeof window.t === 'function') {
        return window.t('date.display', {
            year: y,
            month: parseInt(m, 10),
            day: parseInt(d, 10)
        });
    }
    return `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

function parseDateISO(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

const todayISO = formatDateISO(new Date());
const tomorrowISO = formatDateISO(addDays(new Date(), 1));

function parseActivityTimeValue(timeValue) {
    const raw = String(timeValue || '').trim();
    if (!raw) return null;
    if (raw.includes(':')) {
        const [hours, minutes] = raw.split(':').map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
        return { hours, minutes };
    }
    if (/^\d{3,4}$/.test(raw)) {
        const padded = raw.padStart(4, '0');
        return {
            hours: parseInt(padded.slice(0, 2), 10),
            minutes: parseInt(padded.slice(2, 4), 10)
        };
    }
    return null;
}

const ACTIVITY_JOIN_CUTOFF_MINUTES = 30;

function extractStartTimeFromPlayTime(playTime) {
    const match = String(playTime || '').match(/^(\d{3,4})/);
    return match ? match[1] : '';
}

function getActivityStartTimeValue(activity) {
    return activity?.startTime || extractStartTimeFromPlayTime(activity?.playTime || activity?.displayTimeSlot);
}

function buildActivityStartAtDate(playDate, startTimeValue) {
    if (!playDate) return null;
    const parsed = parseActivityTimeValue(startTimeValue);
    if (!parsed) return null;
    const [y, m, d] = playDate.split('-').map(Number);
    return new Date(y, m - 1, d, parsed.hours, parsed.minutes, 0, 0);
}

function buildActivityEndsAtDate(playDate, startTimeValue) {
    const startAt = buildActivityStartAtDate(playDate, startTimeValue);
    if (!startAt || Number.isNaN(startAt.getTime())) return null;
    return new Date(startAt.getTime() + ACTIVITY_JOIN_CUTOFF_MINUTES * 60 * 1000);
}

function isActivityStartInPast(activity, now = new Date()) {
    if (!activity?.playDate) return false;
    if (activity.playDate < formatDateISO(now)) return true;
    const startAt = buildActivityStartAtDate(activity.playDate, getActivityStartTimeValue(activity));
    if (!startAt || Number.isNaN(startAt.getTime())) return false;
    return startAt.getTime() <= now.getTime();
}

function getActivityEndsAtDate(activity) {
    if (!activity) return null;
    const fromStart = buildActivityEndsAtDate(activity.playDate, getActivityStartTimeValue(activity));
    if (fromStart && !Number.isNaN(fromStart.getTime())) return fromStart;
    if (activity.sessionEndsAt) {
        if (typeof activity.sessionEndsAt.toDate === 'function') {
            return activity.sessionEndsAt.toDate();
        }
        const fromStored = new Date(activity.sessionEndsAt);
        if (!Number.isNaN(fromStored.getTime())) return fromStored;
    }
    if (activity.playDate) {
        const [y, m, d] = activity.playDate.split('-').map(Number);
        return new Date(y, m - 1, d, 23, 59, 59, 999);
    }
    return null;
}

function isActivityEnded(activity, now = new Date()) {
    if (!activity) return true;
    const endsAt = getActivityEndsAtDate(activity);
    if (!endsAt || Number.isNaN(endsAt.getTime())) {
        const playDate = activity.playDate;
        return playDate ? playDate < formatDateISO(now) : false;
    }
    return endsAt.getTime() <= now.getTime();
}

function isActivityActive(activity, now = new Date()) {
    return !isActivityEnded(activity, now);
}

window.parseActivityTimeValue = parseActivityTimeValue;
window.buildActivityStartAtDate = buildActivityStartAtDate;
window.buildActivityEndsAtDate = buildActivityEndsAtDate;
window.getActivityEndsAtDate = getActivityEndsAtDate;
window.isActivityStartInPast = isActivityStartInPast;
window.isActivityEnded = isActivityEnded;
window.isActivityActive = isActivityActive;

/* ---------- 地區 / 篩選狀態 ---------- */
const HONG_KONG_18_DISTRICTS = [
    '中西區', '東區', '南區', '灣仔區',
    '油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區',
    '荃灣區', '葵青區', '屯門區', '元朗區', '北區',
    '大埔區', '沙田區', '西貢區', '離島區'
];

let macroFilter = 'all';
let districtFilter = null;
let pickerScrollListenerAttached = false;

const MACRO_REGION_VALUES = ['港島', '九龍', '新界'];

const DISTRICT_TO_MACRO = {
    '中西區': '港島', '東區': '港島', '南區': '港島', '灣仔區': '港島',
    '油尖旺區': '九龍', '深水埗區': '九龍', '黃大仙區': '九龍', '九龍城區': '九龍', '觀塘區': '九龍',
    '葵青區': '新界', '荃灣區': '新界', '屯門區': '新界', '元朗區': '新界',
    '沙田區': '新界', '大埔區': '新界', '北區': '新界', '西貢區': '新界', '離島區': '新界'
};

function getMatchMacroRegion(match) {
    const region = match?.region;
    if (!region) return '';
    if (MACRO_REGION_VALUES.includes(region)) return region;
    return DISTRICT_TO_MACRO[region] || '';
}

function getRegionFilterLabel(filter) {
    if (typeof window.t === 'function') {
        if (filter === 'all') return window.t('region.all');
        if (filter === '港島') return window.t('region.hkIslandShort');
        if (filter === '九龍') return window.t('region.kowloon');
        if (filter === '新界') return window.t('region.newTerritories');
        if (filter && typeof window.translatePlaceName === 'function') {
            return window.translatePlaceName(filter);
        }
    }
    if (filter === 'all') return '全部';
    if (filter === '港島') return '香港';
    if (MACRO_REGION_VALUES.includes(filter)) return filter;
    return filter;
}

function isMacroRegionFilter(filter) {
    return MACRO_REGION_VALUES.includes(filter);
}

function isDistrictFilter(filter) {
    return filter !== 'all' && !isMacroRegionFilter(filter);
}

function getDistrictsForMacro(macro) {
    if (macro === 'all') return [...HONG_KONG_18_DISTRICTS];
    return HONG_KONG_18_DISTRICTS.filter(d => DISTRICT_TO_MACRO[d] === macro);
}

function syncMacroFromDistrict() {
    if (!districtFilter) return;
    const macro = DISTRICT_TO_MACRO[districtFilter];
    if (macro) macroFilter = macro;
}

function clearDistrictIfOutsideMacro() {
    if (!districtFilter || macroFilter === 'all') return;
    if (DISTRICT_TO_MACRO[districtFilter] !== macroFilter) {
        districtFilter = null;
    }
}

/* ---------- 登入用家（Demo） ---------- */
const CURRENT_USER_STORAGE_KEY = 'uber_badminton_user';
const CURRENT_USER_NAME_STORAGE_KEY = 'uber_badminton_username';
const USER_PROFILES_STORAGE_KEY = 'uber_badminton_user_profiles';

let currentUser = { name: '', creditPoints: 105, photoURL: null };
function getActiveUserProfileKey(authUser) {
    if (authUser && authUser.uid) return authUser.uid;
    return 'guest';
}

function readUserProfiles() {
    try {
        return JSON.parse(localStorage.getItem(USER_PROFILES_STORAGE_KEY)) || {};
    } catch (_) {
        return {};
    }
}

function writeUserProfiles(profiles) {
    localStorage.setItem(USER_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

function loadCurrentUser() {
    const authUser = window.firebaseAuthUser || null;
    if (!authUser) {
        currentUser = { name: '', creditPoints: 105, photoURL: null };
        return;
    }

    const profileKey = getActiveUserProfileKey(authUser);
    const profiles = readUserProfiles();
    const savedProfile = profiles[profileKey];

    currentUser = { name: '', creditPoints: 105, photoURL: null };
    if (savedProfile && typeof savedProfile === 'object') {
        currentUser = { ...currentUser, ...savedProfile };
    } else {
        const saved = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    currentUser = { ...currentUser, ...parsed };
                }
            } catch (_) { /* ignore */ }
        }
    }

    const legacyName = localStorage.getItem(CURRENT_USER_NAME_STORAGE_KEY);
    if (legacyName && legacyName.trim() && legacyName.trim() !== '我') {
        currentUser.name = legacyName.trim();
    }
    if (authUser.email) {
        const fallbackPrefix = authUser.email.split('@')[0] || '波友';
        currentUser.name = authUser.displayName || `波友_${fallbackPrefix}`;
        currentUser.photoURL = authUser.photoURL || null;
    }
    saveCurrentUser();
}

function saveCurrentUser() {
    const authUser = window.firebaseAuthUser || null;
    if (!authUser) return;
    const profileKey = getActiveUserProfileKey(authUser);
    const profiles = readUserProfiles();
    profiles[profileKey] = { ...currentUser };
    writeUserProfiles(profiles);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser));
    localStorage.setItem(CURRENT_USER_NAME_STORAGE_KEY, currentUser.name);
}

function getCurrentUserName() {
    if (!window.firebaseAuthUser) return '';
    const name = String(currentUser.name || window.firebaseAuthUser.displayName || '').trim();
    return name;
}

function getSettingsDisplayName() {
    if (!window.firebaseAuthUser) {
        return window.t ? window.t('settings.guestName') : '尚未登入';
    }
    const raw = getCurrentUserName().replace(/^波友_/, '').trim();
    return raw || (window.t ? window.t('settings.guestName') : '尚未登入');
}

async function handleAuthUserChange(user) {
    loadCurrentUser();
    updateProfileUI();
    if (typeof window.loadActivitiesFromCloud === 'function') {
        await window.loadActivitiesFromCloud();
    }
    if (typeof window.renderMatches === 'function') {
        await window.renderMatches();
    }
    if (typeof window.renderMyActivities === 'function') {
        window.renderMyActivities();
    }
    if (user && typeof window.refreshHostPaymentSettings === 'function') {
        window.refreshHostPaymentSettings();
    }
}

window.handleAuthUserChange = handleAuthUserChange;

function awardCreditPointsForUid(uid, amount = 0, fallbackName = '波友') {
    if (!uid || !Number.isFinite(amount) || amount === 0) return;
    const profiles = readUserProfiles();
    const profile = profiles[uid] && typeof profiles[uid] === 'object'
        ? profiles[uid]
        : { name: fallbackName, creditPoints: 105 };
    profile.creditPoints = Number(profile.creditPoints ?? 105) + amount;
    profiles[uid] = profile;
    writeUserProfiles(profiles);

    if (window.firebaseAuthUser && window.firebaseAuthUser.uid === uid) {
        currentUser = { ...currentUser, ...profile };
        saveCurrentUser();
        updateProfileUI();
    }
}

window.awardCreditPointsForUid = awardCreditPointsForUid;

function setProfileAvatarUploading(uploading) {
    const overlay = document.getElementById('profile-avatar-overlay');
    if (!overlay) return;
    overlay.classList.toggle('is-visible', !!uploading);
    overlay.setAttribute('aria-hidden', uploading ? 'false' : 'true');
}

function applyProfileAvatarDisplay(src, { isLocal = false } = {}) {
    const avatarEl = document.getElementById('profile-avatar');
    const editPreview = document.getElementById('profile-avatar-edit-preview');
    if (!avatarEl) return;

    if (src) {
        avatarEl.textContent = '';
        avatarEl.style.backgroundImage = `url("${src}")`;
        avatarEl.classList.remove('is-guest');
        avatarEl.dataset.previewSource = isLocal ? 'local' : 'remote';

        if (editPreview && typeof window.renderPreviewContainer === 'function') {
            window.renderPreviewContainer(editPreview, src, { uploading: false, alt: '大頭照預覽' });
            editPreview.classList.remove('hidden');
            editPreview.classList.add('is-visible');
            editPreview.setAttribute('aria-hidden', 'false');
        }
    } else {
        const isLoggedIn = !!window.firebaseAuthUser;
        const ch = isLoggedIn
            ? (getSettingsDisplayName().charAt(0) || '友')
            : '+';
        avatarEl.textContent = ch;
        avatarEl.style.backgroundImage = '';
        avatarEl.classList.toggle('is-guest', !isLoggedIn);
        delete avatarEl.dataset.previewSource;

        if (editPreview) {
            editPreview.innerHTML = '';
            editPreview.classList.add('hidden');
            editPreview.classList.remove('is-visible');
            editPreview.setAttribute('aria-hidden', 'true');
        }
    }
}

window.setProfileAvatarLocalPreview = function setProfileAvatarLocalPreview(src, { uploading = false } = {}) {
    applyProfileAvatarDisplay(src, { isLocal: true });
    setProfileAvatarUploading(uploading);
};

window.clearProfileAvatarLocalPreview = function clearProfileAvatarLocalPreview() {
    setProfileAvatarUploading(false);
    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl?.dataset.previewSource === 'local') {
        applyProfileAvatarDisplay(currentUser.photoURL || null);
    }
};

function updateProfileUI() {
    const isLoggedIn = !!window.firebaseAuthUser;
    const nameEl = document.getElementById('profile-display-name');
    const creditEl = document.getElementById('profile-credit-points');
    const kickerEl = document.querySelector('.settings-card--account .settings-member-kicker');
    const accountCard = document.querySelector('.settings-card--account');

    if (nameEl) nameEl.textContent = getSettingsDisplayName();
    if (creditEl) creditEl.textContent = '3／3';
    if (kickerEl) {
        kickerEl.textContent = isLoggedIn
            ? (window.t ? window.t('settings.memberKicker') : '羽毛球場次會員')
            : (window.t ? window.t('settings.guestKicker') : '訪客');
    }
    accountCard?.classList.toggle('is-guest', !isLoggedIn);

    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl?.dataset.previewSource === 'local') return;

    setProfileAvatarUploading(false);
    applyProfileAvatarDisplay(isLoggedIn ? (currentUser.photoURL || null) : null);
    refreshDirectoryOptInUI();
}

async function updateAvatarCooldownHint() {
    const hint = document.getElementById('profile-avatar-cooldown-hint');
    if (!hint) return;

    if (!window.firebaseAuthUid || typeof window.dbFetchAvatarChangeStatus !== 'function') {
        hint.textContent = '每 3 日可更換一次頭像';
        return;
    }

    try {
        const status = await window.dbFetchAvatarChangeStatus();
        if (status.canChange) {
            hint.textContent = typeof window.t === 'function'
                ? window.t('settings.avatarCooldownDefault')
                : '每 3 日可更換一次頭像';
            return;
        }
        hint.textContent = typeof window.t === 'function'
            ? window.t('settings.avatarCooldownWait', { hours: status.hoursRemaining })
            : `頭像每 3 日只可更換一次，約 ${status.hoursRemaining} 小時後可再換`;
    } catch (err) {
        console.warn('讀取頭像冷卻狀態失敗:', err);
        hint.textContent = '每 3 日可更換一次頭像';
    }
}

function showProfileEditPanel() {
    if (!window.firebaseAuthUid) {
        if (typeof window.openAuthModal === 'function') {
            window.openAuthModal();
        } else {
            alert(window.t ? window.t('alert.loginPlus1') : '請先登入 +1。');
        }
        return;
    }
    const panel = document.getElementById('profile-edit-panel');
    const hostPanel = document.getElementById('host-settings-panel');
    const hostBtn = document.getElementById('edit-host-payment-btn');
    const profileBtn = document.getElementById('edit-profile-btn');
    const nameInput = document.getElementById('profile-name-input');
    if (nameInput) nameInput.value = getSettingsDisplayName();
    if (hostPanel) hostPanel.classList.add('hidden');
    if (hostBtn) hostBtn.classList.remove('is-active-profile-action');
    if (profileBtn) profileBtn.classList.add('is-active-profile-action');
    if (panel) panel.classList.toggle('hidden');
    if (panel && !panel.classList.contains('hidden')) {
        updateAvatarCooldownHint();
    }
}

async function saveProfileChanges() {
    const saveBtn = document.getElementById('save-profile-btn');
    const nameInput = document.getElementById('profile-name-input');
    const avatarInput = document.getElementById('profile-avatar-input');
    const rawName = nameInput ? nameInput.value : '';
    const imageFile =
        (typeof window.getPendingProfileAvatarFile === 'function' && window.getPendingProfileAvatarFile()) ||
        (avatarInput && avatarInput.files ? avatarInput.files[0] : null);

    if (!window.firebaseAuthUid) {
        alert(window.t ? window.t('alert.loginVibeUp') : '請先登入 VibeUp 波友。');
        return;
    }
    if (!rawName.trim() && !imageFile) {
        alert(window.t ? window.t('alert.nameOrAvatar') : '請輸入新名字或選擇新頭像。');
        return;
    }

    let newName = '';
    if (rawName.trim()) {
        if (typeof window.validateDisplayName !== 'function') {
            alert(window.t ? window.t('alert.nameValidationOffline') : '名字驗證服務暫時未連線，請稍後再試。');
            return;
        }
        const nameCheck = window.validateDisplayName(rawName);
        if (!nameCheck.ok) {
            alert(nameCheck.message);
            return;
        }
        newName = nameCheck.value;
    }
    if (typeof window.dbUpdateUserProfile !== 'function') {
        alert(window.t ? window.t('alert.profileOffline') : '個人資料服務暫時未連線，請稍後再試。');
        return;
    }

    const originalText = saveBtn ? saveBtn.textContent : '';
    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = window.t ? window.t('settings.saving') : '儲存中...';
        }
        if (imageFile) setProfileAvatarUploading(true);
        await window.dbUpdateUserProfile(newName, imageFile);
        loadCurrentUser();
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl) delete avatarEl.dataset.previewSource;
        setProfileAvatarUploading(false);
        updateProfileUI();
        if (avatarInput) avatarInput.value = '';
        if (typeof window.clearPendingProfileAvatarFile === 'function') {
            window.clearPendingProfileAvatarFile();
        }
        document.getElementById('profile-edit-panel')?.classList.add('hidden');
        updateAvatarCooldownHint();
        if (window.firebaseAuthUid && typeof window.invalidateHostProfileCache === 'function') {
            window.invalidateHostProfileCache(window.firebaseAuthUid);
        }
        if (typeof window.renderMatches === 'function') {
            window.renderMatches();
        }
        alert(window.t ? window.t('alert.profileSaved') : '修改成功');
    } catch (err) {
        console.error('修改個人資料失敗:', err);
        setProfileAvatarUploading(false);
        if (err?.code === 'profile/avatar-cooldown') {
            alert(err.message || (window.t ? window.t('settings.avatarCooldownDefault') : '頭像每 3 日只可更換一次。'));
            updateAvatarCooldownHint();
            return;
        }
        if (err?.code === 'profile/invalid-display-name') {
            alert(err.message || (window.t ? window.t('displayName.invalidChars') : '名字格式不符合要求。'));
            return;
        }
        const code = err?.code ? `（${err.code}）` : '';
        alert(window.t ? window.t('alert.profileSaveFailed', { code }) : `修改失敗${code}，請檢查 Firebase Storage / Firestore 權限設定。`);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText || (window.t ? window.t('settings.saveChanges') : '儲存修改');
        }
    }
}

async function deleteUserAccount() {
    if (!window.firebaseAuthUid) {
        alert(window.t ? window.t('alert.loginPlus1') : '請先登入 +1。');
        return;
    }
    if (typeof window.dbDeleteUserAccount !== 'function') {
        alert(window.t ? window.t('alert.accountOffline') : '帳戶服務暫時未連線，請稍後再試。');
        return;
    }

    const confirmed = confirm(
        window.t ? window.t('alert.deleteAccountConfirm') : '確定要注銷帳號？\n\n此操作無法復原。你的個人資料、收款設定及發佈的場次將被永久刪除。'
    );
    if (!confirmed) return;

    const deleteBtn = document.getElementById('delete-account-btn');
    const originalText = deleteBtn ? deleteBtn.textContent : '';
    try {
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.textContent = window.t ? window.t('alert.deletingAccount') : '注銷中...';
        }
        await window.dbDeleteUserAccount();
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
        localStorage.removeItem(CURRENT_USER_NAME_STORAGE_KEY);
        document.getElementById('profile-edit-panel')?.classList.add('hidden');
        updateProfileUI();
        alert(window.t ? window.t('alert.accountDeleted') : '帳號已注銷。');
    } catch (err) {
        console.error('注銷帳號失敗:', err);
        const code = err?.code ? `（${err.code}）` : '';
        let message = window.t ? window.t('alert.deleteAccountFailed', { code }) : `注銷失敗${code}，請稍後再試。`;
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
            message = window.t ? window.t('alert.deleteAccountCancelled') : '你已取消驗證，帳號未被注銷。';
        } else if (err?.code === 'auth/requires-recent-login') {
            message = window.t ? window.t('alert.accountReauth') : '為保障帳戶安全，請先登出再重新登入，然後再試一次注銷。';
        }
        alert(message);
    } finally {
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = originalText || (window.t ? window.t('settings.deleteAccount') : '注銷帳號');
        }
    }
}

function ensureCopyFeedbackSpan(button) {
    if (!button) return null;
    let span = button.querySelector('.copy-feedback-text');
    if (!span) {
        span = document.createElement('span');
        span.className = 'copy-feedback-text';
        span.textContent = button.textContent.trim();
        button.textContent = '';
        button.classList.add('copy-feedback-btn');
        button.appendChild(span);
    }
    return span;
}

window.runCopyButtonFeedback = function runCopyButtonFeedback(button, options = {}) {
    const span = ensureCopyFeedbackSpan(button);
    if (!span) return Promise.resolve();

    const originalText = options.originalText || span.dataset.originalText || span.textContent.trim();
    const successText = options.successText || (window.t ? window.t('alert.copied') : '✓ 已複製');
    const holdMs = options.holdMs ?? 1500;
    const fadeOutMs = options.fadeOutMs ?? 200;

    if (!span.dataset.originalText) {
        span.dataset.originalText = originalText;
    }
    if (!span.dataset.copyWidthLocked) {
        span.style.minWidth = `${Math.ceil(span.getBoundingClientRect().width)}px`;
        span.dataset.copyWidthLocked = '1';
    }

    span.textContent = successText;
    span.classList.remove('copy-feedback--fade-out');
    span.classList.add('copy-feedback--fade-in');

    return new Promise(resolve => {
        setTimeout(() => {
            span.classList.remove('copy-feedback--fade-in');
            span.classList.add('copy-feedback--fade-out');
            setTimeout(() => {
                span.textContent = originalText;
                span.classList.remove('copy-feedback--fade-out');
                resolve();
            }, fadeOutMs);
        }, holdMs);
    });
};

function bindProfileEditUI() {
    document.getElementById('edit-profile-btn')?.addEventListener('click', showProfileEditPanel);
    document.getElementById('save-profile-btn')?.addEventListener('click', saveProfileChanges);
    document.getElementById('delete-account-btn')?.addEventListener('click', deleteUserAccount);
    if (typeof window.bindHostSettingsUI === 'function') {
        window.bindHostSettingsUI();
    }
}

function getAppVersionInfo() {
    return window.APP_VERSION && typeof window.APP_VERSION === 'object'
        ? window.APP_VERSION
        : { version: '—', build: '', changelog: [] };
}

function updateSettingsVersionLabel() {
    const label = document.getElementById('settings-version-label');
    if (!label) return;
    const info = getAppVersionInfo();
    label.textContent = info.version ? `v${info.version}` : '—';
}

function renderVersionChangelog() {
    const list = document.getElementById('version-changelog-list');
    const current = document.getElementById('version-modal-current');
    if (!list) return;

    const info = getAppVersionInfo();
    if (current) {
        const buildLabel = info.build
            ? (window.t ? window.t('settings.versionBuild', { build: info.build }) : `（Build ${info.build}）`)
            : '';
        current.textContent = window.t
            ? window.t('settings.versionCurrent', { version: info.version || '—', build: buildLabel })
            : `目前版本 v${info.version || '—'}${buildLabel}`;
    }

    const entries = Array.isArray(info.changelog) ? info.changelog : [];
    if (!entries.length) {
        list.innerHTML = `<p class="version-changelog-date">${window.t ? window.t('settings.versionEmpty') : '暫無更新紀錄'}</p>`;
        return;
    }

    const nowLabel = window.t ? window.t('settings.versionNow') : ' · 目前';
    const translateItem = (item) => {
        if (window.getAppLocale && window.getAppLocale() === 'zh-Hans' && typeof window.translatePlaceName === 'function') {
            return window.translatePlaceName(item);
        }
        return item;
    };

    list.innerHTML = entries.map(entry => {
        const items = Array.isArray(entry.items) ? entry.items : [];
        const isCurrent = entry.version === info.version;
        return `
            <section class="version-changelog-entry${isCurrent ? ' is-current' : ''}">
                <div class="version-changelog-head">
                    <span class="version-changelog-version">v${escapeHtml(entry.version || '—')}${isCurrent ? escapeHtml(nowLabel) : ''}</span>
                    <span class="version-changelog-date">${escapeHtml(entry.date || '')}</span>
                </div>
                <ul class="version-changelog-items">
                    ${items.map(item => `<li>${escapeHtml(translateItem(item))}</li>`).join('')}
                </ul>
            </section>
        `;
    }).join('');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function openVersionModal() {
    renderVersionChangelog();
    const modal = document.getElementById('version-modal');
    if (!modal) return;
    if (typeof window.openMujiOverlay === 'function') {
        await window.openMujiOverlay(modal);
    } else {
        modal.classList.remove('hidden');
    }
}

async function closeVersionModal() {
    const modal = document.getElementById('version-modal');
    if (!modal) return;
    if (typeof window.closeMujiOverlay === 'function') {
        await window.closeMujiOverlay(modal);
    } else {
        modal.classList.add('hidden');
    }
}

async function openLanguageModal() {
    const modal = document.getElementById('language-modal');
    if (!modal) return;
    if (typeof window.openMujiOverlay === 'function') {
        await window.openMujiOverlay(modal);
    } else {
        modal.classList.remove('hidden');
    }
}

async function closeLanguageModal() {
    const modal = document.getElementById('language-modal');
    if (!modal) return;
    if (typeof window.closeMujiOverlay === 'function') {
        await window.closeMujiOverlay(modal);
    } else {
        modal.classList.add('hidden');
    }
}

window.closeLanguageModal = closeLanguageModal;

async function openFontSizeModal() {
    const modal = document.getElementById('font-size-modal');
    if (!modal) return;
    if (typeof window.openMujiOverlay === 'function') {
        await window.openMujiOverlay(modal);
    } else {
        modal.classList.remove('hidden');
    }
}

async function closeFontSizeModal() {
    const modal = document.getElementById('font-size-modal');
    if (!modal) return;
    if (typeof window.closeMujiOverlay === 'function') {
        await window.closeMujiOverlay(modal);
    } else {
        modal.classList.add('hidden');
    }
}

window.closeFontSizeModal = closeFontSizeModal;

async function openAppearanceModal() {
    const modal = document.getElementById('appearance-modal');
    if (!modal) return;
    if (typeof window.openMujiOverlay === 'function') {
        await window.openMujiOverlay(modal);
    } else {
        modal.classList.remove('hidden');
    }
}

async function closeAppearanceModal() {
    const modal = document.getElementById('appearance-modal');
    if (!modal) return;
    if (typeof window.closeMujiOverlay === 'function') {
        await window.closeMujiOverlay(modal);
    } else {
        modal.classList.add('hidden');
    }
}

window.closeAppearanceModal = closeAppearanceModal;

function setFeedbackStatus(message, tone = '') {
    const statusEl = document.getElementById('feedback-status');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.remove('hidden', 'is-success', 'is-error');
    if (!message) {
        statusEl.classList.add('hidden');
        return;
    }
    if (tone) statusEl.classList.add(tone === 'success' ? 'is-success' : 'is-error');
}

async function openFeedbackModal() {
    if (!window.firebaseAuthUid) {
        alert(window.t ? window.t('alert.loginPlus1Feedback') : '請先登入 +1，然後再提交意見。');
        return;
    }

    const input = document.getElementById('feedback-message-input');
    const submitBtn = document.getElementById('feedback-submit-btn');
    if (input) input.value = '';
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = window.t ? window.t('feedback.submit') : '送出意見';
    }
    setFeedbackStatus('');

    const modal = document.getElementById('feedback-modal');
    if (!modal) return;
    if (typeof window.openMujiOverlay === 'function') {
        await window.openMujiOverlay(modal);
    } else {
        modal.classList.remove('hidden');
    }
}

async function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (!modal) return;
    if (typeof window.closeMujiOverlay === 'function') {
        await window.closeMujiOverlay(modal);
    } else {
        modal.classList.add('hidden');
    }
}

async function submitFeedback() {
    const input = document.getElementById('feedback-message-input');
    const submitBtn = document.getElementById('feedback-submit-btn');
    const message = input ? input.value.trim() : '';

    if (!window.firebaseAuthUid) {
        alert(window.t ? window.t('alert.loginPlus1Feedback') : '請先登入 +1，然後再提交意見。');
        return;
    }
    if (message.length < 5) {
        setFeedbackStatus(window.t ? window.t('alert.feedbackMin') : '請至少輸入 5 個字。', 'error');
        input?.focus();
        return;
    }
    if (typeof window.dbSubmitFeedback !== 'function') {
        setFeedbackStatus(window.t ? window.t('alert.feedbackOffline') : '意見服務暫時未連線，請稍後再試。', 'error');
        return;
    }

    const originalText = submitBtn ? submitBtn.textContent : '';
    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = window.t ? window.t('feedback.submitting') : '送出中...';
        }
        setFeedbackStatus('');

        const info = getAppVersionInfo();
        await window.dbSubmitFeedback({
            message,
            appVersion: info.version || '',
            appBuild: info.build || null,
            page: 'settings'
        });

        setFeedbackStatus(window.t ? window.t('alert.feedbackSuccess') : '多謝你的意見，我們會盡快跟進。', 'success');
        if (input) input.value = '';
        window.setTimeout(async () => {
            await closeFeedbackModal();
        }, 900);
    } catch (err) {
        console.error('提交意見失敗:', err);
        if (err?.code === 'permission-denied') {
            setFeedbackStatus(window.t ? window.t('alert.feedbackDenied') : '提交被拒絕：請確認已登入，並在 Firebase 發佈最新規則。', 'error');
            return;
        }
        setFeedbackStatus(window.t ? window.t('alert.feedbackFailed') : '送出失敗，請稍後再試。', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText || (window.t ? window.t('feedback.submit') : '送出意見');
        }
    }
}

async function refreshDirectoryOptInUI() {
    const checkbox = document.getElementById('settings-directory-opt-in');
    if (!checkbox) return;
    if (!window.firebaseAuthUid || typeof window.dbGetUserDirectoryOptIn !== 'function') {
        checkbox.checked = false;
        checkbox.disabled = true;
        return;
    }
    checkbox.disabled = false;
    try {
        checkbox.checked = await window.dbGetUserDirectoryOptIn();
    } catch (err) {
        console.error('讀取搜尋邀請設定失敗:', err);
        checkbox.checked = false;
    }
}

async function handleDirectoryOptInChange(event) {
    const enabled = event.target?.checked === true;
    if (!window.firebaseAuthUid) {
        event.target.checked = false;
        alert(window.t ? window.t('community.loginRequired') : '請先登入');
        return;
    }
    if (typeof window.dbSetUserDirectoryOptIn !== 'function') {
        event.target.checked = !enabled;
        alert(window.t ? window.t('alert.profileOffline') : '個人資料服務暫時未連線，請稍後再試。');
        return;
    }
    try {
        await window.dbSetUserDirectoryOptIn(enabled);
    } catch (err) {
        console.error('更新搜尋邀請設定失敗:', err);
        event.target.checked = !enabled;
        alert(err?.message || (window.t ? window.t('directory.optInFailed') : '更新設定失敗'));
    }
}

function bindSettingsPageUI() {
    updateSettingsVersionLabel();
    renderVersionChangelog();
    if (typeof window.updateSettingsLanguageLabel === 'function') {
        window.updateSettingsLanguageLabel();
    }
    if (typeof window.updateSettingsFontSizeLabel === 'function') {
        window.updateSettingsFontSizeLabel();
    }
    if (typeof window.updateSettingsAppearanceLabel === 'function') {
        window.updateSettingsAppearanceLabel();
    }
    document.getElementById('settings-language-btn')?.addEventListener('click', openLanguageModal);
    document.getElementById('settings-appearance-btn')?.addEventListener('click', openAppearanceModal);
    document.getElementById('settings-font-size-btn')?.addEventListener('click', openFontSizeModal);
    document.getElementById('settings-version-btn')?.addEventListener('click', openVersionModal);
    document.getElementById('settings-feedback-btn')?.addEventListener('click', openFeedbackModal);
    document.getElementById('settings-directory-opt-in')?.addEventListener('change', handleDirectoryOptInChange);
    refreshDirectoryOptInUI();
    document.getElementById('language-modal-close')?.addEventListener('click', closeLanguageModal);
    document.getElementById('appearance-modal-close')?.addEventListener('click', closeAppearanceModal);
    document.getElementById('font-size-modal-close')?.addEventListener('click', closeFontSizeModal);
    document.getElementById('version-modal-close')?.addEventListener('click', closeVersionModal);
    document.getElementById('feedback-submit-btn')?.addEventListener('click', submitFeedback);
    document.getElementById('feedback-cancel-btn')?.addEventListener('click', closeFeedbackModal);
    document.getElementById('language-modal')?.addEventListener('click', event => {
        if (event.target.id === 'language-modal' || event.target.classList.contains('muji-overlay__backdrop')) {
            closeLanguageModal();
        }
    });
    document.getElementById('appearance-modal')?.addEventListener('click', event => {
        if (event.target.id === 'appearance-modal' || event.target.classList.contains('muji-overlay__backdrop')) {
            closeAppearanceModal();
        }
    });
    document.getElementById('font-size-modal')?.addEventListener('click', event => {
        if (event.target.id === 'font-size-modal' || event.target.classList.contains('muji-overlay__backdrop')) {
            closeFontSizeModal();
        }
    });
    document.getElementById('version-modal')?.addEventListener('click', event => {
        if (event.target.id === 'version-modal' || event.target.classList.contains('muji-overlay__backdrop')) {
            closeVersionModal();
        }
    });
    document.getElementById('feedback-modal')?.addEventListener('click', event => {
        if (event.target.id === 'feedback-modal' || event.target.classList.contains('muji-overlay__backdrop')) {
            closeFeedbackModal();
        }
    });
    window.addEventListener('localechange', () => {
        updateSettingsVersionLabel();
        renderVersionChangelog();
    });
}

/* ---------- 滾筒選擇器底層 ---------- */
function updateWheelHighlight(scrollerId, itemClass) {
    const scroller = document.getElementById(scrollerId);
    const items = scroller.querySelectorAll('.' + itemClass);
    const centerY = scroller.getBoundingClientRect().top + scroller.clientHeight / 2;
    let closest = null;
    let minDist = Infinity;

    items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - centerY);
        item.classList.remove('text-gray-800', 'font-medium', 'text-base');
        item.classList.add('text-gray-400');
        if (dist < minDist) {
            minDist = dist;
            closest = item;
        }
    });

    if (closest) {
        closest.classList.remove('text-gray-400');
        closest.classList.add('text-gray-800', 'font-medium', 'text-base');
    }
}

function getWheelSelection(scrollerId, itemClass, fallback) {
    const scroller = document.getElementById(scrollerId);
    const items = scroller.querySelectorAll('.' + itemClass);
    if (!items.length) return fallback;

    const centerY = scroller.getBoundingClientRect().top + scroller.clientHeight / 2;
    let closest = items[0];
    let minDist = Infinity;

    items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - centerY);
        if (dist < minDist) {
            minDist = dist;
            closest = item;
        }
    });

    return closest ? closest.dataset.val : fallback;
}

function scrollWheelToValue(scrollerId, itemClass, value) {
    const scroller = document.getElementById(scrollerId);
    const target = scroller.querySelector(`.${itemClass}[data-val="${CSS.escape(value)}"]`) || scroller.querySelector('.' + itemClass);
    if (!target) return;

    const offset = target.offsetTop - (scroller.clientHeight - target.offsetHeight) / 2;
    scroller.scrollTop = offset;
    updateWheelHighlight(scrollerId, itemClass);
}

function updatePickerHighlight() {
    updateWheelHighlight('picker-scroller', 'wheel-item');
}

function getPickerSelection() {
    return getWheelSelection('picker-scroller', 'wheel-item', 'all');
}

function scrollPickerToValue(value) {
    scrollWheelToValue('picker-scroller', 'wheel-item', value);
}

window.getLobbyFilterState = function getLobbyFilterState() {
    return {
        macroFilter,
        districtFilter,
        hasActiveRegionFilter: !!(districtFilter || macroFilter !== 'all')
    };
};

function getActiveFilterLabel() {
    if (districtFilter) {
        return typeof window.translatePlaceName === 'function'
            ? window.translatePlaceName(districtFilter)
            : districtFilter;
    }
    if (macroFilter !== 'all') return getRegionFilterLabel(macroFilter);
    return window.t ? window.t('region.all') : '全部';
}

function updateDistrictPickerLabel() {
    const label = document.getElementById('current-region-text');
    if (!label) return;

    if (districtFilter) {
        label.textContent = typeof window.translatePlaceName === 'function'
            ? window.translatePlaceName(districtFilter)
            : districtFilter;
        return;
    }

    if (macroFilter !== 'all') {
        label.textContent = window.t
            ? window.t('region.pickDistrict', { region: getRegionFilterLabel(macroFilter) })
            : `選擇${getRegionFilterLabel(macroFilter)}分區`;
        return;
    }

    label.textContent = window.t ? window.t('region.allDistricts') : '全港十八區';
}

function updateDistrictPickerButtonState() {
    const btn = document.getElementById('district-picker-btn');
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('district-picker-btn--disabled');
    btn.setAttribute('aria-disabled', 'false');
}

function updateCapsuleActiveState() {
    document.querySelectorAll('.region-filter-btn').forEach(btn => {
        const active = btn.dataset.filter === 'all'
            ? macroFilter === 'all'
            : macroFilter !== 'all' && btn.dataset.filter === macroFilter;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
}

function setRegionFilter(filter) {
    const next = filter || 'all';

    if (next === macroFilter && next !== 'all' && districtFilter) {
        districtFilter = null;
    } else {
        macroFilter = next;
        if (macroFilter === 'all') {
            districtFilter = null;
        } else {
            clearDistrictIfOutsideMacro();
        }
    }

    renderDistrictPickerScroller();
    updateCapsuleActiveState();
    updateDistrictPickerLabel();
    updateDistrictPickerButtonState();
    applyRegionFilter();
}

function alignLobbyRegionFilter(region) {
    const district = String(region || '').trim();
    if (!district) {
        setRegionFilter('all');
        return;
    }

    const macro = DISTRICT_TO_MACRO[district] || '';
    if (districtFilter && districtFilter !== district) {
        districtFilter = null;
    }

    if (!macro || macroFilter === 'all' || macroFilter === macro) {
        updateCapsuleActiveState();
        updateDistrictPickerLabel();
        updateDistrictPickerButtonState();
        applyRegionFilter();
        return;
    }

    setRegionFilter(macro);
}

window.alignLobbyRegionFilter = alignLobbyRegionFilter;

function shouldShowMatchCard(card) {
    if (card.getAttribute('data-host-own') === 'true') {
        return true;
    }

    const macroRegion = card.getAttribute('data-macro-region') || '';
    const district = card.getAttribute('data-district') || '';

    if (districtFilter) {
        return district === districtFilter;
    }
    if (macroFilter !== 'all') {
        return macroRegion === macroFilter;
    }
    return true;
}

function onMatchCardFilterLeaveEnd(event) {
    if (event.animationName !== 'matchCardFilterOut') return;
    const card = event.currentTarget;
    card.classList.remove('is-filter-leaving');
    card.classList.add('is-filter-collapsed', 'hidden');
    card.removeEventListener('animationend', onMatchCardFilterLeaveEnd);
}

function onMatchCardFilterEnterEnd(event) {
    if (event.animationName !== 'matchCardEnter') return;
    event.currentTarget.classList.remove('is-filter-entering');
    event.currentTarget.removeEventListener('animationend', onMatchCardFilterEnterEnd);
}

function setMatchCardFilterVisibility(card, show) {
    const collapsed = card.classList.contains('is-filter-collapsed');

    if (show) {
        if (collapsed) {
            card.classList.remove('is-filter-collapsed', 'hidden', 'is-filter-leaving');
            card.classList.add('is-filter-entering');
            card.addEventListener('animationend', onMatchCardFilterEnterEnd);
        }
        return;
    }

    if (!collapsed && !card.classList.contains('is-filter-leaving')) {
        card.classList.add('is-filter-leaving');
        card.addEventListener('animationend', onMatchCardFilterLeaveEnd);
    }
}

function applyRegionFilter() {
    const cards = document.querySelectorAll('#matches-list > .match-card, #invite-match-section .match-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const show = shouldShowMatchCard(card);
        setMatchCardFilterVisibility(card, show);
        if (show) visibleCount += 1;
    });

    const list = document.getElementById('matches-list');
    let emptyEl = document.getElementById('region-filter-empty');
    if (!emptyEl && list) {
        emptyEl = document.createElement('div');
        emptyEl.id = 'region-filter-empty';
        emptyEl.className = 'region-filter-empty hidden';
        list.appendChild(emptyEl);
    }

    if (emptyEl) {
        const hasCards = cards.length > 0;
        const hasActiveFilter = districtFilter || macroFilter !== 'all';
        const showEmpty = hasCards && visibleCount === 0 && hasActiveFilter;
        emptyEl.textContent = window.t
            ? window.t('match.emptyFilterRegion', { label: getActiveFilterLabel() })
            : `${getActiveFilterLabel()}暫時沒有開場。`;
        emptyEl.classList.toggle('hidden', !showEmpty);
    }

    document.querySelectorAll('.match-date-group').forEach(group => {
        let sibling = group.nextElementSibling;
        let hasVisibleCard = false;
        while (sibling) {
            if (sibling.classList.contains('match-date-group')) break;
            if (sibling.classList.contains('match-card')
                && !sibling.classList.contains('is-filter-collapsed')
                && !sibling.classList.contains('hidden')) {
                hasVisibleCard = true;
                break;
            }
            sibling = sibling.nextElementSibling;
        }
        group.classList.toggle('hidden', !hasVisibleCard);
    });
}

function getPickerScrollerTitle() {
    if (window.t) {
        if (macroFilter === 'all') return window.t('region.allDistricts');
        return window.t('region.macroDistricts', { region: getRegionFilterLabel(macroFilter) });
    }
    if (macroFilter === 'all') return '全港十八區';
    return `${getRegionFilterLabel(macroFilter)}分區`;
}

function renderDistrictPickerScroller() {
    const scroller = document.getElementById('picker-scroller');
    if (!scroller) return;

    const districts = getDistrictsForMacro(macroFilter);
    const translateLabel = (label) => (
        typeof window.translatePlaceName === 'function' ? window.translatePlaceName(label) : label
    );
    const allSessionsLabel = window.t ? window.t('region.allSessions') : '全港場次';
    const items = macroFilter === 'all'
        ? [{ val: 'all', label: allSessionsLabel }, ...districts.map(d => ({ val: d, label: translateLabel(d) }))]
        : districts.map(d => ({ val: d, label: translateLabel(d) }));

    scroller.innerHTML = items.map(({ val, label }) =>
        `<div class="wheel-item snap-center flex h-10 items-center justify-center text-sm font-medium text-gray-400" data-val="${val}">${label}</div>`
    ).join('');

    const title = document.getElementById('picker-scroller-title');
    if (title) title.textContent = getPickerScrollerTitle();
}

function getPickerScrollTarget() {
    const districts = getDistrictsForMacro(macroFilter);

    if (macroFilter !== 'all') {
        if (districtFilter && districts.includes(districtFilter)) return districtFilter;
        return districts[0] || 'all';
    }

    return districtFilter || 'all';
}

async function toggleScrollPicker(show) {
    const picker = document.getElementById('scroll-picker');
    if (!picker) return;

    if (show) {
        if (typeof window.openMujiOverlay === 'function') {
            await window.openMujiOverlay(picker);
        } else {
            picker.classList.remove('hidden');
        }
    } else if (typeof window.closeMujiOverlay === 'function') {
        await window.closeMujiOverlay(picker);
    } else {
        picker.classList.add('hidden');
    }
    const scroller = document.getElementById('picker-scroller');
    if (!scroller) return;

    if (show) {
        if (!pickerScrollListenerAttached) {
            scroller.addEventListener('scroll', updatePickerHighlight, { passive: true });
            pickerScrollListenerAttached = true;
        }
        renderDistrictPickerScroller();
        const scrollTarget = getPickerScrollTarget();
        requestAnimationFrame(() => scrollPickerToValue(scrollTarget));
    }
}

function confirmPickerRegion() {
    const selected = getPickerSelection();

    if (macroFilter === 'all') {
        if (selected === 'all') {
            districtFilter = null;
        } else {
            districtFilter = selected;
        }
    } else {
        districtFilter = selected;
        syncMacroFromDistrict();
    }

    updateCapsuleActiveState();
    updateDistrictPickerLabel();
    updateDistrictPickerButtonState();
    toggleScrollPicker(false);
    applyRegionFilter();
}

function initRegionFilter() {
    document.querySelectorAll('.region-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setRegionFilter(btn.dataset.filter || 'all');
        });
    });
    renderDistrictPickerScroller();
    updateDistrictPickerButtonState();
    setRegionFilter('all');
}

/* ---------- 分頁與啟動畫面（MUJI 毛玻璃路由過渡） ---------- */
const PAGE_IDS = ['match', 'market', 'coach', 'profile', 'settings', 'communities'];
let currentPageId = 'match';

function getCurrentAppPageId() {
    return currentPageId;
}

window.getCurrentAppPageId = getCurrentAppPageId;
let pageTransitionLock = false;

function getAppPageEl(pageId) {
    return document.getElementById(`page-${pageId}`);
}

function updatePageNavActive(pageId) {
    PAGE_IDS.forEach(id => {
        document.getElementById(`nav-${id}`)?.classList.toggle('text-black', id === pageId);
    });
}

function showAppPageInstant(pageId) {
    PAGE_IDS.forEach(id => {
        const el = getAppPageEl(id);
        if (!el) return;
        const active = id === pageId;
        el.classList.toggle('hidden', !active);
        el.classList.toggle('app-page--active', active);
        el.classList.remove('app-page--leaving', 'app-page--entering');
    });
    currentPageId = pageId;
}

function initInitialPageState() {
    const page = getAppPageEl('match');
    if (!page) return;
    if (typeof window.prefersReducedMotion === 'function' && window.prefersReducedMotion()) {
        page.classList.add('app-page--active');
        return;
    }
    page.classList.remove('app-page--active');
    page.classList.add('app-page--preenter');
}

async function playInitialPageEnter() {
    const page = getAppPageEl('match');
    if (!page) return;

    if (typeof window.prefersReducedMotion === 'function' && window.prefersReducedMotion()) {
        page.classList.add('app-page--active');
        return;
    }

    page.classList.remove('app-page--preenter');
    if (typeof window.playPageEnter === 'function') {
        await window.playPageEnter(page);
    } else {
        page.classList.add('app-page--active');
    }
}

async function switchPage(pageId, options = {}) {
    if (!PAGE_IDS.includes(pageId)) return;
    if (pageTransitionLock || pageId === currentPageId) return;

    const fromEl = getAppPageEl(currentPageId);
    const toEl = getAppPageEl(pageId);
    if (!toEl) return;

    const animate = options.animate !== false
        && typeof window.prefersReducedMotion === 'function'
        && !window.prefersReducedMotion();
    pageTransitionLock = true;
    updatePageNavActive(pageId);

    try {
        if (!animate || !fromEl || fromEl.classList.contains('hidden')) {
            showAppPageInstant(pageId);
        } else if (typeof window.playPageCrossfade === 'function') {
            currentPageId = pageId;
            await window.playPageCrossfade(fromEl, toEl);
        } else {
            showAppPageInstant(pageId);
        }

        if (pageId === 'profile' && typeof window.renderMyActivities === 'function') {
            window.renderMyActivities();
        }
        if (pageId === 'settings' && typeof window.refreshHostPaymentSettings === 'function') {
            window.refreshHostPaymentSettings();
        }
        if (pageId === 'communities' && typeof window.onCommunitiesPageOpen === 'function') {
            window.onCommunitiesPageOpen();
        }
    } finally {
        pageTransitionLock = false;
    }
}

window.switchPage = switchPage;

/* ---------- 發佈場次全頁（右入 · 左滑返回） ---------- */
const PUBLISH_TRANSITION_MS = 320;
const PUBLISH_DISMISS_RATIO = 0.42;
const PUBLISH_DISMISS_MIN = 120;
const PUBLISH_FLICK_VELOCITY = 0.85;
const PUBLISH_FLICK_MIN_DRAG = 90;
let publishOpen = false;
let publishTransitionLock = false;

function getPublishPageEl() {
    return document.getElementById('page-publish');
}

function isPublishPageOpen() {
    return publishOpen && Boolean(getPublishPageEl() && !getPublishPageEl().classList.contains('hidden'));
}

function ensurePublishPagePortaled() {
    const page = getPublishPageEl();
    if (!page || page.dataset.publishPortaled === '1') return;
    document.body.appendChild(page);
    page.dataset.publishPortaled = '1';
}

function resetPublishPageTransform() {
    const page = getPublishPageEl();
    if (!page) return;
    page.classList.remove('publish-page--dragging');
    page.style.transform = '';
}

function syncPublishPageViewport() {
    const page = getPublishPageEl();
    if (!page || !window.visualViewport) return;

    if (!isPublishPageOpen()) {
        page.style.top = '';
        page.style.height = '';
        return;
    }

    const viewport = window.visualViewport;
    page.style.top = `${viewport.offsetTop}px`;
    page.style.height = `${viewport.height}px`;
}

function waitPublishMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function openPublishPage() {
    if (publishTransitionLock || publishOpen) return;
    const page = getPublishPageEl();
    if (!page) return;

    ensurePublishPagePortaled();

    if (typeof window.resetPublishForm === 'function') {
        window.resetPublishForm();
    }
    if (typeof window.refreshPublishCommunities === 'function') {
        await window.refreshPublishCommunities();
    }

    publishTransitionLock = true;
    publishOpen = true;

    page.classList.remove('hidden', 'publish-page--leaving', 'publish-page--dragging');
    page.setAttribute('aria-hidden', 'false');
    resetPublishPageTransform();
    page.style.transform = 'translateX(100%)';
    syncPublishPageViewport();
    void page.offsetWidth;

    const reduced = typeof window.prefersReducedMotion === 'function' && window.prefersReducedMotion();
    if (reduced) {
        page.classList.add('publish-page--active');
        page.style.transform = '';
    } else {
        requestAnimationFrame(() => {
            page.classList.add('publish-page--active');
            page.style.transform = '';
        });
        await waitPublishMs(PUBLISH_TRANSITION_MS);
    }

    document.body.classList.add('publish-page-open');
    publishTransitionLock = false;
}

async function closePublishPage() {
    if (publishTransitionLock || !publishOpen) return;
    const page = getPublishPageEl();
    if (!page) return;

    publishTransitionLock = true;
    if (document.activeElement instanceof HTMLElement && page.contains(document.activeElement)) {
        document.activeElement.blur();
    }

    resetPublishPageTransform();
    page.classList.remove('publish-page--active', 'publish-page--dragging');
    page.classList.add('publish-page--leaving');

    const reduced = typeof window.prefersReducedMotion === 'function' && window.prefersReducedMotion();
    await waitPublishMs(reduced ? 0 : PUBLISH_TRANSITION_MS);

    page.classList.add('hidden');
    page.classList.remove('publish-page--leaving');
    page.style.transform = '';
    page.style.top = '';
    page.style.height = '';
    page.setAttribute('aria-hidden', 'true');
    publishOpen = false;
    document.body.classList.remove('publish-page-open');
    publishTransitionLock = false;
}

function bindPublishSwipeBack() {
    const page = getPublishPageEl();
    const edgeZone = page?.querySelector('[data-publish-edge-swipe]');
    if (!page || !edgeZone || page.dataset.publishSwipeBound === '1') return;

    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastTime = 0;
    let dragX = 0;
    let tracking = false;

    function applyRubberBand(rawX) {
        dragX = Math.max(0, rawX);
        const offset = dragX * 0.55;
        page.style.transform = offset > 0 ? `translateX(${offset}px)` : '';
    }

    edgeZone.addEventListener('touchstart', event => {
        if (!isPublishPageOpen()) return;

        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        lastX = startX;
        lastTime = event.timeStamp;
        dragX = 0;
        tracking = true;
        page.classList.add('publish-page--dragging');
    }, { passive: true });

    edgeZone.addEventListener('touchmove', event => {
        if (!tracking || !isPublishPageOpen()) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 12) return;
        if (deltaX <= 0) {
            applyRubberBand(0);
            return;
        }

        event.preventDefault();
        applyRubberBand(deltaX);
        lastX = touch.clientX;
        lastTime = event.timeStamp;
    }, { passive: false });

    edgeZone.addEventListener('touchend', async event => {
        if (!tracking) return;

        tracking = false;
        page.classList.remove('publish-page--dragging');

        if (dragX <= 0) {
            resetPublishPageTransform();
            page.classList.add('publish-page--active');
            return;
        }

        const pageWidth = page.offsetWidth || window.innerWidth;
        const dismissThreshold = Math.max(PUBLISH_DISMISS_MIN, pageWidth * PUBLISH_DISMISS_RATIO);
        const touch = event.changedTouches?.[0];
        const velocity = touch
            ? Math.max(0, (touch.clientX - lastX) / Math.max(16, event.timeStamp - lastTime))
            : 0;
        const shouldClose = dragX >= dismissThreshold
            || (dragX >= PUBLISH_FLICK_MIN_DRAG && velocity >= PUBLISH_FLICK_VELOCITY);

        if (shouldClose) {
            resetPublishPageTransform();
            await closePublishPage();
            return;
        }

        resetPublishPageTransform();
        page.classList.add('publish-page--active');
        dragX = 0;
    });

    edgeZone.addEventListener('touchcancel', () => {
        tracking = false;
        resetPublishPageTransform();
        page.classList.add('publish-page--active');
    });

    page.dataset.publishSwipeBound = '1';
}

function bindPublishViewportFix() {
    const page = getPublishPageEl();
    const body = page?.querySelector('.publish-page-body');
    if (!page || page.dataset.publishViewportBound === '1') return;

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', syncPublishPageViewport);
        window.visualViewport.addEventListener('scroll', syncPublishPageViewport);
    }

    body?.addEventListener('focusin', event => {
        if (!event.target.matches('input, textarea, select')) return;
        resetPublishPageTransform();
        syncPublishPageViewport();
        requestAnimationFrame(() => {
            event.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    });

    body?.addEventListener('focusout', () => {
        window.setTimeout(syncPublishPageViewport, 80);
    });

    page.dataset.publishViewportBound = '1';
}

function bindPublishPageUI() {
    ensurePublishPagePortaled();
    document.getElementById('publish-back-btn')?.addEventListener('click', () => closePublishPage());
    document.getElementById('publish-close-btn')?.addEventListener('click', () => closePublishPage());
    document.getElementById('publish-fab-btn')?.addEventListener('click', () => {
        if (isPublishPageOpen()) closePublishPage();
        else openPublishPage();
    });
    bindPublishSwipeBack();
    bindPublishViewportFix();
}

window.openPublishPage = openPublishPage;
window.closePublishPage = closePublishPage;
window.isPublishPageOpen = isPublishPageOpen;

const DISCLAIMER_ACK_KEY = 'plus1_disclaimer_ack';

function initDisclaimerModal() {
    const modal = document.getElementById('disclaimer-modal');
    const ackBtn = document.getElementById('disclaimer-ack-btn');
    if (!modal || !ackBtn) return;

    const dismiss = async () => {
        if (typeof window.closeMujiOverlay === 'function') {
            await window.closeMujiOverlay(modal);
        } else {
            modal.classList.add('hidden');
        }
        try {
            localStorage.setItem(DISCLAIMER_ACK_KEY, '1');
        } catch (_err) { /* ignore */ }
    };

    ackBtn.addEventListener('click', dismiss);
    modal.addEventListener('click', event => {
        if (event.target === modal || event.target.classList.contains('muji-overlay__backdrop')) dismiss();
    });

    try {
        if (!localStorage.getItem(DISCLAIMER_ACK_KEY)) {
            if (typeof window.openMujiOverlay === 'function') {
                window.openMujiOverlay(modal);
            } else {
                modal.classList.remove('hidden');
            }
        }
    } catch (_err) {
        if (typeof window.openMujiOverlay === 'function') {
            window.openMujiOverlay(modal);
        } else {
            modal.classList.remove('hidden');
        }
    }
}

function initSplashScreen() {
    const splash = document.getElementById('splash-screen');
    setTimeout(() => {
        splash.classList.add('opacity-0', 'pointer-events-none');
    }, 2000);
    setTimeout(async () => {
        splash.style.display = 'none';
        splash.setAttribute('aria-hidden', 'true');
        await playInitialPageEnter();
    }, 3000);
}

function handleLocaleChange() {
    updateDistrictPickerLabel();
    updateAvatarCooldownHint();
    renderDistrictPickerScroller();
    if (typeof window.renderMatches === 'function') {
        window.renderMatches();
    }
    if (typeof window.renderMyActivities === 'function') {
        window.renderMyActivities();
    }
}

function initApp() {
    initInitialPageState();
    loadCurrentUser();
    updateProfileUI();
    bindProfileEditUI();
    bindSettingsPageUI();
    initDisclaimerModal();
    initSplashScreen();
    initRegionFilter();
    bindPublishPageUI();
    window.addEventListener('localechange', handleLocaleChange);
    if (typeof initMatchesApp === 'function') {
        initMatchesApp();
    }
    if (typeof initCommunitiesApp === 'function') {
        initCommunitiesApp();
    }
}

document.addEventListener('DOMContentLoaded', initApp);
