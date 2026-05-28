/**
 * matches.js — 球場數據、渲染、付款防飛機、接龍後備、發佈表單
 * 依賴 app.js 提供的日期工具、地區常數、滾筒底層與 getCurrentUserName。
 */

// 預設模擬數據 (包含評分與 2+2)
        let defaultMatches = [
            { id: 1, region: "觀塘區", venue: "藍田體育館", playDate: todayISO, courts: 2, hours: 2, fee: 50, hostRating: "4.9", contact: "阿明 91234567", joined: false, maxSlots: 6, currentPlayers: 5, waitingList: [], fpsId: "91234567", paymeLink: "payme.hsbc/阿明_港羽聯", paymentStatus: null, userStatus: 'none', applicantName: null, skillLevel: "中級 (擊球穩定/懂雙打跑位)" },
            { id: 2, region: "沙田區", venue: "源禾路體育館", playDate: tomorrowISO, courts: 1, hours: 2, fee: 45, hostRating: "4.7", contact: "Chris 61234567", joined: false, maxSlots: 6, currentPlayers: 5, waitingList: [], fpsId: "61234567", paymeLink: "payme.hsbc/Chris_港羽聯", paymentStatus: null, userStatus: 'none', applicantName: null, skillLevel: "初中級 (有來回球/開始懂走位)" }
        ];

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
            if (!skillLevel || skillLevel === '不限水平') return '不限水平';
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

        let matches = JSON.parse(localStorage.getItem('uber_badminton_matches')) || defaultMatches;

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
                if (typeof m.currentPlayers !== 'number' || Number.isNaN(m.currentPlayers)) m.currentPlayers = 5;
                if (!Array.isArray(m.waitingList)) m.waitingList = [];
                if (m.paymentStatus === undefined) m.paymentStatus = null;
                if (!m.fpsId) {
                    const phone = (m.contact || '').match(/\d{8}/);
                    m.fpsId = phone ? phone[0] : '91234567';
                }
                if (!m.paymeLink) m.paymeLink = 'payme.hsbc/港羽聯_demo';

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

                if (m.maxSlots < 1) m.maxSlots = 1;
                if (m.currentPlayers < 0) m.currentPlayers = 0;
                if (m.currentPlayers > m.maxSlots) m.currentPlayers = m.maxSlots;
            });
        }

        function saveMatches() {
            localStorage.setItem('uber_badminton_matches', JSON.stringify(matches));
        }

        let homeSelectedDate = todayISO;
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
        let pendingPaymentMatchId = null;

        function getHostPaymentInfo(match) {
            const phone = (match.contact || '').match(/\d{8}/);
            return {
                fpsId: match.fpsId || (phone ? phone[0] : '91234567'),
                paymeLink: match.paymeLink || 'payme.hsbc/港羽聯_demo'
            };
        }

        function getMatchDatesSet() {
            return new Set(matches.map(m => m.playDate).filter(Boolean));
        }

        function isPastDate(iso) {
            return iso < todayISO;
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
            if (mode === 'home' && !iso) return '📅 全部日期';
            const display = formatDateDisplay(iso);
            if (iso === todayISO) return `📅 ${display}（今日）`;
            return `📅 ${display}`;
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

        function renderCalendar(mode) {
            const isHome = mode === 'home';
            const year = isHome ? homeCalendarYear : formCalendarYear;
            const month = isHome ? homeCalendarMonth : formCalendarMonth;
            const selected = isHome ? homeSelectedDate : formSelectedDate;
            const grid = document.getElementById(isHome ? 'home-calendar-grid' : 'form-calendar-grid');
            const title = document.getElementById(isHome ? 'home-calendar-title' : 'form-calendar-title');
            const matchDates = getMatchDatesSet();

            title.textContent = `${year}年${month + 1}月`;

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

        function buildFormPickerItems(mode) {
            if (mode === 'region') {
                return HONG_KONG_18_DISTRICTS.map(d => ({ val: d, label: d }));
            }
            if (mode === 'venue') {
                const venues = VENUES_BY_DISTRICT[formSelectedRegion] || [];
                return [
                    ...venues.map(v => ({ val: v, label: v })),
                    { val: PRIVATE_VENUE_VALUE, label: PRIVATE_VENUE_LABEL }
                ];
            }
            return SHUTTLE_BRANDS.map(b => ({ val: b, label: b }));
        }

        function renderFormPickerScroller(mode, scrollTo) {
            const scroller = document.getElementById('form-picker-scroller');
            const items = buildFormPickerItems(mode);
            scroller.innerHTML = items.map(({ val, label }) =>
                `<div class="form-wheel-item snap-center flex h-10 items-center justify-center px-3 text-sm font-medium text-gray-400" data-val="${val}">${label}</div>`
            ).join('');

            const initial = scrollTo || items[0]?.val;
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
                venueText.textContent = '請先選擇分區';
                venueInput.value = '';
                formSelectedVenue = '';
                handleVenueSelectionChange();
            } else if (!formSelectedVenue) {
                venueText.textContent = '請滾動選擇體育館';
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

        function resetPublishForm() {
            formSelectedRegion = '';
            formSelectedVenue = '';
            formSelectedBrand = '';
            document.getElementById('form-region').value = '';
            document.getElementById('form-venue').value = '';
            document.getElementById('form-brand').value = '';
            const maxSlotsInput = document.getElementById('form-maxslots');
            if (maxSlotsInput) maxSlotsInput.value = '6';
            const currentPlayersInput = document.getElementById('form-current-players');
            if (currentPlayersInput) currentPlayersInput.value = '1';
            const skillLevelInput = document.getElementById('form-skill-level');
            if (skillLevelInput) skillLevelInput.value = DEFAULT_SKILL_LEVEL;
            document.getElementById('form-region-text').textContent = '請滾動選擇分區';
            document.getElementById('form-venue-text').textContent = '請先選擇分區';
            document.getElementById('form-brand-text').textContent = '請滾動選擇品牌';
            document.getElementById('form-venue-note').value = '';
            document.getElementById('form-shuttle-model').value = '';
            formSelectedDate = todayISO;
            formCalendarExpanded = false;
            document.getElementById('form-play-date').value = todayISO;
            const n = new Date();
            formCalendarYear = n.getFullYear();
            formCalendarMonth = n.getMonth();
            updateCalendarExpandUI('form');
            renderCalendar('form');
            updateVenueFieldState();
        }

        function openFormPicker(mode) {
            if (mode === 'venue' && !formSelectedRegion) {
                alert('請先選擇香港具體分區');
                return;
            }

            formPickerMode = mode;
            const titles = { region: '選擇分區', venue: '選擇體育館', brand: '選擇羽毛球品牌' };
            document.getElementById('form-picker-title').textContent = titles[mode];

            const scrollTo = mode === 'region'
                ? (formSelectedRegion || HONG_KONG_18_DISTRICTS[0])
                : mode === 'venue'
                    ? (formSelectedVenue || (VENUES_BY_DISTRICT[formSelectedRegion] || [])[0])
                    : (formSelectedBrand || SHUTTLE_BRANDS[0]);

            renderFormPickerScroller(mode, scrollTo);
            toggleFormPicker(true);
        }

        function toggleFormPicker(show) {
            document.getElementById('form-picker').classList.toggle('hidden', !show);
            const scroller = document.getElementById('form-picker-scroller');

            if (show) {
                if (!formPickerScrollListenerAttached) {
                    scroller.addEventListener('scroll', () => updateWheelHighlight('form-picker-scroller', 'form-wheel-item'), { passive: true });
                    formPickerScrollListenerAttached = true;
                }
            }
        }

        function confirmFormPicker() {
            const selected = getWheelSelection('form-picker-scroller', 'form-wheel-item', '');

            if (formPickerMode === 'region') {
                if (selected !== formSelectedRegion) {
                    formSelectedRegion = selected;
                    document.getElementById('form-region').value = selected;
                    document.getElementById('form-region-text').textContent = selected;
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
            }

            toggleFormPicker(false);
        }

        // 渲染搵波打列表
        function renderMatches() {
            const listContainer = document.getElementById('matches-list');
            listContainer.innerHTML = '';
            let filtered = currentFilter === 'all' ? matches : matches.filter(m => m.region === currentFilter);
            if (homeSelectedDate) {
                filtered = filtered.filter(m => m.playDate === homeSelectedDate);
            }

            if(filtered.length === 0) {
                const emptyMsg = homeSelectedDate
                    ? `${formatDateDisplay(homeSelectedDate)} 暫時沒有開場。`
                    : '該區域暫時沒有開場。';
                listContainer.innerHTML = `<div class="text-center py-12 text-gray-400 text-xs">${emptyMsg}</div>`;
                return;
            }

            filtered.forEach(match => {
                const card = document.createElement('div');
                card.className = "bg-gray-50 rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between relative";
                const maxSlots = Number(match.maxSlots ?? 6);
                const currentPlayers = Number(match.currentPlayers ?? 0);
                const waitingList = Array.isArray(match.waitingList) ? match.waitingList : [];
                const isFull = currentPlayers >= maxSlots;
                const currentUserName = getCurrentUserName();
                const isWaiting = waitingList.includes(currentUserName);
                const skillLevel = match.skillLevel || '不限水平';
                const skillShort = getSkillLevelShortLabel(skillLevel);
                const skillBadgeClass = getSkillLevelBadgeClass(skillLevel);
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div class="flex flex-wrap items-center gap-1.5">
                                <span class="bg-gray-200 text-gray-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold">${match.region}</span>
                                <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold ${skillBadgeClass}" title="${skillLevel}">🏸 ${skillShort}</span>
                            </div>
                            ${match.playDate ? `<p class="text-[10px] text-emerald-600 font-bold mt-1.5">📅 ${formatDateDisplay(match.playDate)}</p>` : ''}
                            <h4 class="text-base font-bold text-gray-900 mt-1">${match.venue}</h4>
                        </div>
                        <div class="text-right">
                            <span class="text-sm font-extrabold text-gray-900">HK$ ${match.fee}</span>
                            <p class="text-[10px] text-amber-500 font-bold mt-1">⭐ ${match.hostRating}</p>
                        </div>
                    </div>
                    
                    <!-- 2+2 靈魂術語顯示 -->
                    <div class="my-3 bg-white border border-gray-100 rounded-xl p-3 flex justify-around text-center shadow-2xs">
                        <div>
                            <p class="text-[10px] text-gray-400">規格</p>
                            <p class="text-sm font-extrabold text-black mt-0.5">${match.courts} + ${match.hours}</p>
                        </div>
                        <div class="w-px bg-gray-100"></div>
                        <div>
                            <p class="text-[10px] text-gray-400">詳情</p>
                            <p class="text-[11px] font-medium text-gray-600 mt-0.5">${match.courts}個場 / ${match.hours}小時</p>
                        </div>
                    </div>

                    ${match.shuttleBrand ? `<p class="text-[11px] text-gray-500 mb-2">🏸 用球：${match.shuttleBrand} ${match.shuttleModel || ''}</p>` : ''}
                    <p class="text-[11px] text-gray-400 mb-2">📞 聯絡場主：${match.contact}</p>
                    <p class="text-[11px] ${isFull ? 'text-gray-600' : 'text-gray-500'} font-bold mb-3">
                        名額：${isFull ? '已爆滿 ' : ''}${currentPlayers}/${maxSlots} 人
                    </p>

                    <div class="flex gap-2 flex-wrap">
                        <button
                            onclick="bookMatch(${match.id}, this)"
                            class="flex-1 min-w-[140px] ${(match.joined || match.userStatus === 'pending' || match.userStatus === 'verified') ? 'bg-gray-200 text-gray-400' : 'bg-black text-white'} font-bold py-2.5 rounded-xl text-xs transition shadow-sm"
                            ${(match.joined || match.userStatus === 'pending' || match.userStatus === 'verified') ? 'disabled' : ''}
                        >
                            ${
                                match.userStatus === 'pending'
                                    ? '✓ 已提交付款，等待場主核實'
                                    : match.userStatus === 'verified' || (match.joined && match.userStatus !== 'pending')
                                    ? '✓ 已預留學位'
                                    : isFull
                                        ? (isWaiting ? '✓ 已加入後備名單' : '加入後備名單 (Waiting List)')
                                        : '確認留位'
                            }
                        </button>
                        ${(match.joined || match.userStatus === 'pending' || match.userStatus === 'verified') ? `<button onclick="cancelBooking(${match.id})" class="bg-gray-200 text-gray-700 font-bold px-3 py-2.5 rounded-xl text-xs shadow-sm">臨時取消</button>` : ''}
                        ${match.userStatus === 'verified' ? `<button onclick="rateHost(${match.id})" class="bg-amber-500 text-white font-bold px-3 py-2.5 rounded-xl text-xs shadow-sm min-w-[90px]">⭐ 評分</button>` : ''}
                    </div>
                `;
                listContainer.appendChild(card);
            });
            saveMatches();
            renderCalendar('home');
        }

        // 預留位置功能 (帶有流暢動畫效果)
        function bookMatch(id, btn) {
            const match = matches.find(m => m.id === id);
            if (!match || match.joined || match.userStatus === 'pending' || match.userStatus === 'verified') return;

            const currentUserName = getCurrentUserName();
            const maxSlots = Number(match.maxSlots ?? 6);
            match.currentPlayers = Number(match.currentPlayers ?? 0);
            if (!Array.isArray(match.waitingList)) match.waitingList = [];

            const isFull = match.currentPlayers >= maxSlots;

            if (!isFull) {
                openPaymentPanel(id);
                return;
            }

            // 已滿額：加入後備名單
            if (match.waitingList.includes(currentUserName)) {
                alert('你已經加入後備名單（Waiting List）。');
                renderMatches();
                return;
            }
            match.waitingList.push(currentUserName);
            alert('已加入後備名單（Waiting List）！');
            renderMatches();
        }

        function togglePaymentSheet(show) {
            document.getElementById('payment-sheet').classList.toggle('hidden', !show);
            if (!show) {
                pendingPaymentMatchId = null;
                const fileInput = document.getElementById('payment-screenshot');
                fileInput.value = '';
                document.getElementById('payment-file-name').textContent = '';
            }
        }

        function openPaymentPanel(matchId) {
            const match = matches.find(m => m.id === matchId);
            if (!match || match.joined || match.userStatus === 'pending' || match.userStatus === 'verified') return;

            pendingPaymentMatchId = matchId;
            const payment = getHostPaymentInfo(match);

            document.getElementById('payment-venue-label').textContent = `${match.venue} · ${match.region}`;
            document.getElementById('payment-fee').textContent = `HK$ ${match.fee}`;
            document.getElementById('payment-fps').textContent = payment.fpsId;
            document.getElementById('payment-payme').textContent = payment.paymeLink;

            const fileInput = document.getElementById('payment-screenshot');
            fileInput.value = '';
            document.getElementById('payment-file-name').textContent = '';

            togglePaymentSheet(true);
        }

        function onPaymentScreenshotChange(event) {
            const file = event.target.files && event.target.files[0];
            const label = document.getElementById('payment-file-name');
            label.textContent = file ? `已選擇：${file.name}` : '';
        }

        function submitPaymentProof() {
            if (!pendingPaymentMatchId) return;

            const match = matches.find(m => m.id === pendingPaymentMatchId);
            const fileInput = document.getElementById('payment-screenshot');
            const file = fileInput.files && fileInput.files[0];

            if (!match) {
                togglePaymentSheet(false);
                return;
            }
            if (!file) {
                alert('請上傳 FPS 或 PayMe 付款截圖');
                return;
            }

            const currentUserName = getCurrentUserName();
            if (!Array.isArray(match.waitingList)) match.waitingList = [];
            match.waitingList = match.waitingList.filter(n => n !== currentUserName);

            match.joined = true;
            match.userStatus = 'pending';
            match.paymentStatus = 'pending_verification';
            match.paymentProofName = file.name;
            match.applicantName = currentUserName;

            const reader = new FileReader();
            reader.onload = () => {
                match.paymentProofDataUrl = reader.result;
                saveMatches();
                togglePaymentSheet(false);
                renderMatches();
                alert('已提交付款截圖，等待場主核實放位。');
            };
            reader.onerror = () => {
                match.paymentProofDataUrl = null;
                saveMatches();
                togglePaymentSheet(false);
                renderMatches();
                alert('已提交付款截圖，等待場主核實放位。');
            };
            reader.readAsDataURL(file);
        }

        // 臨時取消：如有後備，自動遞補第一位
        function cancelBooking(id) {
            const match = matches.find(m => m.id === id);
            if (!match) return;
            if (!match.joined && match.userStatus !== 'pending' && match.userStatus !== 'verified') return;

            const wasVerified = match.userStatus === 'verified';
            match.joined = false;
            match.userStatus = 'none';
            match.paymentStatus = null;
            match.paymentProofName = null;
            match.paymentProofDataUrl = null;
            match.applicantName = null;

            if (wasVerified) {
                match.currentPlayers = Math.max(0, Number(match.currentPlayers ?? 0) - 1);
            }

            if (wasVerified && Array.isArray(match.waitingList) && match.waitingList.length > 0) {
                match.waitingList.shift();
                match.currentPlayers = Math.min(Number(match.maxSlots ?? 6), match.currentPlayers + 1);
                alert('波友取消了！系統已自動將後備名單的第一位波友補上正選！');
            } else {
                alert('已取消留位。');
            }

            saveMatches();
            renderMatches();
        }

        function renderAdminPanel() {
            const list = document.getElementById('admin-pending-list');
            if (!list) return;
            list.innerHTML = '';

            const pending = matches.filter(m => m.userStatus === 'pending');
            if (pending.length === 0) {
                list.innerHTML = '<div class="text-center py-10 text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl">暫無待審核的付款申請</div>';
                return;
            }

            pending.forEach(match => {
                const card = document.createElement('div');
                card.className = 'bg-white border border-gray-200 rounded-2xl p-4 shadow-sm';
                const applicant = match.applicantName || getCurrentUserName();
                card.innerHTML = `
                    <div class="flex justify-between items-start gap-2 mb-3">
                        <div>
                            <p class="text-[10px] text-gray-400 font-medium">波友</p>
                            <p class="text-sm font-extrabold text-gray-900">${applicant}</p>
                            <p class="text-xs text-gray-600 mt-1">${match.venue} · ${match.region}</p>
                        </div>
                        <p class="text-sm font-extrabold text-gray-900 shrink-0">HK$ ${match.fee}</p>
                    </div>
                    <button type="button" onclick="viewPaymentScreenshot(${match.id})" class="w-full mb-3 bg-gray-100 text-gray-700 text-xs font-bold py-2.5 rounded-xl border border-gray-200">
                        查看截圖
                    </button>
                    <div class="flex gap-2">
                        <button type="button" onclick="adminApprovePayment(${match.id}, true)" class="flex-1 bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm">
                            ✅ 確認入數放位
                        </button>
                        <button type="button" onclick="adminApprovePayment(${match.id}, false)" class="flex-1 bg-red-50 text-red-600 border border-red-200 text-xs font-bold py-2.5 rounded-xl">
                            ❌ 拒絕申請
                        </button>
                    </div>
                `;
                list.appendChild(card);
            });
        }

        function viewPaymentScreenshot(matchId) {
            const match = matches.find(m => m.id === matchId);
            const modal = document.getElementById('screenshot-preview-modal');
            const body = document.getElementById('screenshot-preview-body');
            if (!match || !modal || !body) return;

            if (match.paymentProofDataUrl) {
                body.innerHTML = `<img src="${match.paymentProofDataUrl}" alt="付款截圖" class="max-h-64 mx-auto rounded-lg object-contain w-full" />`;
            } else if (match.paymentProofName) {
                body.innerHTML = `<p class="text-sm text-gray-700">檔案名稱：<span class="font-bold">${match.paymentProofName}</span></p><p class="text-[10px] text-gray-400 mt-2">（截圖預覽僅於本次提交後可用）</p>`;
            } else {
                body.innerHTML = '<p class="text-xs text-gray-500">尚未上傳截圖</p>';
            }
            modal.classList.remove('hidden');
        }

        function closeScreenshotPreview() {
            const modal = document.getElementById('screenshot-preview-modal');
            if (modal) modal.classList.add('hidden');
        }

        function adminApprovePayment(matchId, isApprove) {
            const match = matches.find(m => m.id === matchId);
            if (!match || match.userStatus !== 'pending') return;

            if (isApprove) {
                const maxSlots = Number(match.maxSlots ?? 6);
                match.userStatus = 'verified';
                match.paymentStatus = 'verified';
                match.joined = true;
                match.currentPlayers = Math.min(maxSlots, Number(match.currentPlayers ?? 0) + 1);
                currentUser.creditPoints = (currentUser.creditPoints ?? 105) + 5;
                saveCurrentUser();
                if (typeof updateProfileUI === 'function') updateProfileUI();
                alert(`已確認放位！${match.applicantName || '波友'} 正式佔位，信用積分 +5。`);
            } else {
                match.userStatus = 'none';
                match.paymentStatus = null;
                match.joined = false;
                match.paymentProofName = null;
                match.paymentProofDataUrl = null;
                match.applicantName = null;
                alert('已拒絕此付款申請。');
            }

            saveMatches();
            renderAdminPanel();
            renderMatches();
        }

        // 模擬五星評分制度
        function rateHost(id) {
            let stars = prompt("請為本次活動及場主評分（請輸入 1 至 5 粒星）：", "5");
            if (stars >= 1 && stars <= 5) {
                alert(`感謝你的 ${stars} 星評價！雙向評分已記錄。如有惡意缺席者，系統將自動加入黑名單。`);
            } else if (stars !== null) {
                alert("請輸入正確的 1 至 5 數字。");
            }
        }

        // 處理新場地發佈表格
        function handleFormSubmit(event) {
            event.preventDefault();

            const region = document.getElementById('form-region').value;
            const venueValue = document.getElementById('form-venue').value;
            const venueNoteInput = document.getElementById('form-venue-note');
            const shuttleModel = document.getElementById('form-shuttle-model').value.trim();
            const maxSlots = parseInt(document.getElementById('form-maxslots').value) || 6;
            const currentPlayersRaw = parseInt(document.getElementById('form-current-players').value, 10);
            const currentPlayers = Number.isNaN(currentPlayersRaw) ? 0 : Math.max(0, currentPlayersRaw);

            if (currentPlayers > maxSlots) {
                alert('現時人數不能超過總名額');
                return;
            }

            if (!region) {
                alert('請先選擇香港具體分區');
                return;
            }
            if (!venueValue) {
                alert('請選擇體育館名稱');
                return;
            }

            const isPrivateVenue = venueValue === PRIVATE_VENUE_VALUE;
            const finalVenue = isPrivateVenue ? venueNoteInput.value.trim() : venueValue;

            if (isPrivateVenue && !finalVenue) {
                alert('請填寫「備註 / 具體地點」');
                venueNoteInput.focus();
                return;
            }
            if (!document.getElementById('form-brand').value) {
                alert('請選擇羽毛球品牌');
                return;
            }
            if (!shuttleModel) {
                alert('請填寫羽毛球型號');
                return;
            }
            const playDate = document.getElementById('form-play-date').value;
            if (!playDate) {
                alert('請選擇開場日期');
                return;
            }

            const newMatch = {
                id: Date.now(),
                region,
                venue: finalVenue,
                playDate,
                courts: parseInt(document.getElementById('form-courts').value) || 1,
                hours: parseInt(document.getElementById('form-hours').value) || 2,
                fee: parseInt(document.getElementById('form-fee').value) || 50,
                hostRating: "5.0",
                contact: document.getElementById('form-contact').value,
                shuttleBrand: document.getElementById('form-brand').value,
                shuttleModel,
                skillLevel: document.getElementById('form-skill-level').value || DEFAULT_SKILL_LEVEL,
                joined: false,
                maxSlots,
                currentPlayers,
                waitingList: [],
                paymentStatus: null,
                userStatus: 'none',
                applicantName: null,
                fpsId: (() => {
                    const contact = document.getElementById('form-contact').value;
                    const phone = contact.match(/\d{8}/);
                    return phone ? phone[0] : '91234567';
                })(),
                paymeLink: (() => {
                    const contact = document.getElementById('form-contact').value.trim().split(/\s+/)[0] || '場主';
                    return `payme.hsbc/${contact}_港羽聯`;
                })()
            };
            matches.unshift(newMatch);
            toggleBottomSheet(false);
            event.target.reset();
            resetPublishForm();
            renderCalendar('home');
            renderMatches();
        }

        function toggleBottomSheet(show) {
            document.getElementById('bottom-sheet').classList.toggle('hidden', !show);
            if (show) {
                resetPublishForm();
            }
        }

        function initMatchesApp() {
            migrateMatchDates();
            migrateMatchSlots();
            saveMatches();
            initCalendars();
            resetPublishForm();
            renderMatches();
            if (typeof updateProfileUI === 'function') updateProfileUI();
        }
