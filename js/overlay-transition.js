/**
 * overlay-transition.js — 全站 MUJI 毛玻璃淡入淡出過渡
 * 供分頁切換、彈窗、底部面板共用。
 */
(function initMujiTransitions(global) {
    const OVERLAY_MS = 300;
    const PAGE_LEAVE_MS = 300;
    const PAGE_ENTER_MS = 400;

    const OVERLAY_VARIANTS = {
        'disclaimer-modal': 'modal',
        'bottom-sheet': 'sheet',
        'form-picker': 'sheet',
        'scroll-picker': 'sheet',
        'payment-sheet': 'sheet',
        'host-payment-info-modal': 'modal',
        'host-manage-modal': 'modal',
        'private-share-modal': 'modal',
        'host-qr-crop-modal': 'modal',
        'avatar-crop-modal': 'modal',
        'auth-modal': 'modal'
    };

    /** 點背景時應呼叫的關閉函數（含業務清理） */
    const OVERLAY_CLOSE_HANDLERS = {
        'bottom-sheet': () => global.toggleBottomSheet?.(false),
        'form-picker': () => global.toggleFormPicker?.(false),
        'scroll-picker': () => global.toggleScrollPicker?.(false),
        'payment-sheet': () => global.togglePaymentSheet?.(false)
    };

    const overlayState = new WeakMap();

    function prefersReducedMotion() {
        return global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    }

    function resolveEl(target) {
        if (!target) return null;
        return typeof target === 'string' ? document.getElementById(target) : target;
    }

    function nextPaint() {
        return new Promise(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
    }

    function waitMs(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function waitAnimation(el, animationName, timeoutMs) {
        return new Promise(resolve => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                el.removeEventListener('animationend', onEnd);
                resolve();
            };
            const onEnd = event => {
                if (event.target !== el) return;
                if (!animationName || event.animationName === animationName) finish();
            };
            el.addEventListener('animationend', onEnd);
            setTimeout(finish, timeoutMs);
        });
    }

    function findOverlayPanel(el) {
        return [...el.children].find(child => {
            if (child.classList.contains('muji-overlay__backdrop')) return false;
            if (child.classList.contains('payment-sheet-backdrop')) return false;
            return true;
        }) || null;
    }

    function portalOverlayToBody(el) {
        if (!el || el.dataset.mujiPortaled === '1') return;
        if (el.parentElement !== document.body) {
            document.body.appendChild(el);
        }
        el.dataset.mujiPortaled = '1';
    }

    function parseLegacyDismissFn(onclickAttr) {
        if (!onclickAttr) return null;
        const match = onclickAttr.match(/([A-Za-z_$][\w$]*)\((false|0)?\)/);
        if (!match) return null;
        const fn = global[match[1]];
        if (typeof fn !== 'function') return null;
        return () => fn(match[2] === 'false' ? false : undefined);
    }

    function bindBackdropDismiss(el, backdrop) {
        if (!backdrop || backdrop.dataset.mujiDismissBound === '1') return;

        const legacyHandler = parseLegacyDismissFn(backdrop.getAttribute('onclick'));
        if (legacyHandler) {
            backdrop.removeAttribute('onclick');
        }

        const dismiss = () => {
            const handler = OVERLAY_CLOSE_HANDLERS[el.id] || legacyHandler;
            if (handler) {
                handler();
                return;
            }
            closeMujiOverlay(el);
        };

        backdrop.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            dismiss();
        });

        backdrop.dataset.mujiDismissBound = '1';
    }

    function syncBodyOverlayLock() {
        const hasOpen = document.querySelector('.muji-overlay.is-open');
        document.body.classList.toggle('muji-overlay-open', Boolean(hasOpen));
    }

    function ensureOverlayStructure(el, variant = 'modal') {
        if (!el) return;

        portalOverlayToBody(el);

        el.classList.add('muji-overlay', `muji-overlay--${variant}`);
        el.classList.remove('bg-black/40', 'bg-black/45', 'bg-black/55', 'bg-black/60');

        let backdrop = el.querySelector(':scope > .muji-overlay__backdrop');
        const legacyBackdrop = el.querySelector(':scope > .payment-sheet-backdrop, :scope > .absolute.inset-0');
        if (!backdrop && legacyBackdrop) {
            legacyBackdrop.classList.add('muji-overlay__backdrop');
            backdrop = legacyBackdrop;
        }
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'muji-overlay__backdrop';
            backdrop.setAttribute('aria-hidden', 'true');
            el.insertBefore(backdrop, el.firstChild);
        }

        const panel = findOverlayPanel(el);
        if (panel) {
            panel.classList.add('muji-overlay__panel');
        }

        bindBackdropDismiss(el, backdrop);
        el.dataset.mujiOverlayReady = '1';
    }

    function initOverlayRegistry() {
        Object.entries(OVERLAY_VARIANTS).forEach(([id, variant]) => {
            ensureOverlayStructure(document.getElementById(id), variant);
        });
        document.querySelectorAll('[data-muji-overlay]').forEach(el => {
            ensureOverlayStructure(el, el.dataset.mujiOverlay || 'modal');
        });
    }

    async function openMujiOverlay(target, options = {}) {
        const el = resolveEl(target);
        if (!el) return;
        const variant = options.variant || OVERLAY_VARIANTS[el.id] || 'modal';
        ensureOverlayStructure(el, variant);

        const state = overlayState.get(el) || { token: 0 };
        state.token += 1;
        const token = state.token;
        overlayState.set(el, state);

        if (el.classList.contains('is-open')) {
            syncBodyOverlayLock();
            return;
        }

        el.classList.remove('hidden');
        await nextPaint();
        if (token !== state.token) return;

        el.classList.add('is-open');
        syncBodyOverlayLock();
    }

    async function closeMujiOverlay(target, options = {}) {
        const el = resolveEl(target);
        if (!el) return;

        const state = overlayState.get(el) || { token: 0 };
        state.token += 1;
        overlayState.set(el, state);

        if (!el.classList.contains('is-open') && el.classList.contains('hidden')) return;

        el.classList.remove('is-open');
        const delay = prefersReducedMotion() ? 0 : (options.duration || OVERLAY_MS);
        await waitMs(delay);
        el.classList.add('hidden');
        syncBodyOverlayLock();
        options.onHidden?.();
    }

    function setPageVeil(visible) {
        const veil = document.getElementById('page-transition-veil');
        if (!veil) return;
        if (visible) {
            veil.classList.add('is-visible');
        } else {
            veil.classList.remove('is-visible');
        }
        veil.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    async function showPageVeil() {
        const veil = document.getElementById('page-transition-veil');
        if (!veil) return;
        veil.classList.remove('is-visible');
        void veil.offsetWidth;
        await nextPaint();
        setPageVeil(true);
    }

    async function hidePageVeil() {
        setPageVeil(false);
        if (!prefersReducedMotion()) {
            await waitMs(300);
        }
    }

    async function playPageEnter(pageEl) {
        if (!pageEl || prefersReducedMotion()) {
            pageEl?.classList.add('app-page--active');
            return;
        }

        pageEl.classList.remove('app-page--active', 'hidden');
        pageEl.classList.add('app-page--entering');
        void pageEl.offsetWidth;
        await waitAnimation(pageEl, 'mujiPageEnter', PAGE_ENTER_MS + 20);
        pageEl.classList.remove('app-page--entering');
        pageEl.classList.add('app-page--active');
    }

    async function playPageLeave(pageEl) {
        if (!pageEl || prefersReducedMotion()) return;

        pageEl.classList.remove('app-page--active');
        pageEl.classList.add('app-page--leaving');
        void pageEl.offsetWidth;
        await waitAnimation(pageEl, 'mujiPageLeave', PAGE_LEAVE_MS + 20);
        pageEl.classList.remove('app-page--leaving');
        pageEl.classList.add('hidden');
    }

    global.MUJI_TRANSITION_MS = { OVERLAY_MS, PAGE_LEAVE_MS, PAGE_ENTER_MS };
    global.openMujiOverlay = openMujiOverlay;
    global.closeMujiOverlay = closeMujiOverlay;
    global.showPageVeil = showPageVeil;
    global.hidePageVeil = hidePageVeil;
    global.playPageEnter = playPageEnter;
    global.playPageLeave = playPageLeave;
    global.prefersReducedMotion = prefersReducedMotion;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOverlayRegistry);
    } else {
        initOverlayRegistry();
    }
})(window);
