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
        'form-picker': 'sheet',
        'scroll-picker': 'sheet',
        'payment-sheet': 'sheet',
        'host-payment-info-modal': 'modal',
        'host-manage-modal': 'modal',
        'delete-activity-confirm-modal': 'modal',
        'publish-duplicate-modal': 'modal',
        'version-modal': 'modal',
        'feedback-modal': 'modal',
        'private-share-modal': 'modal',
        'host-qr-crop-modal': 'modal',
        'avatar-crop-modal': 'modal',
        'auth-modal': 'modal'
    };

    /** 點背景時應呼叫的關閉函數（含業務清理） */
    const OVERLAY_CLOSE_HANDLERS = {
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

    const SWIPE_DISMISS_THRESHOLD = 72;
    const SWIPE_DISMISS_VELOCITY = 0.45;

    function resetPanelDragStyles(el) {
        const panel = findOverlayPanel(el);
        const backdrop = el?.querySelector(':scope > .muji-overlay__backdrop');
        if (panel) {
            panel.classList.remove('muji-overlay__panel--dragging', 'muji-overlay__panel--snapping');
            panel.style.transform = '';
            panel.style.transition = '';
            panel.style.opacity = '';
        }
        if (backdrop) {
            backdrop.style.opacity = '';
            backdrop.style.transition = '';
        }
    }

    function bindSheetSwipeDismiss(el) {
        if (!el?.dataset.mujiSwipeDismiss || el.dataset.mujiSwipeBound === '1') return;

        const panel = findOverlayPanel(el);
        const dragHandle = panel?.querySelector('[data-sheet-drag-handle]');
        const scrollBody = panel?.querySelector('.bottom-sheet-body');
        if (!panel || !dragHandle) return;

        let startY = 0;
        let lastY = 0;
        let lastTime = 0;
        let dragY = 0;
        let dragging = false;
        let activeSource = null;

        function isInteractiveTarget(target) {
            return Boolean(target.closest('[data-sheet-no-drag], button, input, textarea, select, a, label'));
        }

        function applyDrag(offsetY) {
            dragY = Math.max(0, offsetY);
            panel.classList.add('muji-overlay__panel--dragging');
            panel.style.transform = `translate3d(0, ${dragY}px, 0)`;

            const backdrop = el.querySelector(':scope > .muji-overlay__backdrop');
            if (backdrop) {
                backdrop.style.transition = 'none';
                backdrop.style.opacity = String(Math.max(0, 1 - dragY / 220));
            }
        }

        function snapBack() {
            panel.classList.remove('muji-overlay__panel--dragging');
            panel.classList.add('muji-overlay__panel--snapping');
            dragHandle.classList.remove('is-sheet-dragging');
            panel.style.transform = 'translate3d(0, 0, 0)';

            const backdrop = el.querySelector(':scope > .muji-overlay__backdrop');
            if (backdrop) {
                backdrop.style.transition = '';
                backdrop.style.opacity = '';
            }

            dragY = 0;
            window.setTimeout(() => {
                panel.classList.remove('muji-overlay__panel--snapping');
                panel.style.transform = '';
                panel.style.transition = '';
            }, 220);
        }

        function finishDrag(event) {
            if (!activeSource) return;

            const moved = dragging && dragY > 0;
            activeSource = null;
            dragging = false;
            dragHandle.classList.remove('is-sheet-dragging');

            if (!moved) {
                resetPanelDragStyles(el);
                return;
            }

            const touch = event.changedTouches?.[0];
            const velocity = touch
                ? Math.max(0, (touch.clientY - lastY) / Math.max(16, event.timeStamp - lastTime))
                : 0;
            const shouldDismiss = dragY >= SWIPE_DISMISS_THRESHOLD || velocity >= SWIPE_DISMISS_VELOCITY;

            if (shouldDismiss) {
                dismissOverlay(el);
                return;
            }

            snapBack();
        }

        function onDragStart(event, source) {
            if (!el.classList.contains('is-open')) return;
            if (isInteractiveTarget(event.target)) return;

            const touch = event.touches[0];
            startY = touch.clientY;
            lastY = startY;
            lastTime = event.timeStamp;
            dragY = 0;
            dragging = false;
            activeSource = source;
        }

        function onDragMove(event) {
            if (!activeSource) return;

            const touch = event.touches[0];
            const deltaY = touch.clientY - startY;

            if (activeSource === 'body') {
                if ((scrollBody?.scrollTop || 0) > 0) {
                    activeSource = null;
                    return;
                }
                if (deltaY <= 0) return;
                if (!dragging && deltaY < 10) return;
            } else if (!dragging && Math.abs(deltaY) < 4) {
                return;
            }

            dragging = true;
            dragHandle.classList.add('is-sheet-dragging');
            event.preventDefault();
            applyDrag(deltaY);
            lastY = touch.clientY;
            lastTime = event.timeStamp;
        }

        dragHandle.addEventListener('touchstart', event => onDragStart(event, 'handle'), { passive: true });
        dragHandle.addEventListener('touchmove', onDragMove, { passive: false });
        dragHandle.addEventListener('touchend', finishDrag);
        dragHandle.addEventListener('touchcancel', finishDrag);

        if (scrollBody) {
            scrollBody.addEventListener('touchstart', event => {
                if ((scrollBody.scrollTop || 0) > 0) return;
                onDragStart(event, 'body');
            }, { passive: true });
            scrollBody.addEventListener('touchmove', onDragMove, { passive: false });
            scrollBody.addEventListener('touchend', finishDrag);
            scrollBody.addEventListener('touchcancel', finishDrag);
        }

        el.dataset.mujiSwipeBound = '1';
    }

    function dismissOverlay(el) {
        const handler = OVERLAY_CLOSE_HANDLERS[el.id];
        if (handler) {
            handler();
            return;
        }
        closeMujiOverlay(el);
    }

    function bindOverlayDismiss(el) {
        if (!el || el.dataset.mujiDismissBound === '1') return;

        const backdrop = el.querySelector(':scope > .muji-overlay__backdrop');
        const legacyHandler = backdrop
            ? parseLegacyDismissFn(backdrop.getAttribute('onclick'))
            : null;

        if (backdrop) {
            backdrop.classList.remove('absolute', 'inset-0', 'fixed');
            backdrop.removeAttribute('onclick');
        }

        const tryDismiss = event => {
            const target = event.target;
            if (target.closest('.muji-overlay__panel')) return;
            if (target === el || target.classList.contains('muji-overlay__backdrop')) {
                event.preventDefault();
                event.stopPropagation();
                (OVERLAY_CLOSE_HANDLERS[el.id] || legacyHandler || (() => closeMujiOverlay(el)))();
            }
        };

        el.addEventListener('click', tryDismiss);
        el.addEventListener('touchend', tryDismiss, { passive: false });

        el.dataset.mujiDismissBound = '1';
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

        bindOverlayDismiss(el);
        bindSheetSwipeDismiss(el);
        el.dataset.mujiOverlayReady = '1';
    }

    function onEscapeKey(event) {
        if (event.key !== 'Escape') return;
        const openOverlay = document.querySelector('.muji-overlay.is-open');
        if (!openOverlay) return;
        event.preventDefault();
        dismissOverlay(openOverlay);
    }

    function initOverlayRegistry() {
        Object.entries(OVERLAY_VARIANTS).forEach(([id, variant]) => {
            ensureOverlayStructure(document.getElementById(id), variant);
        });
        document.querySelectorAll('[data-muji-overlay]').forEach(el => {
            ensureOverlayStructure(el, el.dataset.mujiOverlay || 'modal');
        });
        document.addEventListener('keydown', onEscapeKey);
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
        resetPanelDragStyles(el);
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
        resetPanelDragStyles(el);
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
