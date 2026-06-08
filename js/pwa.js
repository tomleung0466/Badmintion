/**
 * pwa.js — +1 PWA：Service Worker 註冊與「加入主畫面」提示
 */
(function initPwa() {
    const INSTALL_DISMISS_KEY = 'plus1_pwa_install_dismissed';
    let deferredInstallPrompt = null;

    function isStandaloneMode() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
    }

    function isIosSafari() {
        const ua = window.navigator.userAgent || '';
        const isIOS = /iphone|ipad|ipod/i.test(ua);
        const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
        return isIOS && isSafari;
    }

    function getInstallHintEl() {
        return document.getElementById('pwa-install-hint');
    }

    function hideInstallHint(persistDismiss = false) {
        const hint = getInstallHintEl();
        if (!hint) return;
        hint.classList.add('hidden');
        if (persistDismiss) {
            try {
                localStorage.setItem(INSTALL_DISMISS_KEY, '1');
            } catch (_err) { /* ignore */ }
        }
    }

    function showInstallHint(mode) {
        if (isStandaloneMode()) return;
        try {
            if (localStorage.getItem(INSTALL_DISMISS_KEY)) return;
        } catch (_err) { /* ignore */ }

        const hint = getInstallHintEl();
        const textEl = document.getElementById('pwa-install-hint-text');
        const actionBtn = document.getElementById('pwa-install-action-btn');
        if (!hint || !textEl) return;

        if (mode === 'ios') {
            textEl.textContent = '在 iPhone 測試：點分享 →「加入主畫面」，即可像 App 一樣開啟 +1。';
            actionBtn?.classList.add('hidden');
        } else if (mode === 'android') {
            textEl.textContent = '可將 +1 加入主畫面，像原生 App 一樣快速開啟。';
            actionBtn?.classList.remove('hidden');
        } else {
            return;
        }

        hint.classList.remove('hidden');
    }

    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return null;
        try {
            const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
            return registration;
        } catch (err) {
            console.warn('[+1 PWA] Service Worker 註冊失敗:', err);
            return null;
        }
    }

    async function promptAndroidInstall() {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        try {
            await deferredInstallPrompt.userChoice;
        } catch (_err) { /* ignore */ }
        deferredInstallPrompt = null;
        hideInstallHint(true);
    }

    function bindInstallUi() {
        document.getElementById('pwa-install-dismiss-btn')?.addEventListener('click', () => {
            hideInstallHint(true);
        });
        document.getElementById('pwa-install-action-btn')?.addEventListener('click', () => {
            promptAndroidInstall();
        });

        window.addEventListener('beforeinstallprompt', event => {
            event.preventDefault();
            deferredInstallPrompt = event;
            showInstallHint('android');
        });

        if (isIosSafari()) {
            window.setTimeout(() => showInstallHint('ios'), 1800);
        }
    }

    async function bootstrapPwa() {
        bindInstallUi();
        await registerServiceWorker();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrapPwa);
    } else {
        bootstrapPwa();
    }
})();
