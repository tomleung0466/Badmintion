/**
 * i18n.js — 繁體／簡體語言切換
 */
(function initI18n() {
    const STORAGE_KEY = 'plus1_locale';
    const DEFAULT_LOCALE = 'zh-Hant';
    const SUPPORTED = ['zh-Hant', 'zh-Hans'];
    const LOCALE_LABEL_KEYS = {
        'zh-Hant': 'settings.localeHant',
        'zh-Hans': 'settings.localeHans',
        'en': 'settings.localeEn'
    };

    const CHAR_T2S = {
        區: '区', 東: '东', 島: '岛', 灣: '湾', 門: '门', 鄉: '乡', 頭: '头', 馬: '马',
        車: '车', 廣: '广', 場: '场', 體: '体', 館: '馆', 華: '华', 園: '园', 樓: '楼',
        邨: '邨', 埗: '埗', 崗: '岗', 嶺: '岭', 環: '环', 徑: '径', 圍: '围', 龍: '龙',
        鳳: '凤', 樂: '乐', 興: '兴', 啟: '启', 順: '顺', 華: '华', 灣: '湾', 銅: '铜',
        鑼: '锣', 裏: '里', 裡: '里', 後: '后', 臺: '台', 檯: '台', 臺: '台', 眾: '众',
        萬: '万', 與: '与', 為: '为', 時: '时', 間: '间', 發: '发', 佈: '布', 報: '报',
        備: '备', 註: '注', 聯: '联', 絡: '络', 號: '号', 碼: '码', 費: '费', 總: '总',
        額: '额', 現: '现', 選: '选', 擇: '择', 滾: '滚', 動: '动', 請: '请', 確: '确',
        認: '认', 儲: '储', 刪: '删', 帳: '账', 戶: '户', 設: '设', 個: '个', 資: '资',
        訊: '讯', 雲: '云', 端: '端', 載: '载', 錄: '录', 參: '参', 與: '与', 預: '预',
        約: '约', 審: '审', 覽: '览', 複: '复', 製: '制', 專: '专', 屬: '属', 連: '连',
        結: '结', 無: '无', 開: '开', 關: '关', 顯: '显', 隱: '隐', 僅: '仅', 見: '见',
        廳: '厅', 廳: '厅', 轉: '转', 數: '数', 快: '快', 單: '单', 雙: '双', 擊: '击',
        規: '规', 則: '则', 戰: '战', 術: '术', 殺: '杀', 歡: '欢', 娛: '娱', 樂: '乐',
        級: '级', 純: '纯', 擊: '击', 穩: '稳', 雙: '双', 優: '优', 質: '质', 誠: '诚',
        實: '实', 際: '际', 際: '际', 給: '给', 們: '们', 進: '进', 跟: '跟', 進: '进',
        暫: '暂', 敗: '败', 權: '权', 限: '限', 檢: '检', 查: '查', 試: '试', 聯: '联',
        繫: '系', 場: '场', 主: '主', 員: '员', 補: '补', 釋: '释', 放: '放', 過: '过',
        逾: '逾', 半: '半', 遲: '迟', 晚: '晚', 須: '须', 於: '于', 結: '结', 束: '束',
        開: '开', 始: '始', 結: '结', 東: '东', 啟: '启', 德: '德', 窩: '窝', 邨: '邨',
        埗: '埗', 魚: '鱼', 涌: '涌', 灣: '湾', 環: '环', 圍: '围', 徑: '径', 龍: '龙',
        琛: '琛', 寶: '宝', 榮: '荣', 藍: '蓝', 田: '田', 鄧: '邓', 肇: '肇', 堅: '坚',
        楓: '枫', 樹: '树', 窩: '窝', 發: '发', 長: '长', 興: '兴', 良: '良', 賽: '赛',
        馬: '马', 會: '会', 蝶: '蝶', 蝴: '蝴', 暉: '晖', 屏: '屏', 圍: '围', 鳳: '凤',
        琴: '琴', 圓: '圆', 洲: '洲', 禾: '禾', 恆: '恒', 安: '安', 顯: '显', 埔: '埔',
        墟: '墟', 善: '善', 榮: '荣', 龍: '龙', 琛: '琛', 興: '兴', 翠: '翠', 軍: '军',
        澳: '澳', 坑: '坑', 調: '调', 景: '景', 嶺: '岭', 寶: '宝', 林: '林', 梅: '梅',
        窩: '窝', 坪: '坪', 傍: '傍', 長: '长', 洲: '洲', 涌: '涌', 文: '文', 單: '单',
        車: '车', 館: '馆', 銅: '铜', 鑼: '锣', 灣: '湾', 鴨: '鸭', 脷: '脷', 漁: '渔',
        光: '光', 道: '道', 黃: '黄', 竹: '竹', 坑: '坑', 赤: '赤', 柱: '柱', 鰂: '鲗',
        魚: '鱼', 西: '西', 灣: '湾', 河: '河', 柴: '柴', 華: '华', 道: '道', 渣: '渣',
        士: '士', 美: '美', 非: '非', 路: '路', 紀: '纪', 念: '念', 公: '公', 園: '园',
        環: '环', 石: '石', 塘: '塘', 咀: '咀', 花: '花', 園: '园', 街: '街', 官: '官',
        涌: '涌', 角: '角', 咀: '咀', 界: '界', 限: '限', 街: '街', 荔: '荔', 枝: '枝',
        角: '角', 長: '长', 沙: '沙', 北: '北', 河: '河', 保: '保', 安: '安', 硤: '硖',
        尾: '尾', 牛: '牛', 池: '池', 摩: '摩', 士: '士', 蒲: '蒲', 崗: '岗', 竹: '竹',
        彩: '彩', 虹: '虹', 佛: '佛', 光: '光', 土: '土', 瓜: '瓜', 紅: '红', 磡: '磡',
        瑞: '瑞', 和: '和', 牛: '牛', 振: '振', 鯉: '鲤', 曉: '晓', 葵: '葵', 涌: '涌',
        鄧: '邓', 林: '林', 士: '士', 德: '德', 大: '大', 窩: '窝', 口: '口', 青: '青',
        衣: '衣', 西: '西', 南: '南', 長: '长', 發: '发', 荔: '荔', 景: '景', 荃: '荃',
        蕙: '蕙', 楊: '杨', 屋: '屋', 友: '友', 愛: '爱', 兆: '兆', 麟: '麟', 興: '兴',
        良: '良', 賽: '赛', 蝶: '蝶', 蝴: '蝴', 暉: '晖', 屏: '屏', 瑞: '瑞', 鳳: '凤',
        琴: '琴', 圓: '圆', 源: '源', 恆: '恒', 馬: '马', 鞍: '鞍', 顯: '显', 太: '太',
        和: '和', 埔: '埔', 富: '富', 亨: '亨', 東: '东', 昌: '昌', 善: '善', 保: '保',
        榮: '荣', 天: '天', 平: '平', 龍: '龙', 翠: '翠', 將: '将', 軍: '军', 坑: '坑',
        調: '调', 寶: '宝', 梅: '梅', 坪: '坪', 海: '海', 長: '长', 東: '东', 涌: '涌',
        註: '注', 銷: '销', 頭: '头', 像: '像', 語: '语', 言: '言', 簡: '简', 體: '体',
        繁: '繁', 際: '际', 陸: '陆', 陸: '陆', 陸: '陆', 陸: '陆', 陸: '陆'
    };

    let currentLocale = DEFAULT_LOCALE;
    let messages = {};

    function mergeLocale(localeId, dict) {
        if (!dict || typeof dict !== 'object') return;
        messages[localeId] = { ...(messages[localeId] || {}), ...dict };
    }

    function getMessage(key) {
        const bucket = messages[currentLocale] || messages[DEFAULT_LOCALE] || {};
        if (bucket[key] != null) return bucket[key];
        const fallback = messages[DEFAULT_LOCALE] || {};
        return fallback[key] != null ? fallback[key] : key;
    }

    function interpolate(template, params) {
        if (!params) return template;
        return String(template).replace(/\{\{(\w+)\}\}/g, (_, name) => {
            return params[name] != null ? String(params[name]) : '';
        });
    }

    window.t = function t(key, params) {
        return interpolate(getMessage(key), params);
    };

    window.translatePlaceName = function translatePlaceName(text) {
        const raw = String(text ?? '');
        if (currentLocale !== 'zh-Hans') return raw;
        return [...raw].map((ch) => CHAR_T2S[ch] || ch).join('');
    };

    window.getAppLocale = function getAppLocale() {
        return currentLocale;
    };

    const SKILL_LEVEL_KEYS = {
        '不限水平': 'skill.any',
        '歡樂級 (純娛樂/未掌握基本擊球)': 'skill.joy',
        '初級 (能打中球/懂基本規則)': 'skill.beginner',
        '初中級 (有來回球/開始懂走位)': 'skill.intermediateLow',
        '中級 (擊球穩定/懂雙打跑位)': 'skill.intermediate',
        '中高級 (速度力量兼備/有戰術)': 'skill.advanced',
        '高級 (比賽選手級/強力殺球抗衡)': 'skill.expert'
    };

    window.translateSkillLevel = function translateSkillLevel(level) {
        const raw = String(level || '');
        const key = SKILL_LEVEL_KEYS[raw];
        if (key) return t(key);
        return translatePlaceName(raw);
    };

    const PRIVATE_VENUE_TRAD = '🏢 私人會所 / 學校 / 其他地方';

    window.translateVenueLabel = function translateVenueLabel(label) {
        const raw = String(label || '');
        if (raw === PRIVATE_VENUE_TRAD) return t('venue.privateOther');
        return translatePlaceName(raw);
    };

    function applyAttributes(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            el.textContent = t(key);
        });
        scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (!key) return;
            el.setAttribute('placeholder', t(key));
        });
        scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
            const key = el.getAttribute('data-i18n-aria');
            if (!key) return;
            el.setAttribute('aria-label', t(key));
        });
        scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.getAttribute('data-i18n-html');
            if (!key) return;
            el.innerHTML = t(key);
        });
    }

    const HTML_BINDINGS = [
        ['#splash-screen h1', null],
        ['#page-match .text-xs.leading-relaxed', 'app.tagline'],
        ['#loginBtn', 'auth.loginRegister'],
        ['#auth-logout-btn', 'auth.logout'],
        ['#region-filter [data-filter="all"]', 'region.all'],
        ['#region-filter [data-filter="港島"]', 'region.hkIslandShort'],
        ['#region-filter [data-filter="九龍"]', 'region.kowloon'],
        ['#region-filter [data-filter="新界"]', 'region.newTerritories'],
        ['#region-filter', 'aria.regionFilter', 'aria'],
        ['#home-calendar-clear', 'date.showAll'],
        ['#page-match .text-xs.font-medium.text-\\[\\#333333\\]', 'date.playDate'],
        ['#publish-fab-btn', 'publish.fabAria', 'aria'],
        ['#page-profile h1', 'profile.title'],
        ['#page-profile .text-xs.text-gray-400.mb-6', 'profile.subtitle'],
        ['#profile-credit-points', null],
        ['.settings-page-title', 'settings.title'],
        ['.settings-page-subtitle', 'settings.subtitle'],
        ['#profile-avatar-overlay .image-preview-overlay-text', 'settings.uploading'],
        ['#edit-profile-btn', 'settings.editProfile'],
        ['#edit-host-payment-btn', 'settings.hostPayment'],
        ['#profile-edit-panel .profile-subpanel-title', 'settings.editProfile'],
        ['label[for="profile-name-input"]', 'settings.newName'],
        ['#profile-name-input + .profile-field-hint', 'settings.nameRules'],
        ['#profile-edit-panel .profile-field:nth-child(2) > .profile-field-label', 'settings.avatar'],
        ['#profile-edit-panel .profile-upload-text', 'settings.chooseAvatar'],
        ['#profile-edit-panel .profile-field-hint:not(.hidden):not(#profile-avatar-cooldown-hint):not(#profile-avatar-hint)', 'settings.avatarCropHint'],
        ['#profile-avatar-cooldown-hint', 'settings.avatarCooldownDefault'],
        ['#save-profile-btn', 'settings.saveChanges'],
        ['.profile-delete-account-hint', 'settings.deleteAccountHint'],
        ['#delete-account-btn', 'settings.deleteAccount'],
        ['#host-settings-panel .profile-subpanel-title', 'settings.hostPaymentTitle'],
        ['#host-settings-panel > .profile-field-hint', 'settings.hostPaymentHint'],
        ['#host-settings-panel .profile-field:nth-child(3) .profile-field-label', 'settings.paymeQr'],
        ['#host-settings-panel .profile-field:nth-child(3) .profile-upload-text', 'settings.uploadPayme'],
        ['#host-settings-panel .profile-field:nth-child(4) .profile-field-label', 'settings.fpsQr'],
        ['#host-settings-panel .profile-field:nth-child(4) .profile-upload-text', 'settings.uploadFps'],
        ['label[for="host-fps-id-input"]', 'settings.whatsapp'],
        ['#save-host-payment-btn', 'settings.saveHostPayment'],
        ['#settings-language-btn .settings-about-btn-label', 'settings.language'],
        ['#settings-appearance-btn .settings-about-btn-label', 'settings.appearance'],
        ['#settings-font-size-btn .settings-about-btn-label', 'settings.fontSize'],
        ['#font-size-modal-close', 'common.close', 'aria'],
        ['#settings-version-btn .settings-about-btn-label', 'settings.version'],
        ['#settings-feedback-btn .settings-about-btn-label', 'settings.feedback'],
        ['#language-modal-close', 'common.close', 'aria'],
        ['.settings-about-row + .settings-about-hint', 'settings.feedbackHint'],
        ['#profile-logout-btn', 'auth.logout'],
        ['#nav-match span:last-child', 'nav.matches'],
        ['#nav-profile span:last-child', 'nav.mySessions'],
        ['#nav-settings span:last-child', 'nav.settings'],
        ['#publish-back-btn span:last-child', 'common.back'],
        ['.publish-page-title', 'publish.title'],
        ['#publish-close-btn', 'common.close', 'aria'],
        ['.publish-swipe-hint', 'publish.swipeHint'],
        ['#disclaimer-modal .disclaimer-text', 'disclaimer.text'],
        ['#disclaimer-ack-btn', 'disclaimer.ack'],
        ['#auth-modal-title', 'auth.joinTitle'],
        ['#auth-modal .text-\\[11px\\].text-gray-400.mb-4', 'auth.joinSubtitle'],
        ['#auth-google-btn span:last-child', 'auth.googleLogin'],
        ['#feedback-modal .confirm-dialog-title', 'feedback.title'],
        ['#feedback-modal .confirm-dialog-text', 'feedback.desc'],
        ['label[for="feedback-message-input"]', 'feedback.label'],
        ['#feedback-submit-btn', 'feedback.submit'],
        ['#feedback-cancel-btn', 'feedback.later'],
        ['#delete-activity-confirm-modal .confirm-dialog-title', 'modal.deleteActivityTitle'],
        ['#delete-activity-confirm-modal .confirm-dialog-text', 'modal.deleteActivityText'],
        ['#delete-activity-confirm-btn', 'modal.deleteConfirm'],
        ['#delete-activity-cancel-btn', 'modal.deleteKeep'],
        ['#host-manage-modal .session-modal-title', 'modal.hostManageTitle'],
        ['#host-manage-empty', 'modal.hostManageEmpty'],
        ['.host-manage-share-kicker', 'modal.privateShareKicker'],
        ['.host-manage-share-hint', 'modal.privateShareHint'],
        ['#host-manage-share-copy-btn', 'modal.copyPrivateLink'],
        ['.host-manage-delete-hint', 'modal.hostDeleteHint'],
        ['#host-manage-delete-btn', 'modal.hostDeleteBtn'],
        ['#private-share-modal .private-share-kicker', 'modal.privateCreatedKicker'],
        ['#private-share-modal .private-share-title', 'modal.privateCreatedTitle'],
        ['#private-share-modal .private-share-copy', 'modal.privateCreatedCopy'],
        ['label[for="private-share-url"]', 'modal.privateLinkLabel'],
        ['#private-share-copy-btn', 'modal.copyPrivateLinkLong'],
        ['#private-share-done-btn', 'modal.done'],
        ['#host-qr-crop-title', 'modal.cropQrTitle'],
        ['#host-qr-crop-modal .text-\\[10px\\]', 'modal.cropQrHint'],
        ['#host-qr-crop-cancel', 'common.cancel'],
        ['#host-qr-crop-confirm', 'modal.cropQrConfirm'],
        ['#avatar-crop-modal h4', 'modal.cropAvatarTitle'],
        ['#avatar-crop-modal .text-\\[10px\\]', 'modal.cropAvatarHint'],
        ['#avatar-crop-cancel', 'common.cancel'],
        ['#avatar-crop-confirm', 'modal.cropAvatarConfirm'],
        ['#payment-sheet .payment-sheet-title', 'payment.title'],
        ['.payment-fee-label', 'payment.feeLabel'],
        ['.payment-hint', 'payment.hint'],
        ['#payment-new-host-tip', 'payment.newHostTip'],
        ['#payment-payme-jump-btn', 'payment.jumpPayme'],
        ['#payment-whatsapp-btn', 'payment.whatsappHost'],
        ['.payment-submit-btn', 'payment.confirmBooking'],
        ['.payment-cancel-btn', 'payment.later'],
        ['.platform-disclaimer', 'disclaimer.text'],
        ['#host-payment-info-modal .session-modal-title', 'modal.hostPaymentInfoTitle'],
        ['#publish-duplicate-title', 'modal.duplicateTitle'],
        ['#publish-duplicate-confirm-btn', 'modal.duplicateConfirm'],
        ['#publish-duplicate-cancel-btn', 'modal.duplicateBack'],
        ['#version-modal .confirm-dialog-title', 'settings.version'],
        ['#version-modal-close', 'common.close', 'aria'],
        ['#pwa-install-action-btn', 'pwa.install'],
        ['#pwa-install-dismiss-btn', 'common.close', 'aria'],
        ['#picker-scroller-title', 'picker.selectDistrict'],
        ['#scroll-picker .text-sm.text-\\[\\#777777\\]', 'common.cancel'],
        ['#scroll-picker .text-sm.font-medium.text-\\[\\#333333\\]:last-child', 'common.done'],
        ['#form-picker .text-sm.text-gray-400', 'common.cancel'],
        ['#form-picker .text-sm.font-bold.text-emerald-600', 'common.done']
    ];

    function applyHtmlBindings(root) {
        const scope = root || document;
        HTML_BINDINGS.forEach(([selector, key, mode]) => {
            if (!key) return;
            scope.querySelectorAll(selector).forEach((el) => {
                if (mode === 'aria') {
                    el.setAttribute('aria-label', t(key));
                } else {
                    el.textContent = t(key);
                }
            });
        });

        scope.querySelectorAll('.calendar-weekday').forEach((el, index) => {
            const keys = ['date.sun', 'date.mon', 'date.tue', 'date.wed', 'date.thu', 'date.fri', 'date.sat'];
            if (keys[index]) el.textContent = t(keys[index]);
        });
    }

    window.applyI18n = function applyI18n(root) {
        applyAttributes(root);
        applyHtmlBindings(root);
        updateLanguageSelectorUi();
        if (typeof window.onLocaleApplied === 'function') {
            window.onLocaleApplied(currentLocale);
        }
    };

    function getLocaleDisplayLabel(locale) {
        const key = LOCALE_LABEL_KEYS[locale];
        return key ? t(key) : locale;
    }

    window.updateSettingsLanguageLabel = function updateSettingsLanguageLabel() {
        const label = document.getElementById('settings-language-label');
        if (label) label.textContent = getLocaleDisplayLabel(currentLocale);
    };

    function updateLanguageSelectorUi() {
        document.querySelectorAll('[data-locale-option]').forEach((btn) => {
            const locale = btn.getAttribute('data-locale-option');
            const active = locale === currentLocale;
            btn.classList.toggle('is-active-profile-action', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        window.updateSettingsLanguageLabel();
    }

    function persistLocale(locale) {
        try {
            localStorage.setItem(STORAGE_KEY, locale);
        } catch (_err) { /* ignore */ }
    }

    function readStoredLocale() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && SUPPORTED.includes(stored)) return stored;
        } catch (_err) { /* ignore */ }
        return DEFAULT_LOCALE;
    }

    window.setAppLocale = function setAppLocale(locale, options = {}) {
        if (!SUPPORTED.includes(locale)) locale = DEFAULT_LOCALE;
        currentLocale = locale;
        document.documentElement.lang = locale === 'zh-Hans' ? 'zh-CN' : 'zh-HK';
        if (!options.skipPersist) persistLocale(locale);
        applyI18n();
        window.dispatchEvent(new CustomEvent('localechange', { detail: { locale } }));
    };

    function bindLanguageSelector() {
        document.querySelectorAll('[data-locale-option]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const locale = btn.getAttribute('data-locale-option');
                if (!locale || !SUPPORTED.includes(locale)) return;
                window.setAppLocale(locale);
                if (typeof window.closeLanguageModal === 'function') {
                    await window.closeLanguageModal();
                }
            });
        });
    }

    window.registerI18nLocale = function registerI18nLocale(localeId, dict) {
        mergeLocale(localeId, dict);
    };

    function bootstrap() {
        if (window.I18N_ZH_HANT) mergeLocale('zh-Hant', window.I18N_ZH_HANT);
        if (window.I18N_ZH_HANS) mergeLocale('zh-Hans', window.I18N_ZH_HANS);
        currentLocale = readStoredLocale();
        document.documentElement.lang = currentLocale === 'zh-Hans' ? 'zh-CN' : 'zh-HK';
        bindLanguageSelector();
        applyI18n();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
