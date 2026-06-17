/**
 * communities.js — 社群（Phase 1：建立、邀請連結、成員列表）
 */
(function initCommunitiesModule() {
    let myCommunities = [];
    let activeCommunityId = null;
    let activeCommunityDetail = null;
    let pendingCommunityInviteId = null;
    let communitiesReturnPage = 'settings';
    const sentInvitesByCommunity = new Map();

    function getSentInviteStorageKey(communityId) {
        return `plus1-community-sent-invites-${communityId}`;
    }

    function loadSentInviteUids(communityId) {
        const id = String(communityId || '').trim();
        if (!id) return new Set();
        if (sentInvitesByCommunity.has(id)) {
            return sentInvitesByCommunity.get(id);
        }
        let uids = new Set();
        try {
            const raw = sessionStorage.getItem(getSentInviteStorageKey(id));
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) uids = new Set(parsed.filter(Boolean));
            }
        } catch (_err) { /* ignore */ }
        sentInvitesByCommunity.set(id, uids);
        return uids;
    }

    function rememberSentInvite(communityId, targetUid) {
        const id = String(communityId || '').trim();
        const uid = String(targetUid || '').trim();
        if (!id || !uid) return;
        const uids = loadSentInviteUids(id);
        uids.add(uid);
        sentInvitesByCommunity.set(id, uids);
        try {
            sessionStorage.setItem(getSentInviteStorageKey(id), JSON.stringify([...uids]));
        } catch (_err) { /* ignore */ }
    }

    function getCommunityMemberUidSet() {
        const members = activeCommunityDetail?.members || [];
        return new Set(members.map(member => String(member.uid || member.id || '').trim()).filter(Boolean));
    }

    function getSearchResultStatus(user, memberUids, sentUids) {
        const uid = String(user?.id || '').trim();
        if (!uid) return 'invite';
        if (memberUids.has(uid)) return 'member';
        if (sentUids.has(uid)) return 'invited';
        return 'invite';
    }

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

    function renderMemberRow(member, { canKick = false, currentUid = '' } = {}) {
        const memberUid = member.uid || member.id || '';
        const initial = (member.displayName || '?').trim().charAt(0) || '?';
        const roleBadge = member.role === 'owner'
            ? `<span class="community-member-role">${escapeHtml(i18n('community.roleOwner'))}</span>`
            : '';
        const avatar = member.photoURL
            ? `<img src="${escapeHtml(member.photoURL)}" alt="" class="community-member-avatar">`
            : `<span class="community-member-avatar community-member-avatar--initial">${escapeHtml(initial)}</span>`;
        const showKick = canKick
            && member.role !== 'owner'
            && memberUid
            && memberUid !== currentUid;
        const kickBtn = showKick
            ? `<button type="button" class="community-member-kick-btn" data-member-uid="${escapeHtml(memberUid)}" data-member-name="${escapeHtml(member.displayName || i18n('community.unknownMember'))}">${escapeHtml(i18n('community.kick'))}</button>`
            : '';

        return `
            <div class="community-member-row" role="listitem">
                ${avatar}
                <span class="community-member-name">${escapeHtml(member.displayName || i18n('community.unknownMember'))}</span>
                ${roleBadge}
                ${kickBtn}
            </div>
        `;
    }

    async function renderCommunitySessions(communityId) {
        const listEl = document.getElementById('community-sessions-list');
        const emptyEl = document.getElementById('community-sessions-empty');
        if (!listEl) return;

        listEl.innerHTML = '';
        emptyEl?.classList.add('hidden');

        if (typeof window.dbFetchCommunityActivities !== 'function') {
            emptyEl?.classList.remove('hidden');
            return;
        }

        try {
            const activities = await window.dbFetchCommunityActivities(communityId);
            if (!activities.length) {
                emptyEl?.classList.remove('hidden');
                return;
            }

            if (typeof window.buildMatchCardHtml === 'function') {
                listEl.innerHTML = activities.map(activity => window.buildMatchCardHtml(activity)).join('');
            } else {
                listEl.innerHTML = activities.map(activity => `
                    <div class="community-session-fallback">
                        <span>${escapeHtml(activity.playDate || '')} · ${escapeHtml(activity.venue || '')}</span>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error('載入社群場次失敗:', err);
            if (emptyEl) {
                emptyEl.textContent = i18n('community.sessionsLoadFailed');
                emptyEl.classList.remove('hidden');
            }
        }
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

            const isOwner = membership.role === 'owner';
            if (membersList) {
                const currentUid = window.firebaseAuthUid || '';
                membersList.innerHTML = members.map(member => renderMemberRow(member, {
                    canKick: isOwner,
                    currentUid
                })).join('');
                membersList.querySelectorAll('.community-member-kick-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        handleKickCommunityMember(
                            btn.getAttribute('data-member-uid'),
                            btn.getAttribute('data-member-name')
                        );
                    });
                });
            }

            const soloOwner = isOwner && members.length <= 1;
            leaveBtn?.classList.toggle('hidden', isOwner);
            deleteBtn?.classList.toggle('hidden', !soloOwner);
            document.getElementById('community-search-invite-block')
                ?.classList.toggle('hidden', !isOwner);
            const searchResults = document.getElementById('community-user-search-results');
            if (searchResults) searchResults.innerHTML = '';
            const searchInput = document.getElementById('community-user-search-input');
            if (searchInput) searchInput.value = '';

            await renderCommunitySessions(id);
        } catch (err) {
            console.error('載入社群詳情失敗:', err);
            alert(i18n('community.loadFailed'));
        }
    }

    async function renderCommunityInvitesBanner() {
        const banner = document.getElementById('community-invites-banner');
        if (!banner) return;
        if (!isSignedIn() || typeof window.dbListMyCommunityInvites !== 'function') {
            banner.classList.add('hidden');
            banner.innerHTML = '';
            return;
        }

        try {
            const invites = await window.dbListMyCommunityInvites();
            if (!invites.length) {
                banner.classList.add('hidden');
                banner.innerHTML = '';
                return;
            }

            banner.classList.remove('hidden');
            banner.innerHTML = invites.map(invite => `
                <div class="community-invite-card" data-community-id="${escapeHtml(invite.communityId || invite.id)}">
                    <p class="community-invite-card__text">${escapeHtml(i18n('directory.inviteReceived', {
                        name: invite.communityName || '',
                        from: invite.invitedByName || ''
                    }))}</p>
                    <div class="community-invite-card__actions">
                        <button type="button" class="community-invite-card__accept" data-action="accept">${escapeHtml(i18n('directory.acceptInvite'))}</button>
                        <button type="button" class="community-invite-card__decline" data-action="decline">${escapeHtml(i18n('directory.declineInvite'))}</button>
                    </div>
                </div>
            `).join('');

            banner.querySelectorAll('.community-invite-card').forEach(card => {
                const communityId = card.getAttribute('data-community-id');
                card.querySelector('[data-action="accept"]')?.addEventListener('click', () => acceptCommunityInvite(communityId));
                card.querySelector('[data-action="decline"]')?.addEventListener('click', () => declineCommunityInvite(communityId));
            });
        } catch (err) {
            console.error('載入社群邀請失敗:', err);
            banner.classList.add('hidden');
        }
    }

    async function acceptCommunityInvite(communityId) {
        try {
            const result = await window.dbAcceptCommunityInvite(communityId);
            await refreshMyCommunities();
            await renderCommunityInvitesBanner();
            alert(i18n('directory.inviteAccepted', { name: result?.name || '' }));
            await openCommunityDetail(communityId);
        } catch (err) {
            console.error('接受邀請失敗:', err);
            alert(err?.message || i18n('directory.inviteAcceptFailed'));
        }
    }

    async function declineCommunityInvite(communityId) {
        try {
            await window.dbDeclineCommunityInvite(communityId);
            await renderCommunityInvitesBanner();
        } catch (err) {
            console.error('拒絕邀請失敗:', err);
            alert(err?.message || i18n('directory.inviteDeclineFailed'));
        }
    }

    function renderSearchResultRow(user, status = 'invite') {
        const initial = (user.displayName || '?').trim().charAt(0) || '?';
        const avatar = user.photoURL
            ? `<img src="${escapeHtml(user.photoURL)}" alt="" class="community-search-avatar">`
            : `<span class="community-search-avatar community-search-avatar--initial">${escapeHtml(initial)}</span>`;

        let actionHtml;
        if (status === 'member') {
            actionHtml = `<span class="community-search-status community-search-status--member">${escapeHtml(i18n('directory.alreadyMemberShort'))}</span>`;
        } else if (status === 'invited') {
            actionHtml = `<span class="community-search-status community-search-status--invited">${escapeHtml(i18n('directory.alreadyInvited'))}</span>`;
        } else {
            actionHtml = `<button type="button" class="community-search-invite-btn" data-target-uid="${escapeHtml(user.id)}">${escapeHtml(i18n('directory.sendInvite'))}</button>`;
        }

        return `
            <div class="community-search-result" role="listitem">
                ${avatar}
                <span class="community-search-result__name">${escapeHtml(user.displayName || i18n('community.unknownMember'))}</span>
                ${actionHtml}
            </div>
        `;
    }

    function bindSearchResultInviteButtons(container) {
        container?.querySelectorAll('.community-search-invite-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                sendCommunityInvite(btn.getAttribute('data-target-uid'), btn);
            });
        });
    }

    async function searchUsersForCommunityInvite() {
        const input = document.getElementById('community-user-search-input');
        const resultsEl = document.getElementById('community-user-search-results');
        if (!input || !resultsEl || !activeCommunityId) return;

        const queryText = input.value.trim();
        if (queryText.length < 2) {
            alert(i18n('directory.searchMin'));
            return;
        }

        const bridgeReady = await waitForDbBridge();
        if (!bridgeReady || typeof window.dbSearchUserDirectory !== 'function') {
            alert(i18n('community.dbOffline'));
            return;
        }

        const searchBtn = document.getElementById('community-user-search-btn');
        const originalBtnText = searchBtn?.textContent;
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.textContent = i18n('directory.searching');
        }
        resultsEl.innerHTML = `<p class="community-search-loading">${escapeHtml(i18n('directory.searchLoading'))}</p>`;

        try {
            const results = await window.dbSearchUserDirectory(queryText);
            const memberUids = getCommunityMemberUidSet();
            const sentUids = loadSentInviteUids(activeCommunityId);
            const visible = results.filter(user => {
                const uid = String(user?.id || '').trim();
                return uid && uid !== window.firebaseAuthUid;
            });

            if (!visible.length) {
                resultsEl.innerHTML = `<p class="community-search-empty">${escapeHtml(i18n('directory.searchEmpty'))}</p>`;
                return;
            }

            resultsEl.innerHTML = visible.map(user => renderSearchResultRow(
                user,
                getSearchResultStatus(user, memberUids, sentUids)
            )).join('');
            bindSearchResultInviteButtons(resultsEl);
        } catch (err) {
            console.error('搜尋波友失敗:', err);
            resultsEl.innerHTML = '';
            alert(i18n('directory.searchFailed'));
        } finally {
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.textContent = originalBtnText || i18n('directory.searchBtn');
            }
        }
    }

    async function sendCommunityInvite(targetUid, btn) {
        if (!activeCommunityId || !targetUid) return;
        const originalText = btn?.textContent;
        if (btn) {
            btn.disabled = true;
            btn.textContent = i18n('directory.inviting');
        }
        try {
            await window.dbSendCommunityInvite(activeCommunityId, targetUid);
            rememberSentInvite(activeCommunityId, targetUid);
            if (btn) {
                const row = btn.closest('.community-search-result');
                if (row) {
                    const span = document.createElement('span');
                    span.className = 'community-search-status community-search-status--invited';
                    span.textContent = i18n('directory.alreadyInvited');
                    btn.replaceWith(span);
                } else {
                    btn.textContent = i18n('directory.inviteSentShort');
                }
            }
        } catch (err) {
            console.error('發送邀請失敗:', err);
            let message = i18n('directory.inviteSendFailed');
            if (err?.code === 'community-invite/already-member') message = i18n('directory.inviteAlreadyMember');
            else if (err?.code === 'community-invite/not-searchable') message = i18n('directory.inviteNotSearchable');
            alert(message);
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText || i18n('directory.sendInvite');
            }
        }
    }

    async function refreshMyCommunities() {
        if (!isSignedIn()) {
            myCommunities = [];
            renderCommunityList();
            await renderCommunityInvitesBanner();
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
        await renderCommunityInvitesBanner();
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
            let message = i18n('community.leaveFailed');
            if (err?.code === 'community/owner-cannot-leave') {
                message = i18n('community.ownerCannotLeave');
            }
            alert(err?.message || message);
        }
    }

    async function handleKickCommunityMember(targetUid, displayName) {
        if (!activeCommunityId || !targetUid) return;
        const name = String(displayName || '').trim() || i18n('community.unknownMember');
        if (!confirm(i18n('community.kickConfirm', { name }))) return;

        const bridgeReady = await waitForDbBridge();
        if (!bridgeReady || typeof window.dbKickCommunityMember !== 'function') {
            alert(i18n('community.dbOffline'));
            return;
        }

        try {
            await window.dbKickCommunityMember(activeCommunityId, targetUid);
            await openCommunityDetail(activeCommunityId);
            alert(i18n('community.kicked', { name }));
        } catch (err) {
            console.error('移除成員失敗:', err);
            let message = i18n('community.kickFailed');
            if (err?.code === 'community/not-owner') message = i18n('community.kickNotOwner');
            else if (err?.code === 'community/cannot-kick-owner') message = i18n('community.kickCannotOwner');
            else if (err?.code === 'community/not-member') message = i18n('community.kickNotMember');
            alert(err?.message || message);
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
        document.getElementById('community-user-search-btn')?.addEventListener('click', searchUsersForCommunityInvite);
        document.getElementById('community-user-search-input')?.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchUsersForCommunityInvite();
            }
        });

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
    window.openCommunityDetail = openCommunityDetail;
    window.refreshCommunitySessionsIfVisible = async function refreshCommunitySessionsIfVisible() {
        if (activeCommunityId) {
            await renderCommunitySessions(activeCommunityId);
        }
    };
})();
