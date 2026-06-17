/**
 * communities.js — 社群（Phase 1：建立、邀請連結、成員列表）
 */
(function initCommunitiesModule() {
    let myCommunities = [];
    let activeCommunityId = null;
    let activeCommunityDetail = null;
    let pendingCommunityInviteId = null;
    let communitiesReturnPage = 'settings';

    function i18n(key, params) {
        if (typeof window.t === 'function') return window.t(key, params);
        return key;
    }

    function isSignedIn() {
        return Boolean(window.firebaseAuthUid);
    }

    async function waitForDbBridge() {
        if (window.firebaseDbBridgeReady) return true;
        return new Promise(resolve => {
            const timer = setTimeout(() => resolve(false), 8000);
            const onReady = () => {
                clearTimeout(timer);
                resolve(true);
            };
            if (window.firebaseDbBridgeReady) {
                clearTimeout(timer);
                resolve(true);
                return;
            }
            window.addEventListener('firebase-auth-ready', onReady, { once: true });
        });
    }

    function getCommunityIdFromUrl() {
        try {
            return new URLSearchParams(window.location.search).get('community')?.trim() || null;
        } catch (_err) {
            return null;
        }
    }

    function clearCommunityUrlParam() {
        try {
            const url = new URL(window.location.href);
            if (!url.searchParams.has('community')) return;
            url.searchParams.delete('community');
            const next = `${url.pathname}${url.search}${url.hash}`;
            window.history.replaceState({}, '', next);
        } catch (_err) { /* ignore */ }
    }

    function buildCommunityInviteUrl(communityId) {
        const url = new URL(window.location.href);
        url.search = '';
        url.searchParams.set('community', communityId);
        return url.toString();
    }

    function updateSettingsCommunitiesLabel() {
        const label = document.getElementById('settings-communities-label');
        if (!label) return;
        if (!isSignedIn()) {
            label.textContent = '—';
            return;
        }
        const count = myCommunities.length;
        label.textContent = count > 0
            ? i18n('community.settingsCount', { n: count })
            : i18n('community.settingsNone');
    }

    function showListView() {
        activeCommunityId = null;
        activeCommunityDetail = null;
        document.getElementById('communities-list-view')?.classList.remove('hidden');
        document.getElementById('community-detail-view')?.classList.add('hidden');
    }

    function showDetailView(communityId) {
        activeCommunityId = communityId;
        document.getElementById('communities-list-view')?.classList.add('hidden');
        document.getElementById('community-detail-view')?.classList.remove('hidden');
    }

    function renderCommunityList() {
        const listEl = document.getElementById('communities-list');
        const emptyEl = document.getElementById('communities-empty');
        const createBtn = document.getElementById('create-community-btn');
        if (!listEl || !emptyEl) return;

        if (!isSignedIn()) {
            listEl.innerHTML = '';
            emptyEl.classList.remove('hidden');
            emptyEl.textContent = i18n('community.emptyGuest');
            if (createBtn) createBtn.disabled = true;
            updateSettingsCommunitiesLabel();
            return;
        }

        if (createBtn) createBtn.disabled = false;

        if (!myCommunities.length) {
            listEl.innerHTML = '';
            emptyEl.classList.remove('hidden');
            emptyEl.textContent = i18n('community.empty');
            updateSettingsCommunitiesLabel();
            return;
        }

        emptyEl.classList.add('hidden');
        listEl.innerHTML = myCommunities.map(item => {
            const roleLabel = item.role === 'owner'
                ? i18n('community.roleOwner')
                : i18n('community.roleMember');
            return `
                <button type="button" class="community-list-item" data-community-id="${escapeHtml(item.communityId || item.id)}" role="listitem">
                    <span class="community-list-item__name">${escapeHtml(item.name || '')}</span>
                    <span class="community-list-item__meta">${escapeHtml(roleLabel)}</span>
                </button>
            `;
        }).join('');

        listEl.querySelectorAll('[data-community-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                openCommunityDetail(btn.getAttribute('data-community-id'));
            });
        });

        updateSettingsCommunitiesLabel();
    }

    function renderMemberRow(member) {
        const initial = (member.displayName || '?').trim().charAt(0) || '?';
        const roleBadge = member.role === 'owner'
            ? `<span class="community-member-role">${escapeHtml(i18n('community.roleOwner'))}</span>`
            : '';
        const avatar = member.photoURL
            ? `<img src="${escapeHtml(member.photoURL)}" alt="" class="community-member-avatar">`
            : `<span class="community-member-avatar community-member-avatar--initial">${escapeHtml(initial)}</span>`;

        return `
            <div class="community-member-row" role="listitem">
                ${avatar}
                <span class="community-member-name">${escapeHtml(member.displayName || i18n('community.unknownMember'))}</span>
                ${roleBadge}
            </div>
        `;
    }

    async function openCommunityDetail(communityId) {
        const id = String(communityId || '').trim();
        if (!id) return;

        if (!isSignedIn()) {
            alert(i18n('community.loginRequired'));
            return;
        }

        const bridgeReady = await waitForDbBridge();
        if (!bridgeReady) {
            alert(i18n('community.dbOffline'));
            return;
        }

        try {
            const [community, members] = await Promise.all([
                window.dbFetchCommunityById(id),
                window.dbFetchCommunityMembers(id)
            ]);

            if (!community) {
                alert(i18n('community.notFound'));
                return;
            }

            const membership = myCommunities.find(c => (c.communityId || c.id) === id);
            if (!membership) {
                alert(i18n('community.notMember'));
                return;
            }

            activeCommunityDetail = { ...community, members, membership };
            showDetailView(id);

            const nameEl = document.getElementById('community-detail-name');
            const descEl = document.getElementById('community-detail-desc');
            const roleEl = document.getElementById('community-detail-role');
            const inviteInput = document.getElementById('community-invite-url');
            const membersList = document.getElementById('community-members-list');
            const leaveBtn = document.getElementById('community-leave-btn');
            const deleteBtn = document.getElementById('community-delete-btn');

            if (nameEl) nameEl.textContent = community.name || '';
            if (descEl) {
                const desc = String(community.description || '').trim();
                descEl.textContent = desc;
                descEl.classList.toggle('hidden', !desc);
            }
            if (roleEl) {
                roleEl.textContent = membership.role === 'owner'
                    ? i18n('community.youAreOwner')
                    : i18n('community.youAreMember');
            }
            if (inviteInput) inviteInput.value = buildCommunityInviteUrl(id);
            if (membersList) {
                membersList.innerHTML = members.map(renderMemberRow).join('');
            }

            const isOwner = membership.role === 'owner';
            const soloOwner = isOwner && members.length <= 1;
            leaveBtn?.classList.toggle('hidden', isOwner);
            deleteBtn?.classList.toggle('hidden', !soloOwner);
        } catch (err) {
            console.error('載入社群詳情失敗:', err);
            alert(i18n('community.loadFailed'));
        }
    }

    async function refreshMyCommunities() {
        if (!isSignedIn()) {
            myCommunities = [];
            renderCommunityList();
            return;
        }

        const bridgeReady = await waitForDbBridge();
        if (!bridgeReady || typeof window.dbListMyCommunities !== 'function') {
            renderCommunityList();
            return;
        }

        try {
            myCommunities = await window.dbListMyCommunities();
        } catch (err) {
            console.error('讀取社群列表失敗:', err);
            myCommunities = [];
        }
        renderCommunityList();
    }

    async function openCreateCommunityModal() {
        if (!isSignedIn()) {
            alert(i18n('community.loginRequired'));
            return;
        }

        const modal = document.getElementById('create-community-modal');
        const nameInput = document.getElementById('create-community-name');
        const descInput = document.getElementById('create-community-desc');
        const statusEl = document.getElementById('create-community-status');
        if (!modal) return;

        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        statusEl?.classList.add('hidden');

        if (typeof window.openMujiOverlay === 'function') {
            await window.openMujiOverlay(modal);
        } else {
            modal.classList.remove('hidden');
        }
        nameInput?.focus();
    }

    function closeCreateCommunityModal() {
        const modal = document.getElementById('create-community-modal');
        if (!modal) return;
        if (typeof window.closeMujiOverlay === 'function') {
            window.closeMujiOverlay(modal);
        } else {
            modal.classList.add('hidden');
        }
    }

    async function submitCreateCommunity() {
        const nameInput = document.getElementById('create-community-name');
        const descInput = document.getElementById('create-community-desc');
        const statusEl = document.getElementById('create-community-status');
        const submitBtn = document.getElementById('create-community-submit-btn');
        const name = nameInput?.value?.trim() || '';
        const description = descInput?.value?.trim() || '';

        if (!name) {
            if (statusEl) {
                statusEl.textContent = i18n('community.nameRequired');
                statusEl.classList.remove('hidden');
            }
            return;
        }

        const bridgeReady = await waitForDbBridge();
        if (!bridgeReady || typeof window.dbCreateCommunity !== 'function') {
            alert(i18n('community.dbOffline'));
            return;
        }

        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = i18n('community.creating');
        }

        try {
            const result = await window.dbCreateCommunity({ name, description });
            closeCreateCommunityModal();
            await refreshMyCommunities();
            if (result?.communityId) {
                await openCommunityDetail(result.communityId);
            }
        } catch (err) {
            console.error('建立社群失敗:', err);
            const step = err?.communityStep;
            let message;
            if (err?.code === 'permission-denied') {
                message = step
                    ? `${i18n('community.permissionDenied')}（${step}）`
                    : i18n('community.rulesNotDeployed');
            } else if (err?.code === 'community/invalid-name') {
                message = i18n('community.nameInvalid');
            } else {
                message = err?.message || i18n('community.createFailed');
            }
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.classList.remove('hidden');
            } else {
                alert(message);
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText || i18n('community.createSubmit');
            }
        }
    }

    async function copyCommunityInviteLink() {
        const input = document.getElementById('community-invite-url');
        const link = input?.value?.trim();
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            alert(i18n('community.linkCopied'));
        } catch (_err) {
            input?.select();
            document.execCommand('copy');
            alert(i18n('community.linkCopied'));
        }
    }

    async function handleLeaveCommunity() {
        if (!activeCommunityId) return;
        if (!confirm(i18n('community.leaveConfirm'))) return;

        try {
            await window.dbLeaveCommunity(activeCommunityId);
            showListView();
            await refreshMyCommunities();
            alert(i18n('community.left'));
        } catch (err) {
            console.error('離開社群失敗:', err);
            alert(err?.message || i18n('community.leaveFailed'));
        }
    }

    async function handleDeleteCommunity() {
        if (!activeCommunityId) return;
        if (!confirm(i18n('community.deleteConfirm'))) return;

        try {
            await window.dbDeleteCommunity(activeCommunityId);
            showListView();
            await refreshMyCommunities();
            alert(i18n('community.deleted'));
        } catch (err) {
            console.error('刪除社群失敗:', err);
            alert(err?.message || i18n('community.deleteFailed'));
        }
    }

    async function processCommunityInviteFromUrl() {
        const communityId = getCommunityIdFromUrl();
        if (!communityId) return;

        pendingCommunityInviteId = communityId;

        if (!isSignedIn()) {
            return;
        }

        await attemptJoinCommunityInvite();
    }

    async function attemptJoinCommunityInvite() {
        const communityId = pendingCommunityInviteId || getCommunityIdFromUrl();
        if (!communityId || !isSignedIn()) return;

        const bridgeReady = await waitForDbBridge();
        if (!bridgeReady || typeof window.dbJoinCommunity !== 'function') return;

        try {
            const result = await window.dbJoinCommunity(communityId);
            pendingCommunityInviteId = null;
            clearCommunityUrlParam();
            await refreshMyCommunities();

            if (result?.alreadyMember) {
                alert(i18n('community.alreadyMember', { name: result.name || '' }));
            } else {
                alert(i18n('community.joined', { name: result.name || '' }));
            }

            if (typeof window.switchPage === 'function') {
                communitiesReturnPage = 'match';
                await window.switchPage('communities');
            }
            await openCommunityDetail(communityId);
        } catch (err) {
            console.error('加入社群失敗:', err);
            if (err?.code === 'community/not-found') {
                alert(i18n('community.notFound'));
                clearCommunityUrlParam();
            } else {
                alert(err?.message || i18n('community.joinFailed'));
            }
        }
    }

    function bindCommunitiesUI() {
        document.getElementById('settings-communities-btn')?.addEventListener('click', async () => {
            communitiesReturnPage = 'settings';
            if (typeof window.switchPage === 'function') {
                await window.switchPage('communities');
            }
        });

        document.getElementById('communities-back-btn')?.addEventListener('click', async () => {
            if (activeCommunityId) {
                showListView();
                return;
            }
            if (typeof window.switchPage === 'function') {
                await window.switchPage(communitiesReturnPage || 'settings');
            }
        });

        document.getElementById('create-community-btn')?.addEventListener('click', openCreateCommunityModal);
        document.getElementById('create-community-submit-btn')?.addEventListener('click', submitCreateCommunity);
        document.getElementById('create-community-cancel-btn')?.addEventListener('click', closeCreateCommunityModal);
        document.getElementById('create-community-modal')?.addEventListener('click', event => {
            if (event.target.id === 'create-community-modal' || event.target.classList.contains('muji-overlay__backdrop')) {
                closeCreateCommunityModal();
            }
        });

        document.getElementById('community-copy-invite-btn')?.addEventListener('click', copyCommunityInviteLink);
        document.getElementById('community-leave-btn')?.addEventListener('click', handleLeaveCommunity);
        document.getElementById('community-delete-btn')?.addEventListener('click', handleDeleteCommunity);

        window.addEventListener('firebase-auth-ready', () => {
            refreshMyCommunities();
            attemptJoinCommunityInvite();
        });

        window.addEventListener('localechange', () => {
            renderCommunityList();
            if (activeCommunityId && activeCommunityDetail) {
                openCommunityDetail(activeCommunityId);
            }
        });
    }

    async function onCommunitiesPageOpen() {
        showListView();
        await refreshMyCommunities();
        await processCommunityInviteFromUrl();
    }

    window.initCommunitiesApp = function initCommunitiesApp() {
        bindCommunitiesUI();
        refreshMyCommunities();
        processCommunityInviteFromUrl();
    };

    window.onCommunitiesPageOpen = onCommunitiesPageOpen;
    window.refreshMyCommunities = refreshMyCommunities;
})();
