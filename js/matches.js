/**
 * matches.js — 球場數據、渲染、付款防飛機、接龍後備、發佈表單
 * 依賴 app.js 提供的日期工具、地區常數、滾筒底層與 getCurrentUserName。
 */

        function i18n(key, params) {
            return typeof window.t === 'function' ? window.t(key, params) : key;
        }

        function i18nAlert(key, params) {
            alert(i18n(key, params));
        }

        function txPlace(name) {
            return typeof window.translatePlaceName === 'function'
                ? window.translatePlaceName(name)
                : name;
        }

        let defaultMatches = [];

        const VENUES_BY_DISTRICT = {
            '中西區': ['士美非路體育館', '中山紀念公園體育館', '上環體育館', '石塘咀體育館', '香港公園體育館'],
            '東區': ['柴灣體育館', '港島東體育館', '渣華道體育館', '鰂魚涌體育館', '西灣河體育館', '小西灣體育館'],
            '南區': ['黃竹坑體育館', '赤柱體育館', '鴨脷洲體育館', '香港仔體育館', '漁光道體育館'],
            '灣仔區': ['黃泥涌體育館', '駱克道體育館', '港灣道體育館'],
            '油尖旺區': ['花園街體育館', '官涌體育館', '大角咀體育館', '界限街一號體育館', '九龍公園體育館', '界限街二號體育館'],
            '深水埗區': ['北河街體育館', '深水埗體育館', '石硤尾公園體育館', '保安道體育館', '荔枝角公園體育館', '長沙灣體育館'],
            '黃大仙區': ['牛池灣體育館', '摩士公園體育館', '東啟德體育館', '蒲崗村道體育館', '竹園體育館', '彩虹道體育館', '彩虹道羽毛球中心'],
            '九龍城區': ['佛光街體育館', '土瓜灣體育館', '九龍城體育館', '紅磡市政大廈體育館'],
            '觀塘區': ['瑞和街體育館', '順利邨體育館', '牛頭角道體育館', '振華道體育館', '鯉魚門體育館', '曉光街體育館', '彩榮路體育館', '九龍灣體育館', '藍田(南)體育館'],
            '葵青區': ['北葵涌鄧肇堅體育館', '林士德體育館', '楓樹窩體育館', '大窩口體育館', '青衣體育館', '青衣西南體育館', '長發體育館', '荔景體育館'],
            '荃灣區': ['荃灣體育館', '蕙荃體育館', '荃灣西約體育館', '荃景圍體育館', '楊屋道體育館'],
            '屯門區': ['友愛體育館', '兆麟體育館', '大興體育館', '良田體育館', '賽馬會屯門蝴蝶灣體育館'],
            '元朗區': ['元朗體育館', '天暉路體育館', '屏山天水圍體育館', '天瑞體育館', '天水圍體育館', '鳳琴街體育館'],
            '沙田區': ['車公廟體育館', '圓洲角體育館', '源禾路體育館', '恆安體育館', '美林體育館', '馬鞍山體育館', '顯徑體育館'],
            '大埔區': ['太和體育館', '大埔體育館', '大埔墟體育館', '富亨體育館', '東昌街體育館', '富善體育館'],
            '北區': ['保榮路體育館', '天平體育館', '龍琛路體育館', '和興體育館'],
            '西貢區': ['翠林體育館', '將軍澳體育館', '坑口體育館', '調景嶺體育館', '香港單車館', '寶林體育館'],
            '離島區': ['梅窩體育館', '坪洲體育館', '海傍街體育館', '長洲體育館', '東涌文東路體育館']
        };

        const PRIVATE_VENUE_VALUE = '__private_other__';
        const PRIVATE_VENUE_LABEL = '🏢 私人會所 / 學校 / 其他地方';
        const SHUTTLE_BRANDS = ['RSL', 'YY', 'VICTOR', 'LI-NING'];

        const SKILL_LEVELS = [
            '歡樂級 (純娛樂/未掌握基本擊球)',
            '初級 (能打中球/懂基本規則)',
            '初中級 (有來回球/開始懂走位)',
            '中級 (擊球穩定/懂雙打跑位)',
            '中高級 (速度力量兼備/有戰術)',
            '高級 (比賽選手級/強力殺球抗衡)'
        ];
        const DEFAULT_SKILL_LEVEL = '初中級 (有來回球/開始懂走位)';

        function getSkillLevelShortLabel(skillLevel) {
            if (!skillLevel || skillLevel === '不限水平') {
                return typeof window.translateSkillLevel === 'function'
                    ? window.translateSkillLevel('不限水平')
                    : '不限水平';
            }
            if (typeof window.translateSkillLevel === 'function') {
                const translated = window.translateSkillLevel(skillLevel);
                const bracket = translated.indexOf(' (');
                return bracket > 0 ? translated.slice(0, bracket) : translated;
            }
            const bracket = skillLevel.indexOf(' (');
            return bracket > 0 ? skillLevel.slice(0, bracket) : skillLevel;
        }

        function getSkillLevelBadgeClass(skillLevel) {
            const short = getSkillLevelShortLabel(skillLevel);
            const map = {
                '不限水平': 'bg-gray-100 text-gray-600 border border-gray-200',
                '歡樂級': 'bg-gray-100 text-gray-700 border border-gray-200',
                '初級': 'bg-emerald-50 text-emerald-800 border border-emerald-200',
                '初中級': 'bg-teal-50 text-teal-800 border border-teal-200',
                '中級': 'bg-sky-50 text-sky-800 border border-sky-200',
                '中高級': 'bg-indigo-50 text-indigo-800 border border-indigo-200',
                '高級': 'bg-rose-50 text-rose-800 border border-rose-200'
            };
            return map[short] || 'bg-gray-100 text-gray-600 border border-gray-200';
        }

        let matches = defaultMatches;

        function migrateMatchDates() {
            matches.forEach((m, i) => {
                if (!m.playDate) {
                    m.playDate = i % 2 === 0 ? todayISO : tomorrowISO;
                }
            });
        }

        function migrateMatchSlots() {
            matches.forEach(m => {
                if (typeof m.maxSlots !== 'number' || Number.isNaN(m.maxSlots)) m.maxSlots = 6;
                if (typeof m.currentPlayers !== 'number' || Number.isNaN(m.currentPlayers)) m.currentPlayers = 0;
                if (!Array.isArray(m.waitingList)) m.waitingList = [];
                if (!Array.isArray(m.waitlist)) m.waitlist = [];
                if (m.paymentStatus === undefined) m.paymentStatus = null;
                if (!m.fpsId) {
                    const phone = (m.contact || '').match(/\d{8}/);
                    m.fpsId = phone ? phone[0] : '91234567';
                }
                if (!m.paymeLink) m.paymeLink = 'payme.hsbc/VibeUp_demo';

                if (!m.userStatus) {
                    if (m.paymentStatus === 'pending_verification') {
                        m.userStatus = 'pending';
                        if (!m.applicantName) m.applicantName = getCurrentUserName();
                    } else if (m.paymentStatus === 'verified' || (m.joined && m.paymentProofName && m.paymentStatus !== 'pending_verification')) {
                        m.userStatus = 'verified';
                    } else {
                        m.userStatus = 'none';
                    }
                }
                if (m.userStatus === 'pending' && m.paymentStatus !== 'pending_verification') {
                    m.paymentStatus = 'pending_verification';
                }
                if (m.userStatus === 'verified') {
                    m.paymentStatus = 'verified';
                }
                if (m.userStatus === 'none') {
                    if (m.paymentStatus === 'pending_verification') m.paymentStatus = null;
                }

                if (!m.skillLevel) m.skillLevel = '不限水平';
                if (m.applicantUid === undefined) m.applicantUid = null;
                if (m.applicantEmail === undefined) m.applicantEmail = null;
                if (m.hostUid === undefined) m.hostUid = null;
                if (m.hostEmail === undefined) m.hostEmail = null;
                if (m.isPrivate === undefined) m.isPrivate = false;

                if (m.maxSlots < 1) m.maxSlots = 1;
                if (m.currentPlayers < 0) m.currentPlayers = 0;
                if (m.currentPlayers > m.maxSlots) m.currentPlayers = m.maxSlots;
            });
        }

        function saveMatches() {
            localStorage.setItem('uber_badminton_matches', JSON.stringify(matches));
        }

        let homeSelectedDate = null;
        let homeCalendarExpanded = false;
        let formCalendarExpanded = false;
        const now = new Date();
        let homeCalendarYear = now.getFullYear();
        let homeCalendarMonth = now.getMonth();
        let formCalendarYear = now.getFullYear();
        let formCalendarMonth = now.getMonth();
        let formSelectedDate = todayISO;
        let formPickerScrollListenerAttached = false;
        let formPickerMode = 'region';
        let formSelectedRegion = '';
        let formSelectedVenue = '';
        let formSelectedBrand = '';
        let formSelectedSkillLevel = DEFAULT_SKILL_LEVEL;
        let pendingPaymentMatchId = null;
        let pendingPaymeLink = '';
        let inviteActivityId = null;
        let inviteMatch = null;
        let pendingPublishSubmission = null;

        const HOST_DUPLICATE_SLOT_LIMIT = 3;

        let cachedOwnHostSettings = null;
        const participantAttendanceCache = new Map();
        const hostProfileCache = new Map();

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function getEmptyHostSettings() {
            return { paymeQrUrl: '', fpsQrUrl: '', fpsId: '' };
        }

        function getHostDisplayName() {
            if (typeof getCurrentUserName === 'function') {
                const name = String(getCurrentUserName() || '').trim();
                if (name) return name;
            }
            const authUser = window.firebaseAuthUser;
            if (authUser?.displayName) return String(authUser.displayName).trim();
            if (authUser?.email) return authUser.email.split('@')[0] || '場主';
            return '場主';
        }

        async function resolveHostPublishContact() {
            if (typeof window.refreshHostPaymentSettings === 'function') {
                await window.refreshHostPaymentSettings();
            }
            const name = getHostDisplayName();
            const phone = String(cachedOwnHostSettings?.fpsId || '').trim();
            return phone ? `${name} ${phone}` : name;
        }

        function getHostPaymentInfo(match, remoteSettings = null) {
            const ownSettings = cachedOwnHostSettings || getEmptyHostSettings();
            const isOwnMatch = !!match?.hostUid && match.hostUid === window.firebaseAuthUid;
            const settings = remoteSettings || (isOwnMatch ? ownSettings : getEmptyHostSettings());
            const phone = (match?.contact || '').match(/\d{8}/);
            return {
                fpsId: settings.fpsId || match?.fpsId || (phone ? phone[0] : ''),
                paymeLink: match?.paymeLink || '',
                paymeQrUrl: settings.paymeQrUrl || match?.paymeQR || match?.hostPaymeQrUrl || match?.paymeQrUrl || '',
                fpsQrUrl: settings.fpsQrUrl || match?.fpsQR || match?.hostFpsQrUrl || match?.fpsQrUrl || ''
            };
        }

        function setHostPaymentStatus(message, visible = true) {
            const statusEl = document.getElementById('host-payment-status');
            if (!statusEl) return;
            statusEl.textContent = message || '';
            statusEl.classList.toggle('hidden', !visible || !message);
        }

        function getHostQrPreviewId(type) {
            return type === 'payme' ? 'host-payme-qr-preview' : 'host-fps-qr-preview';
        }

        function renderHostQrPreview(previewId, imageUrl, uploading = false) {
            const preview = document.getElementById(previewId);
            if (!preview) return;

            if (!imageUrl) {
                preview.innerHTML = '';
                preview.classList.remove('is-visible');
                delete preview.dataset.previewSource;
                return;
            }

            if (typeof window.renderPreviewContainer === 'function') {
                window.renderPreviewContainer(preview, imageUrl, {
                    uploading,
                    alt: previewId.includes('payme') ? 'PayMe QR 預覽' : 'FPS QR 預覽'
                });
            } else {
                preview.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="" class="host-qr-preview-image">`;
                preview.classList.add('is-visible');
            }
        }

        window.setHostQrLocalPreview = function setHostQrLocalPreview(type, src, { uploading = false } = {}) {
            const preview = document.getElementById(getHostQrPreviewId(type));
            if (!preview || !src) return;
            preview.dataset.previewSource = 'local';
            renderHostQrPreview(getHostQrPreviewId(type), src, uploading);
        };

        function applyHostSettingsToUI(settings = getEmptyHostSettings()) {
            const fpsInput = document.getElementById('host-fps-id-input');
            if (fpsInput) fpsInput.value = settings.fpsId || '';

            ['payme', 'fps'].forEach(type => {
                const previewId = getHostQrPreviewId(type);
                const preview = document.getElementById(previewId);
                if (preview?.dataset.previewSource === 'local') return;

                const imageUrl = type === 'payme' ? settings.paymeQrUrl : settings.fpsQrUrl;
                renderHostQrPreview(previewId, imageUrl, false);
                if (preview) delete preview.dataset.previewSource;
            });
        }

        async function refreshHostPaymentSettings() {
            if (!window.firebaseAuthUid) {
                cachedOwnHostSettings = getEmptyHostSettings();
                applyHostSettingsToUI(cachedOwnHostSettings);
                setHostPaymentStatus('');
                return;
            }

            const bridgeReady = await waitForDbBridge();
            if (!bridgeReady || typeof window.dbFetchHostPaymentSettings !== 'function') {
                applyHostSettingsToUI(cachedOwnHostSettings || getEmptyHostSettings());
                return;
            }

            try {
                cachedOwnHostSettings = await window.dbFetchHostPaymentSettings(window.firebaseAuthUid);
                applyHostSettingsToUI(cachedOwnHostSettings);
            } catch (err) {
                console.error('讀取場主收款設定失敗:', err);
                applyHostSettingsToUI(cachedOwnHostSettings || getEmptyHostSettings());
            }
        }

        function renderPaymentQrSlot(slotId, imageUrl, placeholderText) {
            const slot = document.getElementById(slotId);
            if (!slot) return;
            if (imageUrl) {
                slot.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(placeholderText)}" class="payment-qr-image" loading="lazy">`;
                return;
            }
            slot.innerHTML = `
                <div class="payment-qr-placeholder">
                    <span class="payment-qr-placeholder-icon" aria-hidden="true">▦</span>
                    <span class="payment-qr-placeholder-text">${escapeHtml(placeholderText)}</span>
                </div>
            `;
        }

        function getAttendancePercent(uid) {
            const rate = participantAttendanceCache.get(uid);
            return rate ? rate.percent : null;
        }

        function formatAttendanceTooltip(name, uid) {
            const percent = getAttendancePercent(uid);
            const rateText = percent === null ? '—' : `${percent}%`;
            return `${name} (出席率: ${rateText})`;
        }

        async function prefetchParticipantAttendance(uids = []) {
            const missing = [...new Set(uids.filter(uid => uid && !participantAttendanceCache.has(uid)))];
            if (!missing.length || typeof window.dbFetchUsersAttendanceRates !== 'function') return;

            try {
                const rates = await window.dbFetchUsersAttendanceRates(missing);
                Object.entries(rates || {}).forEach(([uid, rate]) => {
                    participantAttendanceCache.set(uid, rate);
                });
            } catch (err) {
                console.error('讀取出席率失敗:', err);
            }
        }

        function getHostProfile(hostUid) {
            if (!hostUid) return null;
            return hostProfileCache.get(hostUid) || null;
        }

        async function prefetchHostProfiles(hostUids = []) {
            const missing = [...new Set(hostUids.filter(uid => uid && !hostProfileCache.has(uid)))];
            if (!missing.length || typeof window.dbFetchHostProfiles !== 'function') return;

            try {
                const profiles = await window.dbFetchHostProfiles(missing);
                Object.entries(profiles || {}).forEach(([uid, profile]) => {
                    hostProfileCache.set(uid, profile);
                    if (profile?.attendance) {
                        participantAttendanceCache.set(uid, profile.attendance);
                    }
                });
            } catch (err) {
                console.error('讀取場主檔案失敗:', err);
            }
        }

        function renderHostBadge(profile) {
            if (!profile?.tier) return '';
            if (profile.tier === 'newbie') {
                return `<span class="host-badge host-badge--newbie">${i18n('match.badgeNewHost')}</span>`;
            }
            if (profile.tier === 'quality') {
                return `<span class="host-badge host-badge--quality">${i18n('match.badgeQuality')}</span>`;
            }
            return '';
        }

        function extractPublisherNameFromContact(contact) {
            const raw = String(contact || '').trim();
            if (!raw) return '';
            return raw.split(/\s+/)[0] || '';
        }

        function getHostPublisherInfo(match) {
            const hostUid = match?.hostUid;
            const profile = hostUid ? getHostProfile(hostUid) : null;
            const isSelf = !!(hostUid && hostUid === window.firebaseAuthUid);
            const authUser = window.firebaseAuthUser;

            let displayName = profile?.displayName
                || match?.hostDisplayName
                || (isSelf && authUser?.displayName)
                || extractPublisherNameFromContact(match?.contact)
                || '場主';
            displayName = String(displayName).replace(/^波友_/, '').trim() || '場主';

            let photoURL = profile?.photoURL
                || match?.hostPhotoURL
                || (isSelf ? (authUser?.photoURL || null) : null)
                || null;

            return {
                displayName,
                photoURL,
                initial: displayName.charAt(0) || '主',
                profile
            };
        }

        function renderHostPublisherBlock(match) {
            const hostUid = match?.hostUid;
            if (!hostUid && !match?.contact) return '';

            const { displayName, photoURL, initial } = getHostPublisherInfo(match);
            const avatarHtml = photoURL
                ? `<img src="${escapeHtml(photoURL)}" alt="" class="host-publisher-avatar-image">`
                : `<span class="host-publisher-avatar-initial">${escapeHtml(initial)}</span>`;

            return `
                <div class="host-publisher-row">
                    <div class="host-publisher-avatar" aria-hidden="true">${avatarHtml}</div>
                    <p class="host-publisher-line">${i18n('match.hostPublishedBy', { name: escapeHtml(displayName) })}</p>
                </div>
            `;
        }

        function getActivityParticipants(match) {
            const participants = match?.participants && typeof match.participants === 'object'
                ? match.participants
                : {};
            const pendingUids = new Set(getMatchPendingUids(match));
            let uids = Array.isArray(match?.participantUids) ? [...match.participantUids] : [];

            if (!uids.length) {
                uids = Object.keys(participants).filter(uid => {
                    if (pendingUids.has(uid)) return false;
                    const status = participants[uid]?.status;
                    return status !== 'pending';
                });
            } else {
                uids = uids.filter(uid => !pendingUids.has(uid));
            }

            return uids.map(uid => {
                const profile = participants[uid] || {};
                const rawName = profile.displayName || profile.name || '波友';
                const name = String(rawName).replace(/^波友_/, '').trim() || '波友';
                const photoURL = profile.photoURL || null;
                return {
                    uid,
                    name,
                    photoURL,
                    initial: name.charAt(0) || '友'
                };
            });
        }

        function renderParticipantsBlock(match) {
            const participants = getActivityParticipants(match);
            if (!participants.length) return '';

            const chips = participants.map(participant => {
                const avatarHtml = participant.photoURL
                    ? `<img src="${escapeHtml(participant.photoURL)}" alt="${escapeHtml(participant.name)}" class="participant-avatar-image">`
                    : `<span class="participant-avatar-initial">${escapeHtml(participant.initial)}</span>`;
                const tooltip = formatAttendanceTooltip(participant.name, participant.uid);
                return `
                    <div class="participant-chip" title="${escapeHtml(tooltip)}">
                        <div class="participant-chip-inner">
                            <div class="participant-avatar" aria-hidden="true">${avatarHtml}</div>
                            <span class="participant-name">${escapeHtml(participant.name)}</span>
                            <span class="participant-attendance-tip">${escapeHtml(tooltip)}</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="participants-block">
                    <p class="participants-label">${i18n('match.participants')}</p>
                    <div class="participants-list">${chips}</div>
                </div>
            `;
        }

        function getMatchWaitlistUids(match) {
            if (Array.isArray(match?.waitlist) && match.waitlist.length) {
                return match.waitlist;
            }
            return [];
        }

        function isUserOnWaitlist(match) {
            const uid = window.firebaseAuthUid;
            if (!uid) return false;
            return getMatchWaitlistUids(match).includes(uid);
        }

        function getMatchDatesSet() {
            return new Set(
                matches
                    .filter(m => isMatchActive(m))
                    .map(m => m.playDate)
                    .filter(Boolean)
            );
        }

        function isPastDate(iso) {
            return iso < todayISO;
        }

        function isMatchActive(match) {
            return typeof window.isActivityActive === 'function'
                ? window.isActivityActive(match)
                : (!match?.playDate || !isPastDate(match.playDate));
        }

        function isMatchEnded(match) {
            return typeof window.isActivityEnded === 'function'
                ? window.isActivityEnded(match)
                : (match?.playDate ? isPastDate(match.playDate) : false);
        }

        function changeCalendarMonth(mode, delta) {
            const state = mode === 'home'
                ? { year: homeCalendarYear, month: homeCalendarMonth }
                : { year: formCalendarYear, month: formCalendarMonth };
            let month = state.month + delta;
            let year = state.year;
            if (month < 0) { month = 11; year--; }
            if (month > 11) { month = 0; year++; }
            if (mode === 'home') {
                homeCalendarYear = year;
                homeCalendarMonth = month;
            } else {
                formCalendarYear = year;
                formCalendarMonth = month;
            }
            renderCalendar(mode);
        }

        function getCalendarCollapsedLabel(mode) {
            const iso = mode === 'home' ? homeSelectedDate : formSelectedDate;
            if (mode === 'home' && !iso) return i18n('date.allDates');
            const display = formatDateDisplay(iso);
            if (iso === todayISO) return `${display}${i18n('date.today')}`;
            return display;
        }

        function updateCalendarCollapsedText(mode) {
            const el = document.getElementById(`${mode}-calendar-collapsed-text`);
            if (el) el.textContent = getCalendarCollapsedLabel(mode);
        }

        function updateCalendarExpandUI(mode) {
            const expanded = mode === 'home' ? homeCalendarExpanded : formCalendarExpanded;
            document.getElementById(`${mode}-calendar-panel`).classList.toggle('hidden', !expanded);
            document.getElementById(`${mode}-calendar-chevron`).textContent = expanded ? '▲' : '▼';
            updateCalendarCollapsedText(mode);
        }

        function toggleCalendarExpand(mode) {
            if (mode === 'home') {
                homeCalendarExpanded = !homeCalendarExpanded;
            } else {
                formCalendarExpanded = !formCalendarExpanded;
            }
            updateCalendarExpandUI(mode);
            if ((mode === 'home' ? homeCalendarExpanded : formCalendarExpanded)) {
                const iso = mode === 'home' ? (homeSelectedDate || todayISO) : (formSelectedDate || todayISO);
                const d = parseDateISO(iso);
                if (mode === 'home') {
                    homeCalendarYear = d.getFullYear();
                    homeCalendarMonth = d.getMonth();
                } else {
                    formCalendarYear = d.getFullYear();
                    formCalendarMonth = d.getMonth();
                }
                renderCalendar(mode);
            }
        }

        function collapseCalendar(mode) {
            if (mode === 'home') homeCalendarExpanded = false;
            else formCalendarExpanded = false;
            updateCalendarExpandUI(mode);
        }

        function selectCalendarDate(mode, iso) {
            if (mode === 'form' && isPastDate(iso)) return;

            if (mode === 'home') {
                homeSelectedDate = iso;
            } else {
                formSelectedDate = iso;
                document.getElementById('form-play-date').value = iso;
            }
            updateCalendarCollapsedText(mode);
            renderCalendar(mode);
            collapseCalendar(mode);
            if (mode === 'home') renderMatches();
        }

        function clearHomeDateFilter() {
            homeSelectedDate = null;
            updateCalendarCollapsedText('home');
            renderCalendar('home');
            collapseCalendar('home');
            renderMatches();
        }

        function syncHomeLobbyAfterPublish(playDate) {
            if (!playDate) return;
            homeSelectedDate = playDate;
            const d = parseDateISO(playDate);
            homeCalendarYear = d.getFullYear();
            homeCalendarMonth = d.getMonth();
            updateCalendarCollapsedText('home');
            renderCalendar('home');
        }

        function renderCalendar(mode) {
            const isHome = mode === 'home';
            const year = isHome ? homeCalendarYear : formCalendarYear;
            const month = isHome ? homeCalendarMonth : formCalendarMonth;
            const selected = isHome ? homeSelectedDate : formSelectedDate;
            const grid = document.getElementById(isHome ? 'home-calendar-grid' : 'form-calendar-grid');
            const title = document.getElementById(isHome ? 'home-calendar-title' : 'form-calendar-title');
            const matchDates = getMatchDatesSet();

            title.textContent = i18n('date.monthTitle', { year, month: month + 1 });

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            let html = '';

            for (let i = 0; i < firstDay; i++) {
                html += '<div class="h-9"></div>';
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const iso = formatDateISO(new Date(year, month, day));
                const isPast = isPastDate(iso);
                const isToday = iso === todayISO;
                const isSelected = iso === selected;
                const hasMatch = matchDates.has(iso);
                const disabled = !isHome && isPast;

                let cls = 'relative h-9 flex flex-col items-center justify-center rounded-lg text-xs font-medium transition ';
                if (disabled) {
                    cls += 'text-gray-300 cursor-not-allowed';
                } else if (isSelected) {
                    cls += 'bg-black text-white font-bold shadow-sm';
                } else if (isToday) {
                    cls += 'ring-1 ring-black/20 text-black bg-white';
                } else {
                    cls += 'text-gray-700 hover:bg-gray-200 cursor-pointer';
                }

                const dot = hasMatch && !isSelected
                    ? '<span class="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500"></span>'
                    : hasMatch && isSelected
                        ? '<span class="absolute bottom-1 w-1 h-1 rounded-full bg-white"></span>'
                        : '';

                const click = disabled
                    ? ''
                    : `onclick="selectCalendarDate('${mode}', '${iso}')"`;

                html += `<button type="button" ${click} class="${cls}" ${disabled ? 'disabled' : ''}>${day}${dot}</button>`;
            }

            grid.innerHTML = html;
        }

        function initCalendars() {
            document.getElementById('form-play-date').value = todayISO;
            updateCalendarExpandUI('home');
            updateCalendarExpandUI('form');
            renderCalendar('home');
            renderCalendar('form');
        }

        function getFormPickerDisplayLabel(mode, val, label) {
            if (mode === 'skill') {
                return typeof window.translateSkillLevel === 'function'
                    ? window.translateSkillLevel(label)
                    : label;
            }
            if (val === PRIVATE_VENUE_VALUE) return i18n('venue.privateOther');
            if (mode === 'region' || mode === 'venue') return txPlace(label);
            return label;
        }

        function buildFormPickerItems(mode) {
            if (mode === 'region') {
                return HONG_KONG_18_DISTRICTS.map(d => ({
                    val: d,
                    label: getFormPickerDisplayLabel('region', d, d)
                }));
            }
            if (mode === 'venue') {
                const venues = VENUES_BY_DISTRICT[formSelectedRegion] || [];
                return [
                    ...venues.map(v => ({ val: v, label: getFormPickerDisplayLabel('venue', v, v) })),
                    { val: PRIVATE_VENUE_VALUE, label: i18n('venue.privateOther') }
                ];
            }
            if (mode === 'skill') {
                return SKILL_LEVELS.map(s => ({
                    val: s,
                    label: getFormPickerDisplayLabel('skill', s, s)
                }));
            }
            if (mode === 'startTime') {
                return buildTimeSlotOptions(TIME_SLOT_DAY_START_MINUTES, TIME_SLOT_START_MAX_MINUTES);
            }
            if (mode === 'endTime') {
                return buildEndTimeSlotOptions();
            }
            return SHUTTLE_BRANDS.map(b => ({ val: b, label: b }));
        }

        function renderFormPickerScroller(mode, scrollTo) {
            const scroller = document.getElementById('form-picker-scroller');
            const items = buildFormPickerItems(mode);
            if (!items.length) {
                scroller.innerHTML = `<div class="form-wheel-item snap-center flex h-10 items-center justify-center px-3 text-sm font-medium text-gray-400" data-val="">${i18n('picker.noTime')}</div>`;
                return;
            }
            scroller.innerHTML = items.map(({ val, label }) =>
                `<div class="form-wheel-item snap-center flex h-10 items-center justify-center px-3 text-sm font-medium text-gray-400" data-val="${val}">${label}</div>`
            ).join('');

            const initial = items.some(item => item.val === scrollTo) ? scrollTo : (items[0]?.val || scrollTo);
            if (initial) {
                requestAnimationFrame(() => scrollWheelToValue('form-picker-scroller', 'form-wheel-item', initial));
            }
        }

        function updateVenueFieldState() {
            const venueBtn = document.getElementById('form-venue-btn');
            const venueText = document.getElementById('form-venue-text');
            const venueInput = document.getElementById('form-venue');
            const hasRegion = !!formSelectedRegion;

            venueBtn.disabled = !hasRegion;
            venueBtn.classList.toggle('opacity-50', !hasRegion);
            venueBtn.classList.toggle('cursor-not-allowed', !hasRegion);

            if (!hasRegion) {
                venueText.textContent = i18n('publish.pickVenueFirst');
                venueInput.value = '';
                formSelectedVenue = '';
                handleVenueSelectionChange();
            } else if (!formSelectedVenue) {
                venueText.textContent = i18n('publish.pickVenue');
            }
        }

        function handleVenueSelectionChange() {
            const venueInput = document.getElementById('form-venue');
            const venueNoteWrap = document.getElementById('venue-note-wrap');
            const venueNoteInput = document.getElementById('form-venue-note');
            const isPrivateVenue = venueInput.value === PRIVATE_VENUE_VALUE;

            venueNoteWrap.classList.toggle('hidden', !isPrivateVenue);
            venueNoteInput.required = isPrivateVenue;

            if (!isPrivateVenue) {
                venueNoteInput.value = '';
            }
        }

        function formatTimeCompact(timeValue) {
            if (!timeValue) return '';
            return String(timeValue).trim().replace(':', '');
        }

        const TIME_SLOT_STEP_MINUTES = 30;
        const TIME_SLOT_DAY_START_MINUTES = 6 * 60;
        const TIME_SLOT_DAY_END_MINUTES = 23 * 60 + 30;
        const TIME_SLOT_START_MAX_MINUTES = 23 * 60;
        const DEFAULT_SESSION_DURATION_MINUTES = 60;

        function parseTimeToMinutes(timeValue) {
            if (!timeValue || !String(timeValue).includes(':')) return null;
            const [hours, minutes] = String(timeValue).split(':').map(Number);
            if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
            return hours * 60 + minutes;
        }

        function formatMinutesToTimeValue(totalMinutes) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }

        function buildTimeSlotOptions(minMinutes = TIME_SLOT_DAY_START_MINUTES, maxMinutes = TIME_SLOT_DAY_END_MINUTES) {
            const options = [];
            for (let minutes = minMinutes; minutes <= maxMinutes; minutes += TIME_SLOT_STEP_MINUTES) {
                const value = formatMinutesToTimeValue(minutes);
                options.push({ val: value, label: value });
            }
            return options;
        }

        function getPublishStartTimeValue() {
            return document.getElementById('form-start-time')?.value || '';
        }

        function getPublishEndTimeValue() {
            return document.getElementById('form-end-time')?.value || '';
        }

        function setPublishStartTimeValue(timeValue) {
            const hidden = document.getElementById('form-start-time');
            const label = document.getElementById('form-start-time-text');
            if (hidden) hidden.value = timeValue;
            if (label) label.textContent = timeValue;
        }

        function setPublishEndTimeValue(timeValue) {
            const hidden = document.getElementById('form-end-time');
            const label = document.getElementById('form-end-time-text');
            if (hidden) hidden.value = timeValue;
            if (label) label.textContent = timeValue;
        }

        function getEarliestEndTimeMinutes(startMinutes) {
            return Math.min(startMinutes + TIME_SLOT_STEP_MINUTES, TIME_SLOT_DAY_END_MINUTES);
        }

        function getDefaultEndTimeMinutes(startMinutes) {
            const preferred = startMinutes + DEFAULT_SESSION_DURATION_MINUTES;
            const earliest = getEarliestEndTimeMinutes(startMinutes);
            if (preferred <= TIME_SLOT_DAY_END_MINUTES && preferred > startMinutes) {
                return preferred;
            }
            return earliest;
        }

        function buildEndTimeSlotOptions() {
            const startMinutes = parseTimeToMinutes(getPublishStartTimeValue());
            const minMinutes = startMinutes === null
                ? TIME_SLOT_DAY_START_MINUTES + TIME_SLOT_STEP_MINUTES
                : getEarliestEndTimeMinutes(startMinutes);
            return buildTimeSlotOptions(minMinutes, TIME_SLOT_DAY_END_MINUTES);
        }

        function ensureValidEndTimeAfterStartChange() {
            const startMinutes = parseTimeToMinutes(getPublishStartTimeValue());
            const endMinutes = parseTimeToMinutes(getPublishEndTimeValue());
            if (startMinutes === null) return;

            if (endMinutes === null || endMinutes <= startMinutes) {
                setPublishEndTimeValue(formatMinutesToTimeValue(getDefaultEndTimeMinutes(startMinutes)));
            }
        }

        function calculateDurationHours(startTime, endTime) {
            const startMinutes = parseTimeToMinutes(startTime);
            const endMinutes = parseTimeToMinutes(endTime);
            if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
                return null;
            }
            return (endMinutes - startMinutes) / 60;
        }

        function formatDurationLabel(durationHours) {
            if (durationHours === null || Number.isNaN(durationHours)) return '';
            return Number.isInteger(durationHours) ? String(durationHours) : durationHours.toFixed(1);
        }

        function formatCourtCountLabel(courtCount) {
            const count = Math.max(1, Number(courtCount) || 1);
            return count === 1 ? '1個場地' : `${count}個場地`;
        }

        function buildDisplayTimeSlot(startTime, endTime, courtCount) {
            const duration = calculateDurationHours(startTime, endTime);
            if (duration === null) return '';
            const start = formatTimeCompact(startTime);
            const end = formatTimeCompact(endTime);
            return `${start}-${end} (${formatDurationLabel(duration)}小時，${formatCourtCountLabel(courtCount)})`;
        }

        function getTimeSlotFormValues() {
            const startInput = document.getElementById('form-start-time');
            const endInput = document.getElementById('form-end-time');
            const courtInput = document.getElementById('form-court-count');
            const startTime = startInput ? startInput.value : '';
            const endTime = endInput ? endInput.value : '';
            const courtCountRaw = courtInput ? parseInt(courtInput.value, 10) : 1;
            const courtCount = Number.isNaN(courtCountRaw) ? 1 : Math.max(1, courtCountRaw);
            const duration = calculateDurationHours(startTime, endTime);
            const displayTimeSlot = buildDisplayTimeSlot(startTime, endTime, courtCount);

            return {
                startTime: formatTimeCompact(startTime),
                endTime: formatTimeCompact(endTime),
                startTimeValue: startTime,
                endTimeValue: endTime,
                duration,
                courtCount,
                displayTimeSlot
            };
        }

        function updateTimePreview() {
            const preview = document.getElementById('timePreview');
            if (!preview) return;

            const { startTimeValue, endTimeValue, courtCount } = getTimeSlotFormValues();
            preview.classList.remove('time-preview--empty', 'time-preview--warn');

            if (!startTimeValue || !endTimeValue) {
                preview.textContent = '請選擇開始與結束時間';
                preview.classList.add('time-preview--empty');
                return;
            }

            const duration = calculateDurationHours(startTimeValue, endTimeValue);
            if (duration === null) {
                preview.textContent = '結束時間須晚於開始時間';
                preview.classList.add('time-preview--warn');
                return;
            }

            preview.textContent = buildDisplayTimeSlot(startTimeValue, endTimeValue, courtCount);
        }

        function bindTimeSlotForm() {
            document.getElementById('form-court-count')?.addEventListener('input', updateTimePreview);
            document.getElementById('form-court-count')?.addEventListener('change', updateTimePreview);
            updateTimePreview();
        }

        function resetPublishForm() {
            formSelectedRegion = '';
            formSelectedVenue = '';
            formSelectedBrand = '';
            formSelectedSkillLevel = DEFAULT_SKILL_LEVEL;
            document.getElementById('form-region').value = '';
            document.getElementById('form-venue').value = '';
            document.getElementById('form-skill-level').value = DEFAULT_SKILL_LEVEL;
            const maxSlotsInput = document.getElementById('form-maxslots');
            if (maxSlotsInput) maxSlotsInput.value = '6';
            const currentPlayersInput = document.getElementById('form-current-players');
            if (currentPlayersInput) currentPlayersInput.value = '1';
            document.getElementById('form-region-text').textContent = '請滾動選擇分區';
            document.getElementById('form-venue-text').textContent = '請先選擇分區';
            document.getElementById('form-skill-level-text').textContent = getSkillLevelShortLabel(DEFAULT_SKILL_LEVEL);
            document.getElementById('form-venue-note').value = '';
            const shuttleInfoInput = document.getElementById('form-shuttle-info');
            if (shuttleInfoInput) shuttleInfoInput.value = '';
            const courtCountInput = document.getElementById('form-court-count');
            setPublishStartTimeValue('09:00');
            setPublishEndTimeValue('11:00');
            if (courtCountInput) courtCountInput.value = '1';
            updateTimePreview();
            formSelectedDate = todayISO;
            formCalendarExpanded = false;
            document.getElementById('form-play-date').value = todayISO;
            const n = new Date();
            formCalendarYear = n.getFullYear();
            formCalendarMonth = n.getMonth();
            updateCalendarExpandUI('form');
            renderCalendar('form');
            updateVenueFieldState();
            const publicVisibility = document.querySelector('input[name="form-visibility"][value="public"]');
            if (publicVisibility) publicVisibility.checked = true;
        }

        function openFormPicker(mode) {
            if (mode === 'venue' && !formSelectedRegion) {
                i18nAlert('alert.pickDistrictFirst');
                return;
            }
            if (mode === 'endTime' && !getPublishStartTimeValue()) {
                i18nAlert('alert.pickStartTimeFirst');
                return;
            }

            formPickerMode = mode;
            const titleKeys = {
                region: 'picker.selectDistrict',
                venue: 'picker.selectVenue',
                brand: 'picker.selectBrand',
                skill: 'picker.selectSkill',
                startTime: 'picker.startTime',
                endTime: 'picker.endTime'
            };
            document.getElementById('form-picker-title').textContent = i18n(titleKeys[mode] || 'common.done');

            const scrollTo = mode === 'region'
                ? (formSelectedRegion || HONG_KONG_18_DISTRICTS[0])
                : mode === 'venue'
                ? (formSelectedVenue || (VENUES_BY_DISTRICT[formSelectedRegion] || [])[0])
                : mode === 'brand'
                    ? (formSelectedBrand || SHUTTLE_BRANDS[0])
                    : mode === 'startTime'
                        ? (getPublishStartTimeValue() || '09:00')
                        : mode === 'endTime'
                            ? (getPublishEndTimeValue() || formatMinutesToTimeValue(getDefaultEndTimeMinutes(parseTimeToMinutes(getPublishStartTimeValue()) || TIME_SLOT_DAY_START_MINUTES)))
                            : (formSelectedSkillLevel || DEFAULT_SKILL_LEVEL);

            renderFormPickerScroller(mode, scrollTo);
            toggleFormPicker(true);
        }

        async function toggleFormPicker(show) {
            const picker = document.getElementById('form-picker');
            const scroller = document.getElementById('form-picker-scroller');
            if (!picker) return;

            if (show) {
                if (typeof window.openMujiOverlay === 'function') {
                    await window.openMujiOverlay(picker);
                } else {
                    picker.classList.remove('hidden');
                }
                if (!formPickerScrollListenerAttached && scroller) {
                    scroller.addEventListener('scroll', () => updateWheelHighlight('form-picker-scroller', 'form-wheel-item'), { passive: true });
                    formPickerScrollListenerAttached = true;
                }
                return;
            }

            if (typeof window.closeMujiOverlay === 'function') {
                await window.closeMujiOverlay(picker);
            } else {
                picker.classList.add('hidden');
            }
        }

        function confirmFormPicker() {
            const selected = getWheelSelection('form-picker-scroller', 'form-wheel-item', '');

            if (formPickerMode === 'region') {
                if (selected !== formSelectedRegion) {
                    formSelectedRegion = selected;
                    document.getElementById('form-region').value = selected;
                    document.getElementById('form-region-text').textContent = txPlace(selected);
                    formSelectedVenue = '';
                    document.getElementById('form-venue').value = '';
                    document.getElementById('form-venue-text').textContent = '請滾動選擇體育館';
                    handleVenueSelectionChange();
                }
                updateVenueFieldState();
            } else if (formPickerMode === 'venue') {
                formSelectedVenue = selected;
                document.getElementById('form-venue').value = selected;
                document.getElementById('form-venue-text').textContent =
                    selected === PRIVATE_VENUE_VALUE ? PRIVATE_VENUE_LABEL : selected;
                handleVenueSelectionChange();
            } else if (formPickerMode === 'brand') {
                formSelectedBrand = selected;
                document.getElementById('form-brand').value = selected;
                document.getElementById('form-brand-text').textContent = selected;
            } else if (formPickerMode === 'skill') {
                formSelectedSkillLevel = selected;
                document.getElementById('form-skill-level').value = selected;
                document.getElementById('form-skill-level-text').textContent = getSkillLevelShortLabel(selected);
            } else if (formPickerMode === 'startTime') {
                setPublishStartTimeValue(selected);
                ensureValidEndTimeAfterStartChange();
                updateTimePreview();
            } else if (formPickerMode === 'endTime') {
                setPublishEndTimeValue(selected);
                updateTimePreview();
            }

            toggleFormPicker(false);
        }

        function waitForDbBridge(timeoutMs = 10000) {
            if (
                typeof window.dbFetchActivities === 'function' &&
                typeof window.dbPublishActivity === 'function' &&
                typeof window.dbReserveActivity === 'function'
            ) {
                return Promise.resolve(true);
            }

            return new Promise(resolve => {
                let settled = false;
                const finish = value => {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('firebase-db-bridge-ready', onReady);
                    resolve(value);
                };
                const onReady = () => {
                    finish(
                        typeof window.dbFetchActivities === 'function' &&
                        typeof window.dbPublishActivity === 'function' &&
                        typeof window.dbReserveActivity === 'function'
                    );
                };

                window.addEventListener('firebase-db-bridge-ready', onReady, { once: true });
                setTimeout(() => finish(false), timeoutMs);
            });
        }

        function mergeMatchesByFirestoreId(primary = [], extras = []) {
            const map = new Map();
            [...primary, ...extras].forEach(match => {
                const id = match?.firestoreId || match?.id;
                if (id) map.set(String(id), match);
            });
            return [...map.values()];
        }

        function isPrivateMatch(match) {
            return match?.isPrivate === true || match?.isPrivate === 'private';
        }

        function isOwnHostedMatch(match) {
            const uid = window.firebaseAuthUid;
            return !!(uid && match?.hostUid === uid);
        }

        function canShowMatchInLobby(match) {
            if (isOwnHostedMatch(match)) return true;
            return !isPrivateMatch(match);
        }

        function waitForFirebaseAuth(timeoutMs = 10000) {
            if (window.firebaseAuthReady) {
                return Promise.resolve(window.firebaseAuthUid || null);
            }
            return new Promise(resolve => {
                let settled = false;
                const finish = uid => {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('firebase-auth-ready', onReady);
                    resolve(uid);
                };
                const onReady = () => finish(window.firebaseAuthUid || null);
                window.addEventListener('firebase-auth-ready', onReady, { once: true });
                setTimeout(() => finish(window.firebaseAuthUid || null), timeoutMs);
            });
        }

        async function loadActivitiesFromCloud() {
            const bridgeReady = await waitForDbBridge();
            if (!bridgeReady) {
                console.warn('Firestore bridge 未就緒，暫時使用本地場次資料。');
                return false;
            }

            try {
                const publicMatches = await window.dbFetchActivities();
                let hostLobbyExtras = [];
                if (window.firebaseAuthUid && typeof window.dbFetchMyHostedLobbyActivities === 'function') {
                    hostLobbyExtras = await window.dbFetchMyHostedLobbyActivities();
                }
                matches = mergeMatchesByFirestoreId(publicMatches, hostLobbyExtras);
                if (hostLobbyExtras.length > 0) {
                    console.info(`[+1] 已合併 ${hostLobbyExtras.length} 筆場主場次至大廳（含私人／未過期）。`);
                }
                migrateMatchDates();
                migrateMatchSlots();
                saveMatches();
                return true;
            } catch (err) {
                console.error('載入 Firestore 場次失敗，暫時使用本地場次資料:', err);
                return false;
            }
        }

        const MY_SESSIONS_LIMIT = 3;

        function sortActivitiesByRecency(list) {
            return [...list].sort((a, b) => {
                const dateCompare = (b.playDate || "").localeCompare(a.playDate || "");
                if (dateCompare !== 0) return dateCompare;
                const aCreated = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
                const bCreated = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
                return bCreated - aCreated;
            });
        }

        function getActivityDateLabel(activity) {
            return activity.playDate
                ? formatDateDisplay(activity.playDate)
                : i18n('date.pending');
        }

        function getActivityTimeLabel(activity) {
            const raw = activity.displayTimeSlot || activity.playTime;
            return raw && String(raw).trim()
                ? String(raw).trim()
                : i18n('date.timePending');
        }

        function getActivityDateTimeLabel(activity) {
            return `${getActivityDateLabel(activity)} · ${getActivityTimeLabel(activity)}`;
        }

        function getMatchCardBadges(match, options = {}) {
            const { showPrivateBadge = false } = options;
            let cardBadges = '';
            const isOwnHosted = isOwnHostedMatch(match);
            if (isOwnHosted) {
                cardBadges += `<span class="match-host-owned-badge">${i18n('match.yourPublished')}</span>`;
                if (isPrivateMatch(match)) {
                    cardBadges += `<span class="session-private-badge">${i18n('match.privateTag')}</span>`;
                }
            } else if (showPrivateBadge || isPrivateMatch(match)) {
                cardBadges += `<span class="session-private-badge">${i18n('match.privateInvite')}</span>`;
            }
            return cardBadges;
        }

        function renderMatchDateTimeCapsules(match, options = {}) {
            const cardBadges = getMatchCardBadges(match, options);
            const badgesHtml = cardBadges
                ? `<div class="match-card-badges">${cardBadges}</div>`
                : '';
            return `
                <div class="match-card-capsules">
                    <span class="match-card-capsule">${escapeHtml(getActivityDateLabel(match))}</span>
                    <span class="match-card-capsule match-card-capsule--time">${escapeHtml(getActivityTimeLabel(match))}</span>
                </div>
                ${badgesHtml}
            `;
        }

        function getMatchPendingUids(match) {
            return Array.isArray(match?.pendingParticipantUids) ? match.pendingParticipantUids : [];
        }

        function getUserJoinStatus(match) {
            const uid = window.firebaseAuthUid;
            if (!uid) return 'none';
            const participantUids = Array.isArray(match?.participantUids) ? match.participantUids : [];
            if (participantUids.includes(uid)) return 'approved';
            if (getMatchPendingUids(match).includes(uid)) return 'pending';
            return 'none';
        }

        function extractPhoneFromContact(contact) {
            const phone = String(contact || '').match(/\d{8}/);
            return phone ? phone[0] : '';
        }

        function normalizeWhatsAppNumber(raw) {
            const digits = String(raw || '').replace(/\D/g, '');
            if (!digits) return '';
            if (digits.startsWith('852') && digits.length >= 11) return digits;
            if (digits.length === 8) return `852${digits}`;
            return digits;
        }

        function buildWhatsAppUrl(rawNumber) {
            const normalized = normalizeWhatsAppNumber(rawNumber);
            if (!normalized) return '';
            return `https://wa.me/${normalized}`;
        }

        function getHostWhatsAppNumber(match, remoteSettings = null) {
            const payment = getHostPaymentInfo(match, remoteSettings);
            return (payment.fpsId || '').trim() || extractPhoneFromContact(match?.contact);
        }

        function renderHostNoteRow(match) {
            const note = (match.hostNote || '').trim();
            if (!note) return '';
            return `
                        <div class="flex justify-between gap-4">
                            <span class="text-[#777777] shrink-0">${i18n('match.note')}</span>
                            <span class="text-right font-medium text-[#333333]">${escapeHtml(note)}</span>
                        </div>`;
        }

        function renderActivitySummaryContent(activity) {
            const maxSlots = Number(activity.maxSlots ?? 6);
            const currentPlayers = Number(activity.currentPlayers ?? 0);
            const remainingSlots = Math.max(0, maxSlots - currentPlayers);
            const privateBadge = activity.isPrivate
                ? '<span class="session-private-badge">私人</span>'
                : '';
            const hostNote = (activity.hostNote || '').trim();
            const hostNoteLine = hostNote
                ? `<p class="mt-1 text-xs text-gray-500">${escapeHtml(hostNote)}</p>`
                : '';
            return `
                <div class="session-summary-main">
                    <p class="text-[10px] tracking-[0.12em] text-gray-400">${getActivityDateTimeLabel(activity)} ${privateBadge}</p>
                    <p class="mt-1 text-sm font-medium text-gray-900">${activity.region || ''} · ${activity.venue || ''}</p>
                    ${hostNoteLine}
                    <p class="mt-2 text-xs text-gray-500">HK$ ${activity.fee || 0} / 人 · 剩餘 ${remainingSlots} 位</p>
                </div>
            `;
        }

        function renderJoinedActivitySummary(activity) {
            const activityId = activity.firestoreId || activity.id;
            const bookId = getMatchBookId(activity);
            const joinStatus = getUserJoinStatus(activity);
            const statusBadge = joinStatus === 'pending'
                ? '<span class="session-status-badge session-status-badge--pending">待場主批准</span>'
                : '<span class="session-status-badge session-status-badge--approved">已批准</span>';
            const cancelLabel = joinStatus === 'pending' ? '取消申請' : '取消預約';
            const cancelBtn = (joinStatus === 'pending' || joinStatus === 'approved')
                ? `<button type="button" class="session-action-btn session-action-btn--cancel" onclick="cancelReservation('${escapeHtml(String(bookId))}')">${cancelLabel}</button>`
                : '';
            return `
                <div class="session-summary-row px-4 py-4">
                    ${renderActivitySummaryContent(activity)}
                    <div class="session-summary-actions">
                        ${statusBadge}
                        <button type="button" class="session-action-btn" onclick="openHostPaymentInfoModal('${escapeHtml(String(activityId))}')">場主付費資料</button>
                        ${cancelBtn}
                    </div>
                </div>
            `;
        }

        function renderHostedActivitySummary(activity) {
            const activityId = activity.firestoreId || activity.id;
            const pendingCount = getMatchPendingUids(activity).length;
            const pendingBadge = pendingCount > 0
                ? `<span class="session-status-badge session-status-badge--pending">${pendingCount} 待批准</span>`
                : '';
            return `
                <div class="session-summary-row px-4 py-4">
                    ${renderActivitySummaryContent(activity)}
                    <div class="session-summary-actions">
                        ${pendingBadge}
                        <button type="button" class="session-action-btn session-action-btn--primary" onclick="openHostManageModal('${escapeHtml(String(activityId))}')">管理</button>
                    </div>
                </div>
            `;
        }

        function getMatchBookId(match) {
            if (!match) return '';
            return match.id ?? match.firestoreId;
        }

        function findMatchByBookId(bookId) {
            const id = String(bookId);
            return matches.find(m => String(m.id) === id || String(m.firestoreId) === id) || null;
        }

        function getInviteIdFromUrl() {
            try {
                return new URLSearchParams(window.location.search).get('id')?.trim() || null;
            } catch (_err) {
                return null;
            }
        }

        function buildPrivateShareUrl(firestoreId) {
            const url = new URL(window.location.href);
            url.search = '';
            url.searchParams.set('id', firestoreId);
            return url.toString();
        }

        function buildMatchCardHtml(match, options = {}) {
            const { showPrivateBadge = false } = options;
            const maxSlots = Number(match.maxSlots ?? 6);
            const currentPlayers = Number(match.currentPlayers ?? 0);
            const isFull = currentPlayers >= maxSlots;
            const remainingSlots = Math.max(0, maxSlots - currentPlayers);
            const isOnWaitlist = isUserOnWaitlist(match);
            const joinStatus = getUserJoinStatus(match);
            const bookId = getMatchBookId(match);
            const isOwnHosted = isOwnHostedMatch(match);

            let actionHtml = '';
            if (joinStatus === 'approved') {
                actionHtml = `
                    <div class="match-book-actions">
                        <button type="button" class="match-book-btn match-book-btn-reserved" disabled>${i18n('match.reserved')}</button>
                        <button type="button" class="match-cancel-link" onclick="cancelReservation('${bookId}')">${i18n('match.cancelBooking')}</button>
                    </div>
                `;
            } else if (joinStatus === 'pending') {
                actionHtml = `
                    <div class="match-book-actions">
                        <button type="button" class="match-book-btn match-book-btn-pending" disabled>${i18n('match.pendingHost')}</button>
                        <button type="button" class="match-cancel-link" onclick="cancelReservation('${bookId}')">${i18n('match.cancelApplication')}</button>
                    </div>
                `;
            } else if (isFull) {
                actionHtml = `
                    <div class="match-book-actions">
                        <button
                            type="button"
                            onclick="bookMatch('${bookId}', this)"
                            class="match-book-btn match-book-btn-waitlist${isOnWaitlist ? ' is-active' : ''}"
                            ${isOnWaitlist ? 'disabled' : ''}
                        >
                            ${isOnWaitlist ? i18n('match.waitlistedBtn') : i18n('match.waitlistBtn')}
                        </button>
                    </div>
                `;
            } else {
                actionHtml = `
                    <div class="match-book-actions">
                        <button type="button" onclick="bookMatch('${bookId}', this)" class="match-book-btn">${i18n('match.bookBtn')}</button>
                    </div>
                `;
            }

            const district = match.region || '';
            const macroRegion = typeof getMatchMacroRegion === 'function' ? getMatchMacroRegion(match) : '';
            const hostOwnAttr = isOwnHosted ? ' data-host-own="true"' : '';

            return `
                <div data-macro-region="${escapeHtml(macroRegion)}" data-district="${escapeHtml(district)}"${hostOwnAttr} class="match-card bg-white rounded-xl p-5 border border-[#E5E5E5] flex flex-col justify-between relative transition-colors hover:bg-[#FCFCFC]">
                    <div class="match-card-header">
                        <div class="match-card-head">
                            ${renderMatchDateTimeCapsules(match, options)}
                            ${renderHostPublisherBlock(match)}
                        </div>
                        <span class="match-slots-pill">
                            ${isFull ? i18n('match.fullLabel') : i18n('match.remaining', { n: remainingSlots })}
                        </span>
                    </div>

                    <div class="border-y border-[#E5E5E5] py-4 space-y-3 text-sm tracking-[0.05em] leading-relaxed">
                        <div class="flex justify-between gap-4">
                            <span class="text-[#777777]">${i18n('match.location')}</span>
                            <span class="text-right font-medium text-[#333333]">${txPlace(match.region)} · ${txPlace(match.venue)}</span>
                        </div>
                        ${renderHostNoteRow(match)}
                        <div class="flex justify-between gap-4">
                            <span class="text-[#777777]">${i18n('match.fee')}</span>
                            <span class="font-medium text-[#333333]">${i18n('match.feePerPerson', { fee: match.fee })}</span>
                        </div>
                        <div class="flex justify-between gap-4">
                            <span class="text-[#777777]">${i18n('match.slotsLabel')}</span>
                            <span class="font-medium text-[#333333]">${isFull ? i18n('match.fullLabel') : i18n('match.remaining', { n: remainingSlots })}</span>
                        </div>
                        ${renderParticipantsBlock(match)}
                    </div>

                    <div class="pt-5">${actionHtml}</div>
                </div>
            `;
        }

        function renderInviteMatchSection() {
            const section = document.getElementById('invite-match-section');
            if (!section) return;

            if (!inviteMatch || inviteMatch.isPrivate !== true) {
                section.classList.add('hidden');
                section.innerHTML = '';
                return;
            }

            if (isMatchEnded(inviteMatch)) {
                section.classList.remove('hidden');
                section.innerHTML = `
                    <div class="invite-match-wrap">
                        <p class="invite-match-note">${i18n('invite.expired')}</p>
                    </div>
                `;
                return;
            }

            section.classList.remove('hidden');
            section.innerHTML = `
                <div class="invite-match-wrap">
                    <p class="invite-match-note">${i18n('invite.viaLink')}</p>
                    ${buildMatchCardHtml(inviteMatch, { showPrivateBadge: true })}
                </div>
            `;
            const inviteCard = section.querySelector('.match-card');
            if (inviteCard) {
                inviteCard.classList.add('match-card--mount-enter');
                bindMatchCardEnterAnimation(inviteCard);
            }
        }

        function bindMatchCardEnterAnimation(card) {
            if (!card) return;
            const cleanup = event => {
                if (event.animationName !== 'matchCardEnter') return;
                card.classList.remove('match-card--mount-enter');
                card.removeEventListener('animationend', cleanup);
            };
            card.addEventListener('animationend', cleanup);
        }

        async function loadInviteActivity() {
            inviteActivityId = getInviteIdFromUrl();
            inviteMatch = null;
            if (!inviteActivityId) {
                renderInviteMatchSection();
                return;
            }

            const bridgeReady = await waitForDbBridge();
            if (!bridgeReady || typeof window.dbFetchActivityById !== 'function') {
                renderInviteMatchSection();
                return;
            }

            try {
                const activity = await window.dbFetchActivityById(inviteActivityId);
                if (!activity) {
                    inviteMatch = null;
                    renderInviteMatchSection();
                    return;
                }

                if (!activity.id) {
                    activity.id = activity.firestoreId;
                }
                inviteMatch = activity;

                const existingIndex = matches.findIndex(
                    m => String(m.firestoreId) === String(activity.firestoreId) || String(m.id) === String(activity.id)
                );
                if (existingIndex >= 0) {
                    matches[existingIndex] = { ...matches[existingIndex], ...activity };
                } else {
                    matches.push(activity);
                    saveMatches();
                }
            } catch (err) {
                console.error('載入專屬連結球局失敗:', err);
                inviteMatch = null;
            }

            renderInviteMatchSection();
        }

        async function openPrivateShareModal(firestoreId) {
            const modal = document.getElementById('private-share-modal');
            const urlInput = document.getElementById('private-share-url');
            if (!modal || !urlInput || !firestoreId) return;
            urlInput.value = buildPrivateShareUrl(firestoreId);
            if (typeof window.openMujiOverlay === 'function') {
                await window.openMujiOverlay(modal);
            } else {
                modal.classList.remove('hidden');
            }
        }

        async function closePrivateShareModal() {
            const modal = document.getElementById('private-share-modal');
            if (!modal) return;
            if (typeof window.closeMujiOverlay === 'function') {
                await window.closeMujiOverlay(modal);
            } else {
                modal.classList.add('hidden');
            }
        }

        async function copyShareUrlToClipboard(urlInput) {
            const link = urlInput?.value?.trim() || '';
            if (!link) return;
            try {
                await navigator.clipboard.writeText(link);
                i18nAlert('alert.linkCopied');
            } catch (_err) {
                urlInput?.select();
                document.execCommand?.('copy');
                i18nAlert('alert.linkCopied');
            }
        }

        async function copyPrivateShareLink() {
            await copyShareUrlToClipboard(document.getElementById('private-share-url'));
        }

        function bindPrivateShareUI() {
            document.getElementById('private-share-copy-btn')?.addEventListener('click', copyPrivateShareLink);
            document.getElementById('private-share-close')?.addEventListener('click', closePrivateShareModal);
            document.getElementById('private-share-done-btn')?.addEventListener('click', closePrivateShareModal);
        }

        async function renderMyActivities() {
            const hostedContainer = document.getElementById('my-hosted-activities');
            const joinedContainer = document.getElementById('my-joined-activities');
            if (!hostedContainer || !joinedContainer) return;

            if (!window.firebaseAuthUid) {
                hostedContainer.innerHTML = `<div class="px-4 py-5 text-center text-xs text-gray-400">${i18n('profile.hostedEmpty')}</div>`;
                joinedContainer.innerHTML = `<div class="px-4 py-5 text-center text-xs text-gray-400">${i18n('profile.joinedEmpty')}</div>`;
                return;
            }

            const bridgeReady = await waitForDbBridge();
            if (!bridgeReady) {
                hostedContainer.innerHTML = `<div class="px-4 py-5 text-center text-xs text-gray-400">${i18n('profile.cloudOffline')}</div>`;
                joinedContainer.innerHTML = `<div class="px-4 py-5 text-center text-xs text-gray-400">${i18n('profile.cloudOffline')}</div>`;
                return;
            }

            try {
                const [hosted, joined] = await Promise.all([
                    window.dbFetchMyHostedActivities(MY_SESSIONS_LIMIT),
                    window.dbFetchMyJoinedActivities(MY_SESSIONS_LIMIT)
                ]);
                const recentHosted = sortActivitiesByRecency(hosted).slice(0, MY_SESSIONS_LIMIT);
                const recentJoined = sortActivitiesByRecency(joined).slice(0, MY_SESSIONS_LIMIT);

                hostedContainer.innerHTML = recentHosted.length
                    ? recentHosted.map(renderHostedActivitySummary).join('')
                    : `<div class="px-4 py-5 text-center text-xs text-gray-400">${i18n('profile.noHosted')}</div>`;
                joinedContainer.innerHTML = recentJoined.length
                    ? recentJoined.map(renderJoinedActivitySummary).join('')
                    : `<div class="px-4 py-5 text-center text-xs text-gray-400">${i18n('profile.noJoined')}</div>`;
            } catch (err) {
                console.error('讀取我的場次失敗:', err);
                hostedContainer.innerHTML = `<div class="px-4 py-5 text-center text-xs text-gray-400">${i18n('profile.loadFailed')}</div>`;
                joinedContainer.innerHTML = `<div class="px-4 py-5 text-center text-xs text-gray-400">${i18n('profile.loadFailed')}</div>`;
            }
        }

        window.renderMyActivities = renderMyActivities;

        let renderMatchesGeneration = 0;

        // 渲染搵波打列表（私人球局僅場主本人與專屬連結訪客可見）
        async function renderMatches() {
            const generation = ++renderMatchesGeneration;
            const listContainer = document.getElementById('matches-list');
            if (!listContainer) return;
            listContainer.innerHTML = '';

            let filtered = matches.filter(m => canShowMatchInLobby(m));
            filtered = filtered.filter(m => isMatchActive(m) || isOwnHostedMatch(m));
            if (homeSelectedDate) {
                filtered = filtered.filter(m => m.playDate === homeSelectedDate || isOwnHostedMatch(m));
            }

            if (filtered.length === 0) {
                const lobbyVisibleCount = matches.filter(m => canShowMatchInLobby(m)).length;
                const filterState = typeof window.getLobbyFilterState === 'function'
                    ? window.getLobbyFilterState()
                    : { hasActiveRegionFilter: false };
                const emptyMsg = inviteMatch && inviteMatch.isPrivate
                    ? i18n('match.emptyLobbyPrivate')
                    : lobbyVisibleCount === 0
                      ? i18n('match.empty')
                      : homeSelectedDate
                        ? i18n('match.emptyLobbyDate', { date: formatDateDisplay(homeSelectedDate) })
                        : filterState.hasActiveRegionFilter
                          ? i18n('match.emptyFiltered')
                          : i18n('match.emptyLobbyRegion');
                if (inviteMatch) {
                    await prefetchParticipantAttendance(getActivityParticipants(inviteMatch).map(p => p.uid));
                    if (inviteMatch.hostUid) await prefetchHostProfiles([inviteMatch.hostUid]);
                }
                renderInviteMatchSection();
                listContainer.innerHTML = `<div class="text-center py-12 text-gray-400 text-xs">${emptyMsg}</div>`;
                saveMatches();
                renderCalendar('home');
                if (typeof applyRegionFilter === 'function') applyRegionFilter();
                return;
            }

            const prefetchMatches = inviteMatch ? [...filtered, inviteMatch] : filtered;
            const participantUids = prefetchMatches.flatMap(match => getActivityParticipants(match).map(p => p.uid));
            const hostUids = prefetchMatches.map(match => match.hostUid).filter(Boolean);
            await Promise.all([
                prefetchParticipantAttendance(participantUids),
                prefetchHostProfiles(hostUids)
            ]);

            if (generation !== renderMatchesGeneration) return;

            renderInviteMatchSection();

            filtered.forEach((match, index) => {
                const card = document.createElement('div');
                card.innerHTML = buildMatchCardHtml(match);
                const el = card.firstElementChild || card;
                el.style.setProperty('--card-enter-delay', `${Math.min(index * 40, 240)}ms`);
                el.classList.add('match-card--mount-enter');
                bindMatchCardEnterAnimation(el);
                listContainer.appendChild(el);
            });
            saveMatches();
            renderCalendar('home');
            if (typeof applyRegionFilter === 'function') applyRegionFilter();
        }

        async function bookMatch(id, btn) {
            const match = findMatchByBookId(id) || (inviteMatch && String(getMatchBookId(inviteMatch)) === String(id) ? inviteMatch : null);
            if (!match) return;

            if (isMatchEnded(match)) {
                i18nAlert('alert.sessionEnded');
                await renderMatches();
                renderInviteMatchSection();
                return;
            }

            if (!window.firebaseAuthUid) {
                i18nAlert('alert.loginPlus1Book');
                return;
            }

            const maxSlots = Number(match.maxSlots ?? 6);
            match.currentPlayers = Number(match.currentPlayers ?? 0);
            if (!Array.isArray(match.waitlist)) match.waitlist = [];
            const joinStatus = getUserJoinStatus(match);
            if (joinStatus === 'approved') {
                i18nAlert('alert.alreadyBooked');
                return;
            }
            if (joinStatus === 'pending') {
                i18nAlert('alert.pendingApproval');
                return;
            }

            const isFull = match.currentPlayers >= maxSlots;

            if (!isFull) {
                openPaymentPanel(id);
                return;
            }

            if (isUserOnWaitlist(match)) {
                i18nAlert('alert.waitlisted');
                await renderMatches();
                return;
            }

            if (!match.firestoreId) {
                i18nAlert('alert.waitlistOffline');
                return;
            }

            const originalText = btn ? btn.textContent : '';
            try {
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = '加入中...';
                }

                const bridgeReady = await waitForDbBridge();
                if (!bridgeReady || typeof window.dbJoinWaitlist !== 'function') {
                    throw new Error('雲端資料庫暫時未連線');
                }

                const result = await window.dbJoinWaitlist(match);
                if (!Array.isArray(match.waitlist)) match.waitlist = [];
                if (!match.waitlist.includes(window.firebaseAuthUid)) {
                    match.waitlist.push(window.firebaseAuthUid);
                }

                saveMatches();
                await loadActivitiesFromCloud();
                await renderMatches();
                renderInviteMatchSection();
                i18nAlert(result?.alreadyWaitlisted ? 'alert.waitlistAlready' : 'alert.waitlistSuccess');
            } catch (err) {
                console.error('加入後補失敗:', err);
                if (err?.code === 'activity/ended') {
                    i18nAlert('alert.sessionEndedWaitlist');
                    await renderMatches();
                    renderInviteMatchSection();
                    return;
                }
                const code = err?.code ? `（${err.code}）` : '';
                i18nAlert('alert.waitlistFailed', { code });
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = originalText || '加入後補 (Waitlist)';
                }
            }
        }

        async function togglePaymentSheet(show) {
            const sheet = document.getElementById('payment-sheet');
            const newHostTip = document.getElementById('payment-new-host-tip');
            if (!sheet) return;

            if (show) {
                if (typeof window.openMujiOverlay === 'function') {
                    await window.openMujiOverlay(sheet);
                } else {
                    sheet.classList.remove('hidden');
                }
                return;
            }

            pendingPaymentMatchId = null;
            pendingPaymeLink = '';
            newHostTip?.classList.add('hidden');
            if (typeof window.closeMujiOverlay === 'function') {
                await window.closeMujiOverlay(sheet);
            } else {
                sheet.classList.add('hidden');
            }
        }

        async function openPaymentPanel(matchId) {
            const match = findMatchByBookId(matchId) || (inviteMatch && String(getMatchBookId(inviteMatch)) === String(matchId) ? inviteMatch : null);
            if (!match) return;

            if (isMatchEnded(match)) {
                i18nAlert('alert.sessionEnded');
                return;
            }

            const joinStatus = getUserJoinStatus(match);
            if (joinStatus === 'approved') {
                i18nAlert('alert.alreadyBooked');
                return;
            }
            if (joinStatus === 'pending') {
                i18nAlert('alert.pendingApproval');
                return;
            }

            pendingPaymentMatchId = matchId;

            let remoteHostSettings = null;
            if (match.hostUid && typeof window.dbFetchHostPaymentSettings === 'function') {
                try {
                    const bridgeReady = await waitForDbBridge();
                    if (bridgeReady) {
                        remoteHostSettings = await window.dbFetchHostPaymentSettings(match.hostUid);
                    }
                } catch (err) {
                    console.error('讀取場主收款碼失敗:', err);
                }
            }

            const payment = getHostPaymentInfo(match, remoteHostSettings);
            pendingPaymeLink = payment.paymeLink;

            document.getElementById('payment-venue-label').textContent = [
                `${match.venue} · ${match.region}`,
                (match.hostNote || '').trim()
            ].filter(Boolean).join(' · ');
            document.getElementById('payment-fee').textContent = `HK$ ${match.fee}`;

            renderPaymentQrSlot('payment-payme-qr', payment.paymeQrUrl, 'PayMe QR Code');
            renderPaymentQrSlot('payment-fps-qr', payment.fpsQrUrl, 'FPS QR Code');

            const whatsappNumber = getHostWhatsAppNumber(match, remoteHostSettings);
            const whatsappLabel = document.getElementById('payment-whatsapp-label');
            const whatsappBtn = document.getElementById('payment-whatsapp-btn');
            if (whatsappLabel) {
                whatsappLabel.textContent = whatsappNumber
                    ? `WhatsApp：${whatsappNumber}`
                    : '場主尚未設定 WhatsApp 號碼';
            }
            if (whatsappBtn) {
                whatsappBtn.disabled = !buildWhatsAppUrl(whatsappNumber);
            }

            const newHostTip = document.getElementById('payment-new-host-tip');
            if (match.hostUid) {
                await prefetchHostProfiles([match.hostUid]);
                const hostProfile = getHostProfile(match.hostUid);
                newHostTip?.classList.toggle('hidden', hostProfile?.tier !== 'newbie');
            } else {
                newHostTip?.classList.add('hidden');
            }

            togglePaymentSheet(true);
        }

        function jumpToPayMe() {
            if (!pendingPaymeLink) {
                i18nAlert('alert.noPayme');
                return;
            }
            const url = pendingPaymeLink.startsWith('http')
                ? pendingPaymeLink
                : `https://${pendingPaymeLink}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        }

        function jumpToHostWhatsApp() {
            const match = pendingPaymentMatchId
                ? findMatchByBookId(pendingPaymentMatchId) || (inviteMatch && String(getMatchBookId(inviteMatch)) === String(pendingPaymentMatchId) ? inviteMatch : null)
                : null;
            const whatsappNumber = getHostWhatsAppNumber(match);
            const url = buildWhatsAppUrl(whatsappNumber);
            if (!url) {
                i18nAlert('alert.noWhatsapp');
                return;
            }
            window.open(url, '_blank', 'noopener,noreferrer');
        }

        function bindPaymentActions() {
            document.getElementById('payment-payme-jump-btn')?.addEventListener('click', jumpToPayMe);
            document.getElementById('payment-whatsapp-btn')?.addEventListener('click', jumpToHostWhatsApp);
        }

        let hostSettingsBound = false;

        async function showHostSettingsPanel() {
            const panel = document.getElementById('host-settings-panel');
            const profilePanel = document.getElementById('profile-edit-panel');
            const hostBtn = document.getElementById('edit-host-payment-btn');
            const profileBtn = document.getElementById('edit-profile-btn');
            if (profilePanel) profilePanel.classList.add('hidden');
            if (profileBtn) profileBtn.classList.remove('is-active-profile-action');

            const opening = panel?.classList.contains('hidden');
            if (panel) panel.classList.toggle('hidden');
            if (hostBtn) hostBtn.classList.toggle('is-active-profile-action');
            if (opening) await refreshHostPaymentSettings();
        }

        async function uploadCroppedHostQr(type, croppedFile) {
            if (!window.firebaseAuthUid) {
                i18nAlert('alert.loginPlus1Payment');
                const error = new Error('請先登入後再上傳收款碼');
                error.code = 'auth/not-signed-in';
                throw error;
            }

            const bridgeReady = await waitForDbBridge();
            if (!bridgeReady || typeof window.dbUploadHostPaymentQr !== 'function') {
                throw new Error('雲端上傳服務暫時未連線');
            }

            let localPreviewUrl = null;
            try {
                if (typeof window.readFilePreviewUrl === 'function') {
                    localPreviewUrl = await window.readFilePreviewUrl(croppedFile);
                    if (typeof window.setHostQrLocalPreview === 'function') {
                        window.setHostQrLocalPreview(type, localPreviewUrl, { uploading: true });
                    }
                }

                setHostPaymentStatus('上傳中...');
                const downloadUrl = await window.dbUploadHostPaymentQr(type, croppedFile);

                const preview = document.getElementById(getHostQrPreviewId(type));
                if (preview) delete preview.dataset.previewSource;

                cachedOwnHostSettings = {
                    ...(cachedOwnHostSettings || getEmptyHostSettings()),
                    [type === 'payme' ? 'paymeQrUrl' : 'fpsQrUrl']: downloadUrl
                };
                renderHostQrPreview(getHostQrPreviewId(type), downloadUrl, false);
                setHostPaymentStatus(`${type === 'payme' ? 'PayMe' : 'FPS'} QR 已上傳至雲端`);
            } catch (err) {
                const preview = document.getElementById(getHostQrPreviewId(type));
                if (preview?.dataset.previewSource === 'local' && localPreviewUrl) {
                    renderHostQrPreview(getHostQrPreviewId(type), localPreviewUrl, false);
                }
                throw err;
            }
        }

        window.uploadCroppedHostQr = uploadCroppedHostQr;

        async function saveHostPaymentSettings() {
            const saveBtn = document.getElementById('save-host-payment-btn');
            const fpsInput = document.getElementById('host-fps-id-input');
            const fpsId = fpsInput ? fpsInput.value.trim() : '';

            if (!window.firebaseAuthUid) {
                i18nAlert('alert.loginPlus1SavePayment');
                return;
            }

            const fpsChanged = fpsId !== (cachedOwnHostSettings?.fpsId || '');
            if (!fpsChanged) {
                i18nAlert('alert.noPaymentChanges');
                return;
            }

            const bridgeReady = await waitForDbBridge();
            if (!bridgeReady) {
                i18nAlert('alert.cloudOffline');
                return;
            }

            const originalText = saveBtn ? saveBtn.textContent : '';
            try {
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.textContent = '儲存中...';
                }
                setHostPaymentStatus('儲存中...');

                if (fpsChanged && typeof window.dbSaveHostFpsId === 'function') {
                    await window.dbSaveHostFpsId(fpsId);
                    cachedOwnHostSettings = {
                        ...(cachedOwnHostSettings || getEmptyHostSettings()),
                        fpsId
                    };
                }

                applyHostSettingsToUI(cachedOwnHostSettings || getEmptyHostSettings());
                setHostPaymentStatus('WhatsApp 號碼已儲存');
                i18nAlert('alert.whatsappSaved');
            } catch (err) {
                console.error('儲存收款設定失敗:', err);
                const code = err?.code ? `（${err.code}）` : '';
                i18nAlert('alert.paymentSaveFailed', { code });
                setHostPaymentStatus('儲存失敗');
                await refreshHostPaymentSettings();
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = originalText || '儲存設定';
                }
            }
        }

        function bindHostSettingsUI() {
            if (hostSettingsBound) return;
            hostSettingsBound = true;

            document.getElementById('edit-host-payment-btn')?.addEventListener('click', () => {
                showHostSettingsPanel();
            });

            document.getElementById('save-host-payment-btn')?.addEventListener('click', saveHostPaymentSettings);
        }

        window.bindHostSettingsUI = bindHostSettingsUI;
        window.showHostSettingsPanel = showHostSettingsPanel;
        window.refreshHostPaymentSettings = refreshHostPaymentSettings;

        async function confirmBooking() {
            if (!pendingPaymentMatchId) return;

            const match = findMatchByBookId(pendingPaymentMatchId) || (inviteMatch && String(getMatchBookId(inviteMatch)) === String(pendingPaymentMatchId) ? inviteMatch : null);
            if (!match) {
                togglePaymentSheet(false);
                return;
            }
            if (isMatchEnded(match)) {
                togglePaymentSheet(false);
                i18nAlert('alert.sessionEnded');
                return;
            }
            if (!window.firebaseAuthUid) {
                i18nAlert('alert.loginPlus1Book');
                return;
            }

            const authUid = window.firebaseAuthUid;
            const currentUserName = getCurrentUserName();
            const authEmail = window.firebaseAuthUser?.email || null;

            try {
                const bridgeReady = await waitForDbBridge();
                if (!bridgeReady || typeof window.dbReserveActivity !== 'function') {
                    throw new Error('雲端資料庫暫時未連線');
                }

                const result = await window.dbReserveActivity(match);
                await loadActivitiesFromCloud();

                if (!Array.isArray(match.waitlist)) match.waitlist = [];
                match.waitlist = match.waitlist.filter(uid => uid !== authUid);
                if (!Array.isArray(match.pendingParticipantUids)) match.pendingParticipantUids = [];
                if (!match.pendingParticipantUids.includes(authUid)) {
                    match.pendingParticipantUids.push(authUid);
                }
                if (!match.participants || typeof match.participants !== 'object') match.participants = {};
                match.participants[authUid] = {
                    uid: authUid,
                    displayName: currentUserName,
                    email: authEmail,
                    photoURL: window.firebaseAuthUser?.photoURL || null,
                    status: 'pending'
                };

                saveMatches();
                togglePaymentSheet(false);
                await renderMatches();
                renderInviteMatchSection();
                await renderMyActivities();
                i18nAlert(result?.alreadyJoined ? 'alert.bookingAlready' : 'alert.bookingSuccess');
            } catch (err) {
                console.error('提交報名失敗:', err);
                if (err?.code === 'activity/ended') {
                    togglePaymentSheet(false);
                    i18nAlert('alert.sessionEnded');
                    await renderMatches();
                    renderInviteMatchSection();
                    return;
                }
                const code = err?.code ? `（${err.code}）` : '';
                i18nAlert('alert.bookingFailed', { code });
            }
        }

        window.confirmBooking = confirmBooking;

        let currentHostPaymentActivityId = null;
        let currentHostManageActivityId = null;

        async function closeHostPaymentInfoModal() {
            const modal = document.getElementById('host-payment-info-modal');
            currentHostPaymentActivityId = null;
            if (!modal) return;
            if (typeof window.closeMujiOverlay === 'function') {
                await window.closeMujiOverlay(modal);
            } else {
                modal.classList.add('hidden');
            }
        }

        async function closeHostManageModal() {
            const modal = document.getElementById('host-manage-modal');
            currentHostManageActivityId = null;
            if (!modal) return;
            if (typeof window.closeMujiOverlay === 'function') {
                await window.closeMujiOverlay(modal);
            } else {
                modal.classList.add('hidden');
            }
        }

        async function openHostPaymentInfoModal(activityId) {
            if (!activityId) return;

            const modal = document.getElementById('host-payment-info-modal');
            const subtitle = document.getElementById('host-payment-info-subtitle');
            const body = document.getElementById('host-payment-info-body');
            if (!modal || !body) return;

            currentHostPaymentActivityId = activityId;

            let activity = matches.find(m => String(m.firestoreId) === String(activityId) || String(m.id) === String(activityId)) || null;
            const bridgeReady = await waitForDbBridge();
            if (bridgeReady && typeof window.dbFetchActivityById === 'function') {
                try {
                    const fresh = await window.dbFetchActivityById(activityId);
                    if (fresh) activity = fresh;
                } catch (err) {
                    console.error('讀取場次失敗:', err);
                }
            }

            if (!activity) {
                i18nAlert('alert.activityNotFound');
                return;
            }

            let remoteHostSettings = null;
            if (activity.hostUid && bridgeReady && typeof window.dbFetchHostPaymentSettings === 'function') {
                try {
                    remoteHostSettings = await window.dbFetchHostPaymentSettings(activity.hostUid);
                } catch (err) {
                    console.error('讀取場主收款設定失敗:', err);
                }
            }

            const payment = getHostPaymentInfo(activity, remoteHostSettings);
            const phone = extractPhoneFromContact(activity.contact);
            const whatsappNumber = getHostWhatsAppNumber(activity, remoteHostSettings);
            const whatsappUrl = buildWhatsAppUrl(whatsappNumber);

            if (subtitle) {
                subtitle.textContent = `${activity.venue || ''} · ${activity.region || ''}`;
            }

            const phoneRow = phone
                ? `<a href="tel:${escapeHtml(phone)}" class="host-info-link">📞 ${escapeHtml(phone)}</a>`
                : '<p class="host-info-empty">場主尚未提供電話</p>';
            const whatsappRow = whatsappUrl
                ? `<a href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="host-info-action host-info-action--whatsapp">WhatsApp 聯絡場主${whatsappNumber ? `（${escapeHtml(whatsappNumber)}）` : ''}</a>`
                : '<p class="host-info-empty">場主尚未設定 WhatsApp 號碼</p>';

            const paymeQrHtml = payment.paymeQrUrl
                ? `<img src="${escapeHtml(payment.paymeQrUrl)}" alt="PayMe QR Code" class="host-info-qr-image" loading="lazy">`
                : '<p class="host-info-empty">場主尚未上傳 PayMe QR</p>';
            const fpsQrHtml = payment.fpsQrUrl
                ? `<img src="${escapeHtml(payment.fpsQrUrl)}" alt="FPS QR Code" class="host-info-qr-image" loading="lazy">`
                : '<p class="host-info-empty">場主尚未上傳 FPS QR</p>';

            body.innerHTML = `
                <div class="host-info-section">
                    <p class="host-info-label">場主電話</p>
                    ${phoneRow}
                </div>
                <div class="host-info-section">
                    <p class="host-info-label">WhatsApp 號碼</p>
                    ${whatsappRow}
                </div>
                <div class="host-info-qr-grid">
                    <section class="host-info-qr-block">
                        <p class="host-info-label">PayMe QR</p>
                        ${paymeQrHtml}
                        ${payment.paymeLink ? `<button type="button" class="host-info-action" onclick="openHostInfoPayme('${escapeHtml(payment.paymeLink)}')">一鍵跳轉 PayMe</button>` : ''}
                    </section>
                    <section class="host-info-qr-block">
                        <p class="host-info-label">FPS QR</p>
                        ${fpsQrHtml}
                    </section>
                </div>
            `;

            if (typeof window.openMujiOverlay === 'function') {
                await window.openMujiOverlay(modal);
            } else {
                modal.classList.remove('hidden');
            }
        }

        window.openHostPaymentInfoModal = openHostPaymentInfoModal;

        window.openHostInfoPayme = function openHostInfoPayme(link) {
            if (!link) {
                i18nAlert('alert.noPayme');
                return;
            }
            const url = link.startsWith('http') ? link : `https://${link}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        };

        function renderHostManageParticipantRow(participant, { pending = false, activityId } = {}) {
            const name = escapeHtml(participant.name || '波友');
            const uid = escapeHtml(participant.uid || '');
            const avatarHtml = participant.photoURL
                ? `<img src="${escapeHtml(participant.photoURL)}" alt="${name}" class="session-manage-avatar-image">`
                : `<span class="session-manage-avatar-initial">${escapeHtml((participant.name || '友').charAt(0))}</span>`;

            const actions = pending
                ? `
                    <div class="session-manage-actions">
                        <button type="button" class="session-manage-btn session-manage-btn--approve" onclick="handleApproveParticipant('${escapeHtml(activityId)}', '${uid}')">批准</button>
                        <button type="button" class="session-manage-btn session-manage-btn--reject" onclick="handleRejectParticipant('${escapeHtml(activityId)}', '${uid}')">拒絕</button>
                    </div>
                `
                : '<span class="session-manage-approved-tag">已批准</span>';

            return `
                <div class="session-manage-item">
                    <div class="session-manage-user">
                        <div class="session-manage-avatar">${avatarHtml}</div>
                        <span class="session-manage-name">${name}</span>
                    </div>
                    ${actions}
                </div>
            `;
        }

        function getPendingParticipants(activity) {
            const approvedUids = new Set(
                Array.isArray(activity?.participantUids) ? activity.participantUids : []
            );
            const pendingUids = getMatchPendingUids(activity).filter(uid => !approvedUids.has(uid));
            const participants = activity?.participants && typeof activity.participants === 'object'
                ? activity.participants
                : {};
            return pendingUids.map(uid => {
                const profile = participants[uid] || {};
                const rawName = profile.displayName || profile.name || '波友';
                const name = String(rawName).replace(/^波友_/, '').trim() || '波友';
                return {
                    uid,
                    name,
                    photoURL: profile.photoURL || null
                };
            });
        }

        async function openHostManageModal(activityId) {
            if (!activityId) return;
            if (!window.firebaseAuthUid) {
                i18nAlert('alert.loginPlus1');
                return;
            }

            const modal = document.getElementById('host-manage-modal');
            const subtitle = document.getElementById('host-manage-subtitle');
            const slotsEl = document.getElementById('host-manage-slots');
            const shareWrap = document.getElementById('host-manage-share-wrap');
            const shareUrlInput = document.getElementById('host-manage-share-url');
            const listEl = document.getElementById('host-manage-participants');
            const emptyEl = document.getElementById('host-manage-empty');
            if (!modal || !listEl) return;

            currentHostManageActivityId = activityId;

            let activity = null;
            const bridgeReady = await waitForDbBridge();
            if (bridgeReady && typeof window.dbFetchActivityById === 'function') {
                try {
                    activity = await window.dbFetchActivityById(activityId);
                } catch (err) {
                    console.error('讀取場次失敗:', err);
                }
            }
            if (!activity) {
                activity = matches.find(m => String(m.firestoreId) === String(activityId) || String(m.id) === String(activityId)) || null;
            }
            if (!activity) {
                i18nAlert('alert.activityNotFound');
                return;
            }
            if (activity.hostUid !== window.firebaseAuthUid) {
                i18nAlert('alert.hostOnly');
                return;
            }

            const maxSlots = Number(activity.maxSlots ?? 6);
            const currentPlayers = Number(activity.currentPlayers ?? 0);
            const pendingList = getPendingParticipants(activity);
            const approvedList = getActivityParticipants(activity);

            if (subtitle) {
                subtitle.textContent = `${activity.venue || ''} · ${activity.region || ''}`;
            }
            if (slotsEl) {
                slotsEl.textContent = `已批准 ${currentPlayers} / ${maxSlots} 位 · ${pendingList.length} 人待批准`;
            }

            if (shareWrap && shareUrlInput) {
                const isPrivate = activity.isPrivate === true;
                shareWrap.classList.toggle('hidden', !isPrivate);
                shareUrlInput.value = isPrivate ? buildPrivateShareUrl(activityId) : '';
            }

            const approvedHtml = approvedList.length
                ? `<p class="session-manage-group-label">已批准</p>${approvedList.map(p => renderHostManageParticipantRow(p, { pending: false, activityId })).join('')}`
                : '';
            const pendingHtml = pendingList.length
                ? `<p class="session-manage-group-label">待批准</p>${pendingList.map(p => renderHostManageParticipantRow(p, { pending: true, activityId })).join('')}`
                : '';

            listEl.innerHTML = pendingHtml + approvedHtml;

            if (emptyEl) {
                const isEmpty = !pendingList.length && !approvedList.length;
                emptyEl.classList.toggle('hidden', !isEmpty);
            }

            if (typeof window.openMujiOverlay === 'function') {
                await window.openMujiOverlay(modal);
            } else {
                modal.classList.remove('hidden');
            }
        }

        window.openHostManageModal = openHostManageModal;

        function removeMatchFromLocalState(activityId) {
            const id = String(activityId);
            matches = matches.filter(
                m => String(m.firestoreId) !== id && String(m.id) !== id
            );
            if (inviteMatch && (String(inviteMatch.firestoreId) === id || String(inviteMatch.id) === id)) {
                inviteMatch = null;
            }
            saveMatches();
        }

        async function openDeleteActivityConfirmModal() {
            const modal = document.getElementById('delete-activity-confirm-modal');
            if (!modal) return;
            const confirmBtn = document.getElementById('delete-activity-confirm-btn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = '確定刪除';
            }
            if (typeof window.openMujiOverlay === 'function') {
                await window.openMujiOverlay(modal);
            } else {
                modal.classList.remove('hidden');
            }
        }

        async function closeDeleteActivityConfirmModal() {
            const modal = document.getElementById('delete-activity-confirm-modal');
            if (!modal) return;
            if (typeof window.closeMujiOverlay === 'function') {
                await window.closeMujiOverlay(modal);
            } else {
                modal.classList.add('hidden');
            }
        }

        async function handleDeleteHostedActivity() {
            const activityId = currentHostManageActivityId;
            if (!activityId) return;
            if (!window.firebaseAuthUid) {
                i18nAlert('alert.loginPlus1');
                return;
            }
            await openDeleteActivityConfirmModal();
        }

        async function confirmDeleteHostedActivity() {
            const activityId = currentHostManageActivityId;
            if (!activityId) return;

            const confirmBtn = document.getElementById('delete-activity-confirm-btn');
            const originalText = confirmBtn ? confirmBtn.textContent : '';
            try {
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = '刪除中...';
                }

                const bridgeReady = await waitForDbBridge();
                if (!bridgeReady || typeof window.dbDeleteActivity !== 'function') {
                    throw new Error('雲端資料庫暫時未連線');
                }

                await window.dbDeleteActivity(activityId);
                removeMatchFromLocalState(activityId);
                await closeDeleteActivityConfirmModal();
                await closeHostManageModal();
                await loadActivitiesFromCloud();
                await renderMyActivities();
                await renderMatches();
                renderInviteMatchSection();
            } catch (err) {
                console.error('刪除場次失敗:', err);
                await closeDeleteActivityConfirmModal();
                if (err?.code === 'permission-denied') {
                    i18nAlert('alert.deleteDenied');
                    return;
                }
                const code = err?.code ? `（${err.code}）` : '';
                i18nAlert('alert.deleteFailed', { code });
            } finally {
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = originalText || '確定刪除';
                }
            }
        }

        window.handleDeleteHostedActivity = handleDeleteHostedActivity;

        async function handleApproveParticipant(activityId, participantUid) {
            if (!activityId || !participantUid) return;
            try {
                const bridgeReady = await waitForDbBridge();
                if (!bridgeReady || typeof window.dbApproveParticipant !== 'function') {
                    throw new Error('雲端資料庫暫時未連線');
                }
                await window.dbApproveParticipant(activityId, participantUid);
                await loadActivitiesFromCloud();
                await openHostManageModal(activityId);
                await renderMyActivities();
                await renderMatches();
                renderInviteMatchSection();
            } catch (err) {
                console.error('批准報名失敗:', err);
                const code = err?.code ? `（${err.code}）` : '';
                i18nAlert('alert.approveFailed', { code });
            }
        }

        async function handleRejectParticipant(activityId, participantUid) {
            if (!activityId || !participantUid) return;
            const confirmed = confirm('確定拒絕此球友的報名申請？');
            if (!confirmed) return;
            try {
                const bridgeReady = await waitForDbBridge();
                if (!bridgeReady || typeof window.dbRejectParticipant !== 'function') {
                    throw new Error('雲端資料庫暫時未連線');
                }
                await window.dbRejectParticipant(activityId, participantUid);
                await loadActivitiesFromCloud();
                await openHostManageModal(activityId);
                await renderMyActivities();
                await renderMatches();
                renderInviteMatchSection();
            } catch (err) {
                console.error('拒絕報名失敗:', err);
                const code = err?.code ? `（${err.code}）` : '';
                i18nAlert('alert.rejectFailed', { code });
            }
        }

        window.handleApproveParticipant = handleApproveParticipant;
        window.handleRejectParticipant = handleRejectParticipant;

        function bindSessionModals() {
            document.getElementById('host-payment-info-close')?.addEventListener('click', closeHostPaymentInfoModal);
            document.getElementById('host-manage-close')?.addEventListener('click', closeHostManageModal);
            document.getElementById('host-manage-share-copy-btn')?.addEventListener('click', () => {
                copyShareUrlToClipboard(document.getElementById('host-manage-share-url'));
            });
            document.getElementById('host-manage-delete-btn')?.addEventListener('click', handleDeleteHostedActivity);
            document.getElementById('delete-activity-confirm-btn')?.addEventListener('click', confirmDeleteHostedActivity);
            document.getElementById('delete-activity-cancel-btn')?.addEventListener('click', closeDeleteActivityConfirmModal);
            document.getElementById('delete-activity-confirm-modal')?.addEventListener('click', event => {
                if (event.target.id === 'delete-activity-confirm-modal' || event.target.classList.contains('muji-overlay__backdrop')) {
                    closeDeleteActivityConfirmModal();
                }
            });
            document.getElementById('publish-duplicate-confirm-btn')?.addEventListener('click', confirmPublishDespiteDuplicate);
            document.getElementById('publish-duplicate-cancel-btn')?.addEventListener('click', cancelPublishDuplicateModal);
            document.getElementById('publish-duplicate-modal')?.addEventListener('click', event => {
                if (event.target.id === 'publish-duplicate-modal' || event.target.classList.contains('muji-overlay__backdrop')) {
                    cancelPublishDuplicateModal();
                }
            });
            document.getElementById('host-payment-info-modal')?.addEventListener('click', event => {
                if (event.target.id === 'host-payment-info-modal' || event.target.classList.contains('muji-overlay__backdrop')) {
                    closeHostPaymentInfoModal();
                }
            });
            document.getElementById('host-manage-modal')?.addEventListener('click', event => {
                if (event.target.id === 'host-manage-modal' || event.target.classList.contains('muji-overlay__backdrop')) {
                    closeHostManageModal();
                }
            });
        }

        async function resolveMatchByBookId(bookId) {
            const id = String(bookId);
            let match = findMatchByBookId(id)
                || (inviteMatch && String(getMatchBookId(inviteMatch)) === id ? inviteMatch : null);
            if (match) return match;

            const bridgeReady = await waitForDbBridge();
            if (!bridgeReady || typeof window.dbFetchActivityById !== 'function') return null;

            try {
                const activity = await window.dbFetchActivityById(id);
                if (!activity) return null;
                if (!activity.id) activity.id = activity.firestoreId;

                const existingIndex = matches.findIndex(
                    m => String(m.firestoreId) === id || String(m.id) === id
                );
                if (existingIndex >= 0) {
                    matches[existingIndex] = { ...matches[existingIndex], ...activity };
                    return matches[existingIndex];
                }

                matches.push(activity);
                saveMatches();
                return activity;
            } catch (err) {
                console.error('讀取場次失敗:', err);
                return null;
            }
        }

        async function cancelReservation(id) {
            const match = await resolveMatchByBookId(id);
            if (!match) {
                i18nAlert('alert.activityNotFound');
                return;
            }

            const joinStatus = getUserJoinStatus(match);
            if (joinStatus === 'none') return;

            if (!window.firebaseAuthUid) {
                i18nAlert('alert.loginPlus1Cancel');
                return;
            }

            const isPending = joinStatus === 'pending';
            const confirmed = confirm(isPending
                ? '確定取消報名申請？'
                : '確定取消預約？\n\n名額將會釋放。如已付款，請私訊場主安排退款。');
            if (!confirmed) return;

            if (!match.firestoreId) {
                i18nAlert('alert.cancelOffline');
                return;
            }

            try {
                const bridgeReady = await waitForDbBridge();
                if (!bridgeReady || typeof window.dbCancelReservation !== 'function') {
                    throw new Error('雲端資料庫暫時未連線');
                }

                await window.dbCancelReservation(match);
                await loadActivitiesFromCloud();

                const uid = window.firebaseAuthUid;
                if (Array.isArray(match.participantUids)) {
                    match.participantUids = match.participantUids.filter(id => id !== uid);
                }
                if (Array.isArray(match.pendingParticipantUids)) {
                    match.pendingParticipantUids = match.pendingParticipantUids.filter(id => id !== uid);
                }
                if (match.participants && typeof match.participants === 'object') {
                    delete match.participants[uid];
                }
                if (!isPending) {
                    match.currentPlayers = Math.max(0, Number(match.currentPlayers ?? 0) - 1);
                }

                saveMatches();
                await renderMatches();
                renderInviteMatchSection();
                await renderMyActivities();
                i18nAlert(isPending ? 'alert.cancelPendingSuccess' : 'alert.cancelApprovedSuccess');
            } catch (err) {
                console.error('取消預約失敗:', err);
                const code = err?.code ? `（${err.code}）` : '';
                i18nAlert('alert.cancelFailed', { code });
            }
        }

        // 模擬五星評分制度
        function rateHost(id) {
            let stars = prompt("請為本次活動及場主評分（請輸入 1 至 5 粒星）：", "5");
            if (stars >= 1 && stars <= 5) {
                i18nAlert('alert.ratingThanks', { stars });
            } else if (stars !== null) {
                i18nAlert('alert.ratingInvalid');
            }
        }

        function buildDuplicateSlotCriteria(match) {
            return {
                playDate: String(match?.playDate || '').trim(),
                region: String(match?.region || '').trim(),
                venue: String(match?.venue || '').trim(),
                startTime: match?.startTime || match?.startTimeValue || '',
                endTime: match?.endTime || match?.endTimeValue || '',
                skillLevel: String(match?.skillLevel || '').trim()
            };
        }

        function countLocalHostDuplicateSlots(criteria) {
            const uid = window.firebaseAuthUid;
            if (!uid) return 0;
            return matches.filter(match =>
                match?.hostUid === uid
                && isMatchActive(match)
                && typeof window.activityMatchesDuplicateSlot === 'function'
                    ? window.activityMatchesDuplicateSlot(match, criteria)
                    : false
            ).length;
        }

        async function countHostDuplicateSlots(criteria) {
            if (typeof window.dbCountHostDuplicateActivities === 'function') {
                try {
                    return await window.dbCountHostDuplicateActivities(criteria);
                } catch (err) {
                    console.warn('雲端重複場次檢查失敗，改用本地資料:', err);
                }
            }
            return countLocalHostDuplicateSlots(criteria);
        }

        async function openPublishDuplicateModal({ mode, duplicateCount }) {
            const modal = document.getElementById('publish-duplicate-modal');
            const title = document.getElementById('publish-duplicate-title');
            const text = document.getElementById('publish-duplicate-text');
            const confirmBtn = document.getElementById('publish-duplicate-confirm-btn');
            const cancelBtn = document.getElementById('publish-duplicate-cancel-btn');
            if (!modal || !title || !text || !confirmBtn || !cancelBtn) return;

            const skillLabel = pendingPublishSubmission?.skillLevelLabel || '此球技要求';
            const slotLabel = pendingPublishSubmission?.timeSlotLabel || '相同時段';

            if (mode === 'blocked') {
                title.textContent = '無法發佈';
                text.textContent = `相同時段、地點與「${skillLabel}」的場次已達 ${HOST_DUPLICATE_SLOT_LIMIT} 場上限。請先刪除既有場次，或更改時段、地點、球技要求。`;
                confirmBtn.classList.add('hidden');
                cancelBtn.textContent = '知道了';
            } else {
                title.textContent = '重複場次提醒';
                text.textContent = `你已有 ${duplicateCount} 場「${slotLabel} · ${skillLabel}」的場次（最多 ${HOST_DUPLICATE_SLOT_LIMIT} 場）。仍要發佈嗎？`;
                confirmBtn.classList.remove('hidden');
                confirmBtn.disabled = false;
                confirmBtn.textContent = '仍要發佈';
                cancelBtn.textContent = '返回修改';
            }

            if (typeof window.openMujiOverlay === 'function') {
                await window.openMujiOverlay(modal);
            } else {
                modal.classList.remove('hidden');
            }
        }

        async function closePublishDuplicateModal() {
            const modal = document.getElementById('publish-duplicate-modal');
            if (!modal) return;
            if (typeof window.closeMujiOverlay === 'function') {
                await window.closeMujiOverlay(modal);
            } else {
                modal.classList.add('hidden');
            }
        }

        async function executePublishSubmission(submission) {
            const { newMatch, formEvent, isPrivate, playDate, region } = submission;
            let publishedFirestoreId = null;
            try {
                publishedFirestoreId = await window.dbPublishActivity(newMatch);
                newMatch.firestoreId = publishedFirestoreId;
                const loaded = await loadActivitiesFromCloud();
                matches = mergeMatchesByFirestoreId(matches, [newMatch]);
                if (!loaded) {
                    saveMatches();
                }
            } catch (err) {
                console.error('發佈場次失敗:', err);
                if (err?.code === 'activity/missing-session-ends-at') {
                    i18nAlert('alert.repickDateTime');
                    return;
                }
                if (err?.code === 'permission-denied') {
                    i18nAlert('alert.publishDenied');
                    return;
                }
                const code = err?.code ? `（${err.code}）` : '';
                i18nAlert('alert.publishFailed', { code });
                return;
            }

            if (typeof window.closePublishPage === 'function') {
                await window.closePublishPage();
            }
            if (typeof window.alignLobbyRegionFilter === 'function') {
                window.alignLobbyRegionFilter(region);
            }
            syncHomeLobbyAfterPublish(playDate);
            formEvent.target.reset();
            resetPublishForm();
            if (typeof window.switchPage === 'function') {
                await window.switchPage('match');
            }
            await renderMatches();
            await renderMyActivities();

            if (isPrivate && publishedFirestoreId) {
                openPrivateShareModal(publishedFirestoreId);
            }
        }

        async function confirmPublishDespiteDuplicate() {
            const submission = pendingPublishSubmission;
            if (!submission) return;

            const confirmBtn = document.getElementById('publish-duplicate-confirm-btn');
            const originalText = confirmBtn ? confirmBtn.textContent : '';
            try {
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = '發佈中...';
                }
                await closePublishDuplicateModal();
                await executePublishSubmission(submission);
            } finally {
                pendingPublishSubmission = null;
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = originalText || '仍要發佈';
                }
            }
        }

        async function cancelPublishDuplicateModal() {
            await closePublishDuplicateModal();
            pendingPublishSubmission = null;
        }

        // 處理新場地發佈表格
        async function handleFormSubmit(event) {
            event.preventDefault();

            const region = document.getElementById('form-region').value;
            const venueValue = document.getElementById('form-venue').value;
            const venueNoteInput = document.getElementById('form-venue-note');
            const shuttleInfo = (document.getElementById('form-shuttle-info')?.value || '').trim();
            const maxSlots = parseInt(document.getElementById('form-maxslots').value) || 6;
            const currentPlayersRaw = parseInt(document.getElementById('form-current-players').value, 10);
            const currentPlayers = Number.isNaN(currentPlayersRaw) ? 0 : Math.max(0, currentPlayersRaw);

            if (currentPlayers > maxSlots) {
                i18nAlert('alert.playersOverMax');
                return;
            }

            if (!region || !HONG_KONG_18_DISTRICTS.includes(region)) {
                i18nAlert('alert.pickDistrict');
                return;
            }
            if (!venueValue) {
                i18nAlert('alert.pickVenue');
                return;
            }

            const isPrivateVenue = venueValue === PRIVATE_VENUE_VALUE;
            const finalVenue = isPrivateVenue ? venueNoteInput.value.trim() : venueValue;

            if (isPrivateVenue && !finalVenue) {
                i18nAlert('alert.fillVenueNote');
                venueNoteInput.focus();
                return;
            }
            const playDate = document.getElementById('form-play-date').value;
            if (!playDate) {
                i18nAlert('alert.pickPlayDate');
                return;
            }
            const timeSlot = getTimeSlotFormValues();
            if (!timeSlot.startTimeValue || !timeSlot.endTimeValue) {
                i18nAlert('alert.pickTimeRange');
                document.getElementById('form-start-time-btn')?.focus();
                return;
            }
            if (timeSlot.duration === null || timeSlot.duration <= 0) {
                i18nAlert('alert.endAfterStart');
                document.getElementById('form-end-time-btn')?.focus();
                return;
            }

            const visibility = document.querySelector('input[name="form-visibility"]:checked')?.value || 'public';
            const isPrivate = visibility === 'private';

            const sessionEndsAt = typeof window.buildActivityEndsAtDate === 'function'
                ? window.buildActivityEndsAtDate(playDate, timeSlot.startTimeValue)
                : null;
            if (sessionEndsAt && typeof window.isActivityEnded === 'function'
                && window.isActivityEnded({ playDate, startTime: timeSlot.startTime, sessionEndsAt })) {
                i18nAlert('alert.startTooSoon');
                return;
            }

            const hostContact = await resolveHostPublishContact();
            const hostName = getHostDisplayName();
            const hostPhone = extractPhoneFromContact(hostContact) || String(cachedOwnHostSettings?.fpsId || '').trim();

            const newMatch = {
                id: Date.now(),
                isPrivate,
                region,
                venue: finalVenue,
                playDate,
                playTime: timeSlot.displayTimeSlot,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                sessionEndsAt,
                duration: timeSlot.duration,
                courtCount: timeSlot.courtCount,
                displayTimeSlot: timeSlot.displayTimeSlot,
                courts: timeSlot.courtCount,
                hours: timeSlot.duration,
                fee: parseInt(document.getElementById('form-fee').value) || 50,
                hostRating: "5.0",
                contact: hostContact,
                shuttleInfo: shuttleInfo || '',
                shuttleBrand: shuttleInfo || '',
                shuttleModel: '',
                skillLevel: document.getElementById('form-skill-level').value || DEFAULT_SKILL_LEVEL,
                joined: false,
                maxSlots,
                currentPlayers,
                waitingList: [],
                paymentStatus: null,
                userStatus: 'none',
                applicantName: null,
                applicantUid: null,
                applicantEmail: null,
                hostUid: window.firebaseAuthUid || null,
                hostEmail: window.firebaseAuthUser?.email || null,
                hostDisplayName: hostName,
                hostPhotoURL: window.firebaseAuthUser?.photoURL || null,
                fpsId: hostPhone,
                paymeLink: `payme.hsbc/${hostName.split(/\s+/)[0] || '場主'}_VibeUp`
            };
            const bridgeReady = await waitForDbBridge();
            if (!bridgeReady) {
                i18nAlert('alert.dbOffline');
                return;
            }
            if (!window.firebaseAuthUid) {
                i18nAlert('alert.loginPlus1Publish');
                return;
            }

            const duplicateCriteria = buildDuplicateSlotCriteria(newMatch);
            const duplicateCount = await countHostDuplicateSlots(duplicateCriteria);
            const skillLevelLabel = getSkillLevelShortLabel(newMatch.skillLevel);
            const timeSlotLabel = timeSlot.displayTimeSlot || `${newMatch.startTime}-${newMatch.endTime}`;

            if (duplicateCount >= HOST_DUPLICATE_SLOT_LIMIT) {
                pendingPublishSubmission = {
                    newMatch,
                    formEvent: event,
                    isPrivate,
                    playDate,
                    region,
                    skillLevelLabel,
                    timeSlotLabel
                };
                await openPublishDuplicateModal({ mode: 'blocked', duplicateCount });
                pendingPublishSubmission = null;
                return;
            }

            if (duplicateCount > 0) {
                pendingPublishSubmission = {
                    newMatch,
                    formEvent: event,
                    isPrivate,
                    playDate,
                    region,
                    skillLevelLabel,
                    timeSlotLabel
                };
                await openPublishDuplicateModal({ mode: 'confirm', duplicateCount });
                return;
            }

            await executePublishSubmission({
                newMatch,
                formEvent: event,
                isPrivate,
                playDate,
                region,
                skillLevelLabel,
                timeSlotLabel
            });
        }

        async function initMatchesApp() {
            migrateMatchDates();
            migrateMatchSlots();
            bindPaymentActions();
            bindHostSettingsUI();
            bindTimeSlotForm();
            refreshHostPaymentSettings();
            bindPrivateShareUI();
            bindSessionModals();
            inviteActivityId = getInviteIdFromUrl();
            await waitForFirebaseAuth();
            await loadActivitiesFromCloud();
            await loadInviteActivity();
            saveMatches();
            initCalendars();
            resetPublishForm();
            await renderMatches();
            if (typeof updateProfileUI === 'function') updateProfileUI();
        }

        window.toggleFormPicker = toggleFormPicker;
        window.togglePaymentSheet = togglePaymentSheet;
        window.openFormPicker = openFormPicker;
        window.confirmFormPicker = confirmFormPicker;
        window.handleFormSubmit = handleFormSubmit;
        window.confirmBooking = confirmBooking;
        window.clearHomeDateFilter = clearHomeDateFilter;
        window.toggleCalendarExpand = toggleCalendarExpand;
        window.changeCalendarMonth = changeCalendarMonth;
        window.renderMyActivities = renderMyActivities;
        window.loadActivitiesFromCloud = loadActivitiesFromCloud;
        window.renderMatches = renderMatches;
        window.cancelReservation = cancelReservation;
        window.resetPublishForm = resetPublishForm;
        window.invalidateHostProfileCache = function invalidateHostProfileCache(uid) {
            if (uid) hostProfileCache.delete(uid);
        };
