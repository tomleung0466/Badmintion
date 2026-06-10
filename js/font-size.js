/**
 * font-size.js — App 字體大小調整
 */
(function initAppFontSize() {
    const STORAGE_KEY = 'plus1_font_size';
    const SUPPORTED = ['normal', 'large', 'xlarge'];
    const LABEL_KEYS = {
        normal: 'settings.fontSizeNormal',
        large: 'settings.fontSizeLarge',
        xlarge: 'settings.fontSizeXlarge'
    };

    let currentSize = 'normal';

    function labelForSize(size) {
        const key = LABEL_KEYS[size] || LABEL_KEYS.normal;
        return typeof window.t === 'function' ? window.t(key) : key;
    }

    function applyFontSize(size) {
        if (!SUPPORTED.includes(size)) size = 'normal';
        currentSize = size;
        document.documentElement.setAttribute('data-font-size', size);
    }

    function readStoredFontSize() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && SUPPORTED.includes(stored)) return stored;
        } catch (_err) { /* ignore */ }
        return 'normal';
    }

    function persistFontSize(size) {
        try {
            localStorage.setItem(STORAGE_KEY, size);
        } catch (_err) { /* ignore */ }
    }

    window.getAppFontSize = function getAppFontSize() {
        return currentSize;
    };

    window.updateSettingsFontSizeLabel = function updateSettingsFontSizeLabel() {
        const label = document.getElementById('settings-font-size-label');
        if (label) label.textContent = labelForSize(currentSize);
    };

    function updateFontSizeSelectorUi() {
        document.querySelectorAll('[data-font-size-option]').forEach((btn) => {
            const size = btn.getAttribute('data-font-size-option');
            const active = size === currentSize;
            btn.classList.toggle('is-active-profile-action', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        window.updateSettingsFontSizeLabel();
    }

    window.setAppFontSize = function setAppFontSize(size, options = {}) {
        applyFontSize(size);
        if (!options.skipPersist) persistFontSize(size);
        updateFontSizeSelectorUi();
        window.dispatchEvent(new CustomEvent('fontsizechange', { detail: { size: currentSize } }));
    };

    function bindFontSizeSelector() {
        document.querySelectorAll('[data-font-size-option]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const size = btn.getAttribute('data-font-size-option');
                if (!size || !SUPPORTED.includes(size)) return;
                window.setAppFontSize(size);
                if (typeof window.closeFontSizeModal === 'function') {
                    await window.closeFontSizeModal();
                }
            });
        });
    }

    applyFontSize(readStoredFontSize());

    function bootstrap() {
        bindFontSizeSelector();
        updateFontSizeSelectorUi();
        window.addEventListener('localechange', updateFontSizeSelectorUi);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
