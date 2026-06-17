/**
 * pull-refresh.js — 首頁／我的場次下拉刷新 + 切回 App 靜默刷新
 */
(function initPullRefresh(global) {
    const REFRESHABLE_PAGES = new Set(['match', 'profile']);
    const COOLDOWN_MS = 2000;
    const PULL_THRESHOLD = 64;
    const PULL_MAX = 108;
    const MIN_REFRESH_SPINNER_MS = 380;
    const MIN_HIDDEN_MS = 500;

    let refreshInFlight = null;
    let lastRefreshAt = 0;
    let hiddenSince = 0;

    let pullTracking = false;
    let pullStartY = 0;
    let pullStartX = 0;
    let pullDistance = 0;
    let pullLocked = false;

    function getIndicator() {
        return document.getElementById('pull-refresh-indicator');
    }

    function getActivePageEl() {
        const pageId = typeof global.getCurrentAppPageId === 'function'
            ? global.getCurrentAppPageId()
            : 'match';
        return document.getElementById(`page-${pageId}`);
    }

    function isRefreshablePage(pageId) {
        return REFRESHABLE_PAGES.has(pageId);
    }

    function isPullRefreshBlocked() {
        const splash = document.getElementById('splash-screen');
        if (splash && splash.style.display !== 'none' && !splash.classList.contains('opacity-0')) {
            return true;
        }
        if (document.body.classList.contains('muji-overlay-open')) return true;
        if (document.body.classList.contains('publish-page-open')) return true;
        if (document.querySelector('.muji-overlay.is-open')) return true;
        if (typeof global.isPublishPageOpen === 'function' && global.isPublishPageOpen()) return true;
        return false;
    }

    function isAtScrollTop() {
        const root = document.documentElement;
        return (global.scrollY || root.scrollTop || 0) <= 1;
    }

    function setIndicatorOffset(pullPx, state = '') {
        const indicator = getIndicator();
        if (!indicator) return;

        const y = Math.max(0, Math.min(pullPx, PULL_MAX));
        indicator.style.transform = `translateX(-50%) translateY(calc(-100% + ${y}px))`;
        indicator.classList.toggle('is-visible', y > 4);
        indicator.classList.toggle('is-ready', y >= PULL_THRESHOLD);
        indicator.classList.toggle('is-refreshing', state === 'refreshing');

        const label = indicator.querySelector('.pull-refresh-indicator__label');
        if (label && typeof global.t === 'function') {
            if (state === 'refreshing') {
                label.textContent = global.t('refresh.updating');
            } else if (y >= PULL_THRESHOLD) {
                label.textContent = global.t('refresh.release');
            } else {
                label.textContent = global.t('refresh.pulling');
            }
        }
    }

    function setPagePullOffset(pullPx) {
        const page = getActivePageEl();
        if (!page) return;
        const y = Math.max(0, Math.min(pullPx, PULL_MAX));
        page.style.transform = y > 0 ? `translateY(${y}px)` : '';
    }

    function resetPullVisuals() {
        setIndicatorOffset(0);
        const page = getActivePageEl();
        if (page) page.style.transform = '';
    }

    async function refreshAppData(pageId, options = {}) {
        const { silent = false } = options;
        if (!isRefreshablePage(pageId)) return;

        const now = Date.now();
        if (refreshInFlight) return refreshInFlight;
        if (now - lastRefreshAt < COOLDOWN_MS) return;

        lastRefreshAt = now;
        const startedAt = now;

        refreshInFlight = (async () => {
            try {
                if (typeof global.loadActivitiesFromCloud === 'function') {
                    await global.loadActivitiesFromCloud();
                }
                if (pageId === 'match' && typeof global.renderMatches === 'function') {
                    await global.renderMatches();
                }
                if (pageId === 'profile' && typeof global.renderMyActivities === 'function') {
                    await global.renderMyActivities();
                }
            } catch (err) {
                console.warn('[+1] 頁面刷新失敗:', err);
            } finally {
                if (!silent) {
                    const elapsed = Date.now() - startedAt;
                    const waitMs = Math.max(0, MIN_REFRESH_SPINNER_MS - elapsed);
                    if (waitMs > 0) {
                        await new Promise(resolve => setTimeout(resolve, waitMs));
                    }
                }
                refreshInFlight = null;
            }
        })();

        return refreshInFlight;
    }

    async function triggerPullRefresh() {
        const pageId = typeof global.getCurrentAppPageId === 'function'
            ? global.getCurrentAppPageId()
            : 'match';
        if (!isRefreshablePage(pageId) || isPullRefreshBlocked()) {
            resetPullVisuals();
            return;
        }

        const task = refreshAppData(pageId, { silent: false });
        if (!task) {
            resetPullVisuals();
            return;
        }

        setIndicatorOffset(PULL_THRESHOLD, 'refreshing');
        setPagePullOffset(PULL_THRESHOLD);

        try {
            await task;
        } finally {
            resetPullVisuals();
        }
    }

    async function triggerSilentResumeRefresh() {
        const pageId = typeof global.getCurrentAppPageId === 'function'
            ? global.getCurrentAppPageId()
            : 'match';
        if (!isRefreshablePage(pageId) || isPullRefreshBlocked()) return;
        await refreshAppData(pageId, { silent: true });
    }

    function onTouchStart(event) {
        if (pullLocked || refreshInFlight || isPullRefreshBlocked()) return;

        const pageId = typeof global.getCurrentAppPageId === 'function'
            ? global.getCurrentAppPageId()
            : 'match';
        if (!isRefreshablePage(pageId) || !isAtScrollTop()) return;

        const touch = event.touches[0];
        if (!touch) return;

        pullTracking = true;
        pullLocked = false;
        pullStartY = touch.clientY;
        pullStartX = touch.clientX;
        pullDistance = 0;
    }

    function onTouchMove(event) {
        if (!pullTracking || pullLocked || refreshInFlight) return;

        const touch = event.touches[0];
        if (!touch) return;

        const deltaY = touch.clientY - pullStartY;
        const deltaX = touch.clientX - pullStartX;

        if (deltaY <= 0) {
            pullDistance = 0;
            resetPullVisuals();
            return;
        }

        if (!pullLocked && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaY) < 12) {
            pullTracking = false;
            resetPullVisuals();
            return;
        }

        if (!isAtScrollTop()) {
            pullTracking = false;
            resetPullVisuals();
            return;
        }

        pullLocked = true;
        pullDistance = Math.min(deltaY * 0.55, PULL_MAX);
        setIndicatorOffset(pullDistance);
        setPagePullOffset(pullDistance);

        if (pullDistance > 8) {
            event.preventDefault();
        }
    }

    async function onTouchEnd() {
        if (!pullTracking) return;

        const shouldRefresh = pullLocked && pullDistance >= PULL_THRESHOLD;
        pullTracking = false;
        pullLocked = false;

        if (shouldRefresh) {
            pullDistance = 0;
            await triggerPullRefresh();
            return;
        }

        pullDistance = 0;
        resetPullVisuals();
    }

    function onVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            hiddenSince = Date.now();
            return;
        }
        if (document.visibilityState !== 'visible') return;
        if (!hiddenSince || Date.now() - hiddenSince < MIN_HIDDEN_MS) return;
        hiddenSince = 0;
        triggerSilentResumeRefresh();
    }

    function onPageShow(event) {
        if (!event.persisted) return;
        triggerSilentResumeRefresh();
    }

    function bindPullRefresh() {
        const indicator = getIndicator();
        if (!indicator || document.body.dataset.pullRefreshBound === '1') return;
        document.body.dataset.pullRefreshBound = '1';

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
        document.addEventListener('touchcancel', onTouchEnd, { passive: true });
        document.addEventListener('visibilitychange', onVisibilityChange);
        global.addEventListener('pageshow', onPageShow);
    }

    function bootstrap() {
        bindPullRefresh();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    global.refreshAppData = refreshAppData;
    global.triggerSilentResumeRefresh = triggerSilentResumeRefresh;
}(window));
