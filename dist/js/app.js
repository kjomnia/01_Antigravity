// --- Data Management (LocalStorage) ---
const DB = {
    isAdminAuthenticated: false,
    adminPassword: '1234',
    stations: JSON.parse(localStorage.getItem('stations')) || [
        { id: 1, name: '강남 중앙 국사', loc: '서울 강남구', type: '종합국사', floor: '3층', access: '카드키', pwd: '', note: '엘리베이터 이용 가능', racks: 12 },
        { id: 2, name: '분당 제2 IDC', loc: '경기 성남시', type: '집중국사', floor: '지하 2층', access: '지문인식', pwd: '', note: '보안 요원 확인 필요', racks: 45 },
    ],
    // Rack Types (New)
    rackTypes: JSON.parse(localStorage.getItem('rackTypes')) || [
        { id: 1, name: '서버 랙 (Server Rack)' },
        { id: 2, name: '네트워크 랙 (Network Rack)' },
        { id: 3, name: '전송 랙 (Transmission Rack)' }
    ],
    // Racks (Updated with typeId)
    racks: JSON.parse(localStorage.getItem('racks')) || [
        { id: 1, name: 'Standard 42U Rack', typeId: 1, unit: 42, img: 'assets/server_rack_full.png' },
        { id: 2, name: 'Open Frame Rack', typeId: 2, unit: 42, img: 'assets/rack_icon_set.png' },
    ],
    save: () => {
        localStorage.setItem('stations', JSON.stringify(DB.stations));
        localStorage.setItem('rackTypes', JSON.stringify(DB.rackTypes));
        localStorage.setItem('racks', JSON.stringify(DB.racks));
        render();
    },
    resolveAsset: (path) => {
        if (path.includes('/') && !path.startsWith('assets')) return path;
        const filename = path.split('/').pop();
        if (path.includes('assets/')) return path;
        return 'assets/' + filename;
    },
    getTypeName: (typeId) => {
        const type = DB.rackTypes.find(t => t.id == typeId);
        return type ? type.name : '미지정';
    }
};

// --- Migration (Auto-fix for old data) ---
DB.stations.forEach(s => {
    if (!s.type && s.status) {
        // Map old status to new types roughly
        if (s.status === '정상') s.type = '종합국사';
        else if (s.status === '점검중') s.type = '집중국사';
        else if (s.status === '장애') s.type = '가입자국사';
        else s.type = '간이국사';

        delete s.status; // Remove old field
    }
});
DB.save(); // Persist changes

// --- Helper Functions ---
// Moved to DB object

function getStationBadgeClass(type) {
    switch (type) {
        case '종합국사': return 'type-comprehensive';
        case '집중국사': return 'type-concentrated';
        case '가입자국사': return 'type-subscriber';
        case '간이국사': return 'type-simple';
        default: return 'good';
    }
}

// --- Render Functions ---
function renderStationList(targetId, mode, query = '') {
    const listEl = document.getElementById(targetId);
    if (!listEl) return;

    let filtered = DB.stations;
    if (query) {
        const lowerQ = query.toLowerCase();
        filtered = filtered.filter(s => s.name.toLowerCase().includes(lowerQ) || s.loc.toLowerCase().includes(lowerQ));
    }

    listEl.innerHTML = filtered.map(s => `
        <div class="card" onclick="alert('${s.name} 상세 정보로 이동합니다.')">
            <div class="card-header">
                <span class="card-title">${s.name}</span>
                <span class="status-badge ${getStationBadgeClass(s.type)}">${s.type}</span>
            </div>
            <div class="info-row"><span>위치</span> <span>${s.loc} (${s.floor || '-'})</span></div>
            <div class="info-row"><span>설치된 랙</span> <span>${s.racks}대</span></div>
            <div class="info-row"><span>출입정보</span> <span>${s.access || '-'} ${s.pwd ? '(' + s.pwd + ')' : ''}</span></div>
            ${s.note ? `<div class="info-row" style="color:#64748b; font-size:0.8rem;">* ${s.note}</div>` : ''}
            
            ${mode === 'admin' ? `
            <div class="info-row" style="margin-top:10px; justify-content:flex-end; gap:10px;">
                <button class="btn-outline" style="width:auto; padding:5px 10px; font-size:0.8rem; border-radius:8px; border-color:#ef4444; color:#ef4444;" onclick="event.stopPropagation(); deleteStation(${s.id})">삭제</button>
            </div>
            ` : ''}
        </div>
    `).join('');
}

function render() {
    // 1. Render Home Station List (Read Only)
    renderStationList('station-list', 'home');

    // 2. Render Admin Station List (Manage)
    renderStationList('admin-station-list', 'admin');

    // 2. Render Rack Models (Admin Tab 1)
    const rackList = document.getElementById('rack-list');
    if (rackList) {
        rackList.innerHTML = DB.racks.map(r => {
            let imgSrc = r.img ? DB.resolveAsset(r.img) : '';
            return `
            <div class="card">
                 <div class="card-header">
                    <span class="card-title">${r.name}</span>
                    <span class="status-badge good">${r.unit}U</span>
                </div>
                <div class="info-row"><span>종류</span> <span style="color:var(--accent)">${DB.getTypeName(r.typeId)}</span></div>
                <div class="img-preview" style="margin-top:10px;">
                    <img src="${imgSrc}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline'">
                    <span style="display:none">이미지 없음</span>
                </div>
                <button class="btn-outline" style="width:100%; border-color:#ef4444; color:#ef4444;" onclick="deleteRack(${r.id})">모델 삭제</button>
            </div>
        `}).join('');
    }

    // 3. Render Rack Types (Admin Tab 2)
    const typeList = document.getElementById('rack-type-list');
    if (typeList) {
        typeList.innerHTML = DB.rackTypes.map(t => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:1.1rem; font-weight:600;">${t.name}</span>
                <button class="btn-outline" style="width:auto; padding:8px 12px; border-color:#ef4444; color:#ef4444;" onclick="deleteRackType(${t.id})">삭제</button>
            </div>
        `).join('');
    }
}


// --- Actions ---

function handleSearch(viewMode) {
    const inputId = viewMode === 'home' ? 'search-home' : 'search-admin';
    const targetId = viewMode === 'home' ? 'station-list' : 'admin-station-list';
    const query = document.getElementById(inputId).value;

    renderStationList(targetId, viewMode, query);
}

// Station
function saveStation() {
    try {
        const name = document.getElementById('input-station-name').value;
        const loc = document.getElementById('input-station-loc').value;
        const type = document.getElementById('input-station-type').value;
        const floor = document.getElementById('input-station-floor').value;
        const access = document.getElementById('input-station-access').value;
        const pwd = document.getElementById('input-station-pwd').value;
        const note = document.getElementById('input-station-note').value;

        if (!name) return alert('국사명을 입력하세요');

        DB.stations.push({
            id: Date.now(),
            name, loc, type, floor, access, pwd, note, racks: 0
        });
        DB.save();
        closeModal('modal-station');
    } catch (e) {
        console.error(e);
        alert('저장 중 오류가 발생했습니다: ' + e.message);
    }
}

function deleteStation(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        DB.stations = DB.stations.filter(s => s.id !== id);
        DB.save();
    }
}

// Rack Model
function saveRack() {
    const name = document.getElementById('input-rack-name').value;
    const unit = document.getElementById('input-rack-unit').value;
    const typeId = document.getElementById('input-rack-type-select').value;

    if (!name) return alert('모델명을 입력하세요');

    // 기본 랙 이미지 랜덤 할당 (데모용)
    const demoImgs = ['server_rack_full.png', 'rack_icon_set.png'];
    const randomImg = demoImgs[Math.floor(Math.random() * demoImgs.length)];

    DB.racks.push({
        id: Date.now(),
        name,
        typeId,
        unit,
        img: 'assets/' + randomImg
    });
    DB.save();
    closeModal('modal-rack');
}

function deleteRack(id) {
    if (confirm('이 모델을 삭제하시겠습니까?')) {
        DB.racks = DB.racks.filter(r => r.id !== id);
        DB.save();
    }
}

// Rack Type
function saveRackType() {
    const name = document.getElementById('input-type-name').value;
    if (!name) return alert('종류 명칭을 입력하세요');

    DB.rackTypes.push({
        id: Date.now(),
        name
    });
    DB.save();
    closeModal('modal-type');
}

function deleteRackType(id) {
    // 해당 타입을 사용 중인 랙 모델이 있는지 확인
    const inUse = DB.racks.some(r => r.typeId == id);
    if (inUse) return alert('이 종류를 사용 중인 랙 모델이 있어 삭제할 수 없습니다.');

    if (confirm('정말 삭제하시겠습니까?')) {
        DB.rackTypes = DB.rackTypes.filter(t => t.id !== id);
        DB.save();
    }
}


// --- UI Control ---
function switchPage(pageId, navEl) {
    // Auth Check for Admin
    if (pageId === 'admin') {
        if (!DB.isAdminAuthenticated) {
            const input = prompt('관리자 비밀번호를 입력하세요');
            if (input === DB.adminPassword) {
                DB.isAdminAuthenticated = true;
            } else {
                alert('비밀번호가 일치하지 않습니다.');
                return;
            }
        }
    }

    // 모든 페이지 초기화
    document.querySelectorAll('.page').forEach(el => {
        el.classList.remove('active');
        el.style.display = '';
    });

    // 대상 페이지 활성화
    const targetPage = document.getElementById('page-' + pageId);
    targetPage.classList.add('active');

    // iframe 숨김/보임 처리 (스캔 페이지가 아닐 땐 iframe 숨겨서 리소스 아끼거나, 
    // 혹은 그대로 display:none 되게 둠. 위 코드에서 display=''로 리셋했으므로 CSS에 따름)

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    navEl.classList.add('active');
}

function switchAdminTab(tabName) {
    // Reset all tabs
    ['station', 'model', 'type'].forEach(t => {
        const btn = document.getElementById('tab-' + t);
        const view = document.getElementById('admin-view-' + t);

        if (btn) {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = '#3b82f6';
        }
        if (view) view.style.display = 'none';
    });

    // Activate target tab
    const activeBtn = document.getElementById('tab-' + tabName);
    const activeView = document.getElementById('admin-view-' + tabName);

    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = '#3b82f6';
        activeBtn.style.color = 'white';
    }
    if (activeView) activeView.style.display = 'block';
}

function openAddStationModal() {
    document.getElementById('input-station-name').value = '';
    document.getElementById('input-station-loc').value = '';
    document.getElementById('input-station-floor').value = '';
    document.getElementById('input-station-access').value = '';
    document.getElementById('input-station-pwd').value = '';
    document.getElementById('input-station-note').value = '';
    document.getElementById('modal-station').classList.add('open');
}

function openAddRackModal() {
    document.getElementById('input-rack-name').value = '';
    document.getElementById('input-rack-unit').value = '';

    // Populate Type Select
    const select = document.getElementById('input-rack-type-select');
    select.innerHTML = DB.rackTypes.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    document.getElementById('modal-rack').classList.add('open');
}

function openAddTypeModal() {
    document.getElementById('input-type-name').value = '';
    document.getElementById('modal-type').classList.add('open');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
}

// --- Clock ---
setInterval(() => {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}, 1000);

// Initial Render
render();
