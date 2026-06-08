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

/* ---------- 地區 / 篩選狀態 ---------- */
const HONG_KONG_18_DISTRICTS = [
    '中西區', '東區', '南區', '灣仔區',
    '油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區',
    '荃灣區', '葵青區', '屯門區', '元朗區', '北區',
    '大埔區', '沙田區', '西貢區', '離島區'
];

let currentFilter = 'all';
let pickerScrollListenerAttached = false;

/* ---------- 登入用家（Demo） ---------- */
const CURRENT_USER_STORAGE_KEY = 'uber_badminton_user';
const CURRENT_USER_NAME_STORAGE_KEY = 'uber_badminton_username';
const USER_PROFILES_STORAGE_KEY = 'uber_badminton_user_profiles';

let currentUser = { name: '波友_阿強', creditPoints: 105 };
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
    const profileKey = getActiveUserProfileKey(authUser);
    const profiles = readUserProfiles();
    const savedProfile = profiles[profileKey];

    currentUser = { name: '波友_阿強', creditPoints: 105 };
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
    if (authUser && authUser.email) {
        const fallbackPrefix = authUser.email.split('@')[0] || '波友';
        currentUser.name = authUser.displayName || `波友_${fallbackPrefix}`;
        currentUser.photoURL = authUser.photoURL || null;
    }
    saveCurrentUser();
}

function saveCurrentUser() {
    const authUser = window.firebaseAuthUser || null;
    const profileKey = getActiveUserProfileKey(authUser);
    const profiles = readUserProfiles();
    profiles[profileKey] = { ...currentUser };
    writeUserProfiles(profiles);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser));
    localStorage.setItem(CURRENT_USER_NAME_STORAGE_KEY, currentUser.name);
}

function getCurrentUserName() {
    return currentUser.name || '波友_阿強';
}

function handleAuthUserChange(user) {
    loadCurrentUser();
    updateProfileUI();
    if (typeof window.renderMyActivities === 'function') {
        window.renderMyActivities();
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

function updateProfileUI() {
    const nameEl = document.getElementById('profile-display-name');
    const creditEl = document.getElementById('profile-credit-points');
    const avatarEl = document.getElementById('profile-avatar');
    if (nameEl) nameEl.textContent = getCurrentUserName();
    if (creditEl) creditEl.textContent = '3／3';
    if (avatarEl) {
        if (currentUser.photoURL) {
            avatarEl.textContent = '';
            avatarEl.style.backgroundImage = `url("${currentUser.photoURL}")`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
        } else {
            const ch = (getCurrentUserName().replace(/^波友_/, '').charAt(0) || '友');
            avatarEl.textContent = ch;
            avatarEl.style.backgroundImage = '';
        }
    }
}

function showProfileEditPanel() {
    const panel = document.getElementById('profile-edit-panel');
    const hostPanel = document.getElementById('host-settings-panel');
    const nameInput = document.getElementById('profile-name-input');
    if (nameInput) nameInput.value = getCurrentUserName();
    if (hostPanel) hostPanel.classList.add('hidden');
    if (panel) panel.classList.toggle('hidden');
}

async function saveProfileChanges() {
    const saveBtn = document.getElementById('save-profile-btn');
    const nameInput = document.getElementById('profile-name-input');
    const avatarInput = document.getElementById('profile-avatar-input');
    const newName = nameInput ? nameInput.value.trim() : '';
    const imageFile =
        (typeof window.getPendingProfileAvatarFile === 'function' && window.getPendingProfileAvatarFile()) ||
        (avatarInput && avatarInput.files ? avatarInput.files[0] : null);

    if (!window.firebaseAuthUid) {
        alert('請先登入 VibeUp 波友。');
        return;
    }
    if (!newName && !imageFile) {
        alert('請輸入新名字或選擇新頭像。');
        return;
    }
    if (typeof window.dbUpdateUserProfile !== 'function') {
        alert('個人資料服務暫時未連線，請稍後再試。');
        return;
    }

    const originalText = saveBtn ? saveBtn.textContent : '';
    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '儲存中...';
        }
        await window.dbUpdateUserProfile(newName, imageFile);
        loadCurrentUser();
        updateProfileUI();
        if (avatarInput) avatarInput.value = '';
        if (typeof window.clearPendingProfileAvatarFile === 'function') {
            window.clearPendingProfileAvatarFile();
        }
        document.getElementById('profile-edit-panel')?.classList.add('hidden');
        alert('修改成功');
    } catch (err) {
        console.error('修改個人資料失敗:', err);
        const code = err?.code ? `（${err.code}）` : '';
        alert(`修改失敗${code}，請檢查 Firebase Storage / Firestore 權限設定。`);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText || '儲存修改';
        }
    }
}

function bindProfileEditUI() {
    document.getElementById('edit-profile-btn')?.addEventListener('click', showProfileEditPanel);
    document.getElementById('save-profile-btn')?.addEventListener('click', saveProfileChanges);
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

function initRegionPickers() {
    const scroller = document.getElementById('picker-scroller');
    scroller.innerHTML = [
        { val: 'all', label: '全港場次' },
        ...HONG_KONG_18_DISTRICTS.map(d => ({ val: d, label: d }))
    ].map(({ val, label }) =>
        `<div class="wheel-item snap-center flex h-10 items-center justify-center text-sm font-medium text-gray-400" data-val="${val}">${label}</div>`
    ).join('');
}

function toggleScrollPicker(show) {
    document.getElementById('scroll-picker').classList.toggle('hidden', !show);
    const scroller = document.getElementById('picker-scroller');

    if (show) {
        if (!pickerScrollListenerAttached) {
            scroller.addEventListener('scroll', updatePickerHighlight, { passive: true });
            pickerScrollListenerAttached = true;
        }
        requestAnimationFrame(() => scrollPickerToValue(currentFilter));
    }
}

function confirmPickerRegion() {
    const selected = getPickerSelection();
    currentFilter = selected;
    const label = selected === 'all' ? '全港地區' : selected;
    document.getElementById('current-region-text').textContent = `地區：${label}`;
    toggleScrollPicker(false);
    renderMatches();
}

/* ---------- 分頁與啟動畫面 ---------- */
function switchPage(pageId) {
    ['match', 'market', 'coach', 'profile'].forEach(p => {
        document.getElementById(`page-${p}`).classList.add('hidden');
        document.getElementById(`nav-${p}`).classList.remove('text-black');
    });
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    document.getElementById(`nav-${pageId}`).classList.add('text-black');
    if (pageId === 'profile' && typeof window.renderMyActivities === 'function') {
        window.renderMyActivities();
    }
}

function initSplashScreen() {
    const splash = document.getElementById('splash-screen');
    setTimeout(() => {
        splash.classList.add('opacity-0', 'pointer-events-none');
    }, 2000);
    setTimeout(() => {
        splash.style.display = 'none';
        splash.setAttribute('aria-hidden', 'true');
    }, 3000);
}

function initApp() {
    loadCurrentUser();
    updateProfileUI();
    bindProfileEditUI();
    initSplashScreen();
    initRegionPickers();
    if (typeof initMatchesApp === 'function') {
        initMatchesApp();
    }
}

document.addEventListener('DOMContentLoaded', initApp);
