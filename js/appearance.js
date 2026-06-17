/**
 * appearance.js — App 外觀（淺色 / 深色 / 跟隨系統）
 */
(function initAppAppearance() {
    const STORAGE_KEY = 'plus1_appearance';
    const SUPPORTED = ['light', 'dark', 'system'];
    const LABEL_KEYS = {
        light: 'settings.appearanceLight',
        dark: 'settings.appearanceDark',
        system: 'settings.appearanceSystem'
    };

    let currentPreference = 'light';
    let systemMedia = null;

    function labelForPreference(preference) {
        const key = LABEL_KEYS[preference] || LABEL_KEYS.light;
        return typeof window.t === 'function' ? window.t(key) : key;
    }

    function resolveAppearance(preference) {
        if (preference === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return preference === 'dark' ? 'dark' : 'light';
    }

    function updateThemeColor(resolved) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = resolved === 'dark' ? '#1c1c1c' : '#ffffff';
    }

    function applyAppearance(preference) {
        if (!SUPPORTED.includes(preference)) preference = 'light';
        currentPreference = preference;
        const resolved = resolveAppearance(preference);
        document.documentElement.setAttribute('data-appearance', resolved);
        document.documentElement.setAttribute('data-appearance-preference', preference);
        updateThemeColor(resolved);
    }

    function readStoredAppearance() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && SUPPORTED.includes(stored)) return stored;
        } catch (_err) { /* ignore */ }
        return 'light';
    }

    function persistAppearance(preference) {
        try {
            localStorage.setItem(STORAGE_KEY, preference);
        } catch (_err) { /* ignore */ }
    }

    function bindSystemAppearanceListener() {
        if (systemMedia || typeof window.matchMedia !== 'function') return;
        systemMedia = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => {
            if (currentPreference === 'system') {
                applyAppearance('system');
                window.dispatchEvent(new CustomEvent('appearancechange', {
                    detail: { preference: currentPreference, resolved: resolveAppearance('system') }
                }));
            }
        };
        if (typeof systemMedia.addEventListener === 'function') {
            systemMedia.addEventListener('change', onChange);
        } else if (typeof systemMedia.addListener === 'function') {
            systemMedia.addListener(onChange);
        }
    }

    window.getAppAppearancePreference = function getAppAppearancePreference() {
        return currentPreference;
    };

    window.getResolvedAppAppearance = function getResolvedAppAppearance() {
        return resolveAppearance(currentPreference);
    };

    window.updateSettingsAppearanceLabel = function updateSettingsAppearanceLabel() {
        const label = document.getElementById('settings-appearance-label');
        if (label) label.textContent = labelForPreference(currentPreference);
    };

    function updateAppearanceSelectorUi() {
        document.querySelectorAll('[data-appearance-option]').forEach((btn) => {
            const preference = btn.getAttribute('data-appearance-option');
            const active = preference === currentPreference;
            btn.classList.toggle('is-active-profile-action', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        window.updateSettingsAppearanceLabel();
    }

    window.setAppAppearance = function setAppAppearance(preference, options = {}) {
        applyAppearance(preference);
        if (!options.skipPersist) persistAppearance(preference);
        updateAppearanceSelectorUi();
        window.dispatchEvent(new CustomEvent('appearancechange', {
            detail: {
                preference: currentPreference,
                resolved: resolveAppearance(currentPreference)
            }
        }));
    };

    function bindAppearanceSelector() {
        document.querySelectorAll('[data-appearance-option]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const preference = btn.getAttribute('data-appearance-option');
                if (!preference || !SUPPORTED.includes(preference)) return;
                window.setAppAppearance(preference);
                if (typeof window.closeAppearanceModal === 'function') {
                    await window.closeAppearanceModal();
                }
            });
        });
    }

    applyAppearance(readStoredAppearance());

    function bootstrap() {
        bindSystemAppearanceListener();
        bindAppearanceSelector();
        updateAppearanceSelectorUi();
        window.addEventListener('localechange', updateAppearanceSelectorUi);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
