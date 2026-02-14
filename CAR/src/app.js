// ==================== Data Management ====================
let vehicles = [];
let currentVehicleId = null;
let vehicleData = {};
let currentEditId = null;
let currentEditVehicleId = null;
let currentFilter = 'all';

// Get current vehicle's items
function getCurrentItems() {
    if (!currentVehicleId || !vehicleData[currentVehicleId]) {
        return [];
    }
    return vehicleData[currentVehicleId].items || [];
}

// Set current vehicle's items
function setCurrentItems(items) {
    if (!currentVehicleId) return;
    if (!vehicleData[currentVehicleId]) {
        vehicleData[currentVehicleId] = { items: [] };
    }
    vehicleData[currentVehicleId].items = items;
}

// Data migration from old format
function migrateData() {
    const oldData = localStorage.getItem('carStorageData');
    const newData = localStorage.getItem('carStorageDataV2');

    if (oldData && !newData) {
        // Migrate old data to new format
        const items = JSON.parse(oldData);
        const defaultVehicle = {
            id: 'default-vehicle',
            plateNumber: '기본 차량',
            name: '내 차',
            type: '',
            isDefault: true,
            createdAt: new Date().toISOString()
        };

        const migratedData = {
            vehicles: [defaultVehicle],
            vehicleData: {
                'default-vehicle': { items: items }
            }
        };

        localStorage.setItem('carStorageDataV2', JSON.stringify(migratedData));
        localStorage.setItem('carStorageData_backup', oldData);
        localStorage.removeItem('carStorageData');

        console.log('Data migrated from old format');
    }
}

// Load data from localStorage
function loadData() {
    migrateData();

    const saved = localStorage.getItem('carStorageDataV2');
    if (saved) {
        const data = JSON.parse(saved);
        vehicles = data.vehicles || [];
        vehicleData = data.vehicleData || {};
    }

    // If no vehicles, create default
    if (vehicles.length === 0) {
        const defaultVehicle = {
            id: 'default-vehicle',
            plateNumber: '기본 차량',
            name: '내 차',
            type: '',
            isDefault: true,
            createdAt: new Date().toISOString()
        };
        vehicles.push(defaultVehicle);
        vehicleData['default-vehicle'] = { items: [] };
    }

    // Set current vehicle to default or first
    const defaultVehicle = vehicles.find(v => v.isDefault);
    currentVehicleId = defaultVehicle ? defaultVehicle.id : vehicles[0].id;

    updateVehicleSelector();
    renderItems();
    updateStats();
    renderVehicleImage();
}

// Save data to localStorage
function saveData() {
    const data = {
        vehicles: vehicles,
        vehicleData: vehicleData
    };
    localStorage.setItem('carStorageDataV2', JSON.stringify(data));
}

// ==================== Vehicle Management ====================
function updateVehicleSelector() {
    const currentVehicle = vehicles.find(v => v.id === currentVehicleId);
    const displayName = currentVehicle ? (currentVehicle.name || currentVehicle.plateNumber) : '차량 선택';
    document.getElementById('currentVehicleName').textContent = displayName;

    renderVehicleDropdown();
}

function renderVehicleDropdown() {
    const dropdown = document.getElementById('vehicleDropdown');

    const vehicleOptions = vehicles.map(vehicle => {
        const isSelected = vehicle.id === currentVehicleId;
        const itemCount = vehicleData[vehicle.id] ? (vehicleData[vehicle.id].items || []).length : 0;
        return `
            <div class="vehicle-option ${isSelected ? 'selected' : ''}" onclick="switchVehicle('${vehicle.id}')">
                <span>🚗</span>
                <span>${vehicle.name || vehicle.plateNumber}</span>
                ${vehicle.isDefault ? '<span class="vehicle-badge">기본</span>' : ''}
                <span style="margin-left: auto; font-size: 0.85rem; color: var(--text-secondary);">${itemCount}개</span>
            </div>
        `;
    }).join('');

    // Vehicle addition is only available through Vehicle Management page
    dropdown.innerHTML = vehicleOptions;
}

function toggleVehicleDropdown() {
    const dropdown = document.getElementById('vehicleDropdown');
    dropdown.classList.toggle('active');

    // Close dropdown when clicking outside
    if (dropdown.classList.contains('active')) {
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOutside);
        }, 0);
    } else {
        document.removeEventListener('click', closeDropdownOutside);
    }
}

function closeDropdownOutside(e) {
    const vehicleDropdown = document.getElementById('vehicleDropdown');
    const vehicleSelector = document.querySelector('.vehicle-selector');
    const filterDropdown = document.getElementById('filterDropdown');
    const filterSelector = document.querySelector('.filter-selector');
    const mainMenuDropdown = document.getElementById('mainMenuDropdown');
    const menuContainer = document.querySelector('.menu-container');

    if (!vehicleSelector.contains(e.target)) {
        vehicleDropdown.classList.remove('active');
    }

    if (filterSelector && !filterSelector.contains(e.target)) {
        filterDropdown.classList.remove('active');
    }

    if (menuContainer && !menuContainer.contains(e.target)) {
        mainMenuDropdown.classList.remove('active');
    }

    if (!vehicleSelector.contains(e.target) &&
        (!filterSelector || !filterSelector.contains(e.target)) &&
        (!menuContainer || !menuContainer.contains(e.target))) {
        document.removeEventListener('click', closeDropdownOutside);
    }
}

function switchVehicle(vehicleId) {
    currentVehicleId = vehicleId;
    updateVehicleSelector();
    renderItems();
    updateStats();
    renderVehicleImage();
    toggleVehicleDropdown();
}

// ==================== Filter Management ====================
function toggleFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    dropdown.classList.toggle('active');

    if (dropdown.classList.contains('active')) {
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOutside);
        }, 0);
    }
}

function selectFilter(filterValue) {
    // Update UI
    const filterNames = {
        'all': '전체',
        'frontseat': '앞자리',
        'backseat': '뒷자리',
        'trunk': '트렁크'
    };

    document.getElementById('currentFilterName').textContent = filterNames[filterValue] || '전체';

    // Highlight selected option
    document.querySelectorAll('.filter-option').forEach(el => {
        el.classList.remove('selected');
        if (el.getAttribute('onclick').includes(`'${filterValue}'`)) {
            el.classList.add('selected');
        }
    });

    // Apply filter
    filterByLocation(filterValue === 'all' ? 'all' :
        (filterValue === 'frontseat' ? 'frontseat' :
            (filterValue === 'backseat' ? 'backseat' :
                (filterValue === 'trunk' ? 'trunk' : 'all'))));

    // Close dropdown
    document.getElementById('filterDropdown').classList.remove('active');
}

// Helper for legacy filter function interaction
function filterByLocation(location) {
    // Logic to filter items
    // Note: The original filterByLocation might process specific zones (frontseat-left). 
    // We need to ensure it handles general zones (frontseat) if that's what selectFilter passes.
    // Or update selectFilter to pass what filterByLocation expects.

    // Let's check if filterByLocation exists and what it does.
    // Assuming it sets a global filter.
    currentFilter = location;

    // Update dropdown value if function called from other sources (like clicking on car parts)
    const dropdown = document.getElementById('locationFilter');
    if (dropdown && dropdown.value !== location) {
        // If location is specific (e.g., frontseat-left), set dropdown to parent category
        if (location.startsWith('frontseat')) dropdown.value = 'frontseat';
        else if (location.startsWith('backseat')) dropdown.value = 'backseat';
        else if (location.startsWith('trunk')) dropdown.value = 'trunk';
        else dropdown.value = 'all';
    }

    renderItems();
}

function openVehicleManagement() {
    renderVehiclesList();
    document.getElementById('vehicleManagementModal').classList.add('active');
}

function closeVehicleManagement() {
    document.getElementById('vehicleManagementModal').classList.remove('active');
}

function renderVehiclesList() {
    const container = document.getElementById('vehiclesList');

    if (vehicles.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>등록된 차량이 없습니다.</p></div>';
        return;
    }

    container.innerHTML = vehicles.map(vehicle => {
        const itemCount = vehicleData[vehicle.id] ? (vehicleData[vehicle.id].items || []).length : 0;
        return `
            <div class="vehicle-card">
                <div class="vehicle-card-header">
                    <div class="vehicle-info">
                        <h4>
                            🚗 ${vehicle.plateNumber}
                            ${vehicle.isDefault ? '<span class="vehicle-badge">기본</span>' : ''}
                        </h4>
                        <div class="vehicle-meta">
                            ${vehicle.name ? `${vehicle.name}` : ''}
                            ${vehicle.type ? ` · ${vehicle.type}` : ''}
                            · ${itemCount}개 물건
                        </div>
                    </div>
                    <div class="vehicle-actions">
                        <button class="btn-small" onclick="openVehicleModal('${vehicle.id}')" title="수정">✏️</button>
                        <button class="btn-small btn-danger" onclick="deleteVehicle('${vehicle.id}')" title="삭제">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openVehicleModal(vehicleId = null) {
    const modal = document.getElementById('vehicleModal');
    const form = document.getElementById('vehicleForm');
    const title = document.getElementById('vehicleModalTitle');

    if (vehicleId) {
        // Edit mode
        currentEditVehicleId = vehicleId;
        const vehicle = vehicles.find(v => v.id === vehicleId);
        title.textContent = '차량 수정';
        document.getElementById('vehiclePlateNumber').value = vehicle.plateNumber;
        document.getElementById('vehicleName').value = vehicle.name || '';
        document.getElementById('vehicleType').value = vehicle.type || '';
        document.getElementById('vehicleIsDefault').checked = vehicle.isDefault || false;
    } else {
        // Add mode
        currentEditVehicleId = null;
        title.textContent = '차량 추가';
        form.reset();
    }

    modal.classList.add('active');
}

function closeVehicleModal() {
    document.getElementById('vehicleModal').classList.remove('active');
    currentEditVehicleId = null;
}

function saveVehicle(event) {
    event.preventDefault();

    const isDefault = document.getElementById('vehicleIsDefault').checked;

    // If setting as default, remove default from others
    if (isDefault) {
        vehicles.forEach(v => v.isDefault = false);
    }

    const vehicleData_new = {
        id: currentEditVehicleId || `vehicle-${Date.now()}`,
        plateNumber: document.getElementById('vehiclePlateNumber').value,
        name: document.getElementById('vehicleName').value,
        type: document.getElementById('vehicleType').value,
        isDefault: isDefault,
        createdAt: currentEditVehicleId ? vehicles.find(v => v.id === currentEditVehicleId).createdAt : new Date().toISOString()
    };

    let isNew = false;

    if (currentEditVehicleId) {
        // Update existing vehicle
        const index = vehicles.findIndex(v => v.id === currentEditVehicleId);
        vehicles[index] = vehicleData_new;
    } else {
        // Add new vehicle
        isNew = true;
        vehicles.push(vehicleData_new);
        vehicleData[vehicleData_new.id] = { items: [] };
    }

    saveData();
    renderVehiclesList();
    updateVehicleSelector();
    closeVehicleModal();

    // New vehicles are automatically saved to localStorage (internal program file format)
    // Users can manually export to Excel using the Export button
}

function deleteVehicle(vehicleId) {
    if (vehicles.length === 1) {
        alert('최소 1개의 차량은 필요합니다.');
        return;
    }

    const vehicle = vehicles.find(v => v.id === vehicleId);
    const itemCount = vehicleData[vehicleId] ? (vehicleData[vehicleId].items || []).length : 0;

    if (!confirm(`"${vehicle.plateNumber}" 차량과 ${itemCount}개의 물건을 삭제하시겠습니까?`)) {
        return;
    }

    vehicles = vehicles.filter(v => v.id !== vehicleId);
    delete vehicleData[vehicleId];

    // If deleted current vehicle, switch to first
    if (currentVehicleId === vehicleId) {
        currentVehicleId = vehicles[0].id;
        updateVehicleSelector();
        renderItems();
        updateStats();
    }

    saveData();
    renderVehiclesList();
}

// ==================== Modal Management ====================
function openModal(id = null) {
    const modal = document.getElementById('itemModal');
    const form = document.getElementById('itemForm');
    const title = document.getElementById('modalTitle');

    const items = getCurrentItems();

    if (id) {
        // Edit mode
        currentEditId = id;
        const item = items.find(i => i.id === id);
        title.textContent = '물건 수정';
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemCategory').value = item.category;
        document.getElementById('itemLocation').value = item.location;
        document.getElementById('itemQuantity').value = item.quantity;
        document.getElementById('itemMemo').value = item.memo || '';

        // Highlight selected location
        document.querySelectorAll('.location-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        const locationMap = {
            'backseat-left': 0,
            'backseat-right': 1,
            'trunk-left': 2,
            'trunk-center': 3,
            'trunk-right': 4
        };
        document.querySelectorAll('.location-option')[locationMap[item.location]].classList.add('selected');
    } else {
        // Add mode
        currentEditId = null;
        title.textContent = '물건 추가';
        form.reset();
        document.querySelectorAll('.location-option').forEach(opt => {
            opt.classList.remove('selected');
        });
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('itemModal').classList.remove('active');
    currentEditId = null;
}

function selectLocation(location) {
    document.getElementById('itemLocation').value = location;
    document.querySelectorAll('.location-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

// ==================== CRUD Operations ====================
function saveItem(event) {
    event.preventDefault();

    let items = getCurrentItems();

    const itemData = {
        id: currentEditId || Date.now().toString(),
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        location: document.getElementById('itemLocation').value,
        quantity: parseInt(document.getElementById('itemQuantity').value),
        memo: document.getElementById('itemMemo').value,
        createdAt: currentEditId ? items.find(i => i.id === currentEditId).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (currentEditId) {
        // Update existing item
        const index = items.findIndex(i => i.id === currentEditId);
        items[index] = itemData;
    } else {
        // Add new item
        items.push(itemData);
    }

    setCurrentItems(items);
    saveData();
    renderItems();
    updateStats();
    renderVehicleImage();
    closeModal();
}

function deleteItem(id) {
    if (confirm('이 물건을 삭제하시겠습니까?')) {
        let items = getCurrentItems();
        items = items.filter(i => i.id !== id);
        setCurrentItems(items);
        saveData();
        renderItems();
        updateStats();
        renderVehicleImage();
    }
}

// ==================== Rendering ====================
function renderItems() {
    const container = document.getElementById('itemsList');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const items = getCurrentItems();

    let filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm) ||
            (item.memo && item.memo.toLowerCase().includes(searchTerm));

        if (currentFilter === 'all') return matchesSearch;
        if (currentFilter === 'frontseat') return matchesSearch && item.location.startsWith('frontseat');
        if (currentFilter === 'backseat') return matchesSearch && item.location.startsWith('backseat');
        if (currentFilter === 'trunk') return matchesSearch && item.location.startsWith('trunk');
        return matchesSearch && item.location === currentFilter;
    });

    if (filteredItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <p>${searchTerm || currentFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 물건이 없습니다.<br>새 물건을 추가해보세요!'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredItems.map(item => createItemCard(item)).join('');

    // Highlight locations on vehicle image if search is active
    if (searchTerm) {
        highlightSearchLocations(filteredItems);
    } else {
        clearLocationHighlights();
    }
}

function updateStats() {
    const items = getCurrentItems();

    // Total items
    document.getElementById('totalItems').textContent = items.length;

    // Count by location
    const frontseatLeft = items.filter(i => i.location === 'frontseat-left').length;
    const frontseatRight = items.filter(i => i.location === 'frontseat-right').length;
    const backseatLeft = items.filter(i => i.location === 'backseat-left').length;
    const backseatRight = items.filter(i => i.location === 'backseat-right').length;
    const trunkLeft = items.filter(i => i.location === 'trunk-left').length;
    const trunkCenter = items.filter(i => i.location === 'trunk-center').length;
    const trunkRight = items.filter(i => i.location === 'trunk-right').length;

    // Update individual counts
    const updateCount = (id, count) => {
        const el = document.getElementById(id);
        if (el) el.textContent = `${count}개`;
    };

    updateCount('count-frontseat-left', frontseatLeft);
    updateCount('count-frontseat-right', frontseatRight);
    updateCount('count-backseat-left', backseatLeft);
    updateCount('count-backseat-right', backseatRight);
    updateCount('count-trunk-left', trunkLeft);
    updateCount('count-trunk-center', trunkCenter);
    updateCount('count-trunk-right', trunkRight);

    // Update area totals
    document.getElementById('frontseatCount').textContent = frontseatLeft + frontseatRight;
    document.getElementById('backseatCount').textContent = backseatLeft + backseatRight;
    document.getElementById('trunkCount').textContent = trunkLeft + trunkCenter + trunkRight;

    // Category stats
    const categories = {};
    items.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
    });

    document.getElementById('totalCategories').textContent = Object.keys(categories).length;

    const categoryIcons = {
        '공구': '🔧',
        '비상용품': '🚨',
        '레저용품': '⚽',
        '생활용품': '🏠',
        '기타': '📌'
    };

    const categoryStatsHtml = Object.entries(categories).map(([cat, count]) => `
        <div class="stat-item">
            <span class="stat-label">${categoryIcons[cat]} ${cat}</span>
            <span class="stat-value">${count}</span>
        </div>
    `).join('');

    document.getElementById('categoryStats').innerHTML = categoryStatsHtml ||
        '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">데이터 없음</div>';
}

// ==================== Filtering ====================
function filterItems() {
    renderItems();
}

// ==================== Import/Export (Excel) ====================
function exportVehicleToExcel(vehicle, items) {
    if (!vehicle) return;

    // 1. Prepare Data for Sheets
    // Vehicle Info Sheet
    const vehicleDataRows = [
        ['ID', 'PlateNumber', 'Name', 'Type', 'IsDefault', 'CreatedAt'],
        [
            vehicle.id,
            vehicle.plateNumber,
            vehicle.name || '',
            vehicle.type || '',
            vehicle.isDefault ? 'TRUE' : 'FALSE',
            vehicle.createdAt || new Date().toISOString()
        ]
    ];

    // Items Sheet
    const itemHeader = ['ID', 'VehicleID', 'Name', 'Category', 'Location', 'Quantity', 'Memo', 'CreatedAt', 'UpdatedAt'];
    const itemRows = items.map(item => [
        item.id,
        vehicle.id,
        item.name,
        item.category,
        item.location,
        item.quantity,
        item.memo || '',
        item.createdAt || '',
        item.updatedAt || ''
    ]);

    // 2. Create Workbook and Sheets
    const wb = XLSX.utils.book_new();

    const ws_vehicle = XLSX.utils.aoa_to_sheet(vehicleDataRows);
    XLSX.utils.book_append_sheet(wb, ws_vehicle, "VehicleInfo");

    const ws_items = XLSX.utils.aoa_to_sheet([itemHeader, ...itemRows]);
    XLSX.utils.book_append_sheet(wb, ws_items, "Items");

    // 3. Generate File
    const filename = `${vehicle.plateNumber}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// Wrapper for UI button
function exportData() {
    if (!currentVehicleId) {
        alert('내보낼 차량을 선택해주세요.');
        return;
    }

    const currentVehicle = vehicles.find(v => v.id === currentVehicleId);
    const items = getCurrentItems();

    if (!currentVehicle) {
        alert('차량 정보를 찾을 수 없습니다.');
        return;
    }

    exportVehicleToExcel(currentVehicle, items);
}

function importData() {
    document.getElementById('fileInput').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Check required sheets
            if (!workbook.SheetNames.includes('VehicleInfo') || !workbook.SheetNames.includes('Items')) {
                alert('올바르지 않은 엑셀 파일 형식입니다. (VehicleInfo, Items 시트 필요)');
                return;
            }

            // Parse Vehicle Info
            const vehicleSheet = workbook.Sheets['VehicleInfo'];
            const vehicleRows = XLSX.utils.sheet_to_json(vehicleSheet, { header: 1 });

            if (vehicleRows.length < 2) {
                alert('차량 정보가 없습니다.');
                return;
            }

            const header = vehicleRows[0];
            const row = vehicleRows[1];

            // Map columns
            const vIdx = {};
            header.forEach((h, i) => vIdx[h] = i);

            // Extract imported vehicle data
            const importedVehicle = {
                id: row[vIdx['ID']] || `vehicle-${Date.now()}`,
                plateNumber: row[vIdx['PlateNumber']],
                name: row[vIdx['Name']],
                type: row[vIdx['Type']],
                isDefault: String(row[vIdx['IsDefault']]).toUpperCase() === 'TRUE',
                createdAt: row[vIdx['CreatedAt']] || new Date().toISOString()
            };

            // Parse Items
            const itemsSheet = workbook.Sheets['Items'];
            const itemRows = XLSX.utils.sheet_to_json(itemsSheet, { header: 1 });
            const importedItems = [];

            if (itemRows.length > 1) {
                const iHeader = itemRows[0];
                const iIdx = {};
                iHeader.forEach((h, i) => iIdx[h] = i);

                for (let i = 1; i < itemRows.length; i++) {
                    const r = itemRows[i];
                    if (!r[iIdx['Name']]) continue; // Skip empty rows

                    importedItems.push({
                        id: r[iIdx['ID']] || Date.now().toString() + i,
                        name: r[iIdx['Name']],
                        category: r[iIdx['Category']],
                        location: r[iIdx['Location']],
                        quantity: parseInt(r[iIdx['Quantity']]) || 1,
                        memo: r[iIdx['Memo']] || '',
                        createdAt: r[iIdx['CreatedAt']] || new Date().toISOString(),
                        updatedAt: r[iIdx['UpdatedAt']] || new Date().toISOString()
                    });
                }
            }

            // Check for existing vehicle
            const existingIndex = vehicles.findIndex(v => v.plateNumber === importedVehicle.plateNumber);
            let targetVehicleId = importedVehicle.id;

            if (existingIndex >= 0) {
                if (confirm(`차량번호 '${importedVehicle.plateNumber}'가 이미 존재합니다.\n덮어쓰시겠습니까? (취소 시 새 차량으로 추가됩니다)`)) {
                    // Update existing
                    targetVehicleId = vehicles[existingIndex].id;
                    importedVehicle.id = targetVehicleId; // Keep existing ID
                    vehicles[existingIndex] = { ...vehicles[existingIndex], ...importedVehicle };
                } else {
                    // Create new with unique ID
                    importedVehicle.id = `vehicle-${Date.now()}`;
                    importedVehicle.plateNumber = `${importedVehicle.plateNumber} (Imported)`;
                    targetVehicleId = importedVehicle.id;
                    vehicles.push(importedVehicle);
                }
            } else {
                // New vehicle
                // Ensure ID uniqueness
                if (vehicles.some(v => v.id === importedVehicle.id)) {
                    importedVehicle.id = `vehicle-${Date.now()}`;
                }
                targetVehicleId = importedVehicle.id;
                vehicles.push(importedVehicle);
            }

            // Update Items
            // If overwrite, replace items? or merge? Let's replace for simplicity as per "import" usually implies state restoration
            // But user might want to merge. 
            // The prompt "Overwrite?" usually implies full replacement.
            // Let's replace items for the target vehicle.

            if (!vehicleData[targetVehicleId]) {
                vehicleData[targetVehicleId] = { items: [] };
            }

            // If we are overwriting, we should probably clear existing items or merge. 
            // Simple approach: Replace items list with imported list.
            vehicleData[targetVehicleId].items = importedItems;

            saveData();

            // Switch to imported vehicle
            if (currentVehicleId !== targetVehicleId) {
                currentVehicleId = targetVehicleId;
            }

            updateVehicleSelector();
            renderItems();
            updateStats();
            renderVehicleImage();

            alert(`'${importedVehicle.plateNumber}' 차량 데이터가 성공적으로 불러와졌습니다.`);

        } catch (error) {
            console.error(error);
            alert('파일을 처리하는 중 오류가 발생했습니다: ' + error.message);
        }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// ==================== Vehicle Image Management ====================
// Location coordinates (percentage based for SVG)
const locationCoordinates = {
    'frontseat-left': { x: 35, y: 30 },
    'frontseat-right': { x: 65, y: 30 },
    'backseat-left': { x: 35, y: 52 },
    'backseat-right': { x: 65, y: 52 },
    'trunk-left': { x: 30, y: 76 },
    'trunk-center': { x: 50, y: 76 },
    'trunk-right': { x: 70, y: 76 }
};

function triggerImageUpload() {
    document.getElementById('vehicleImageInput').click();
}

function handleVehicleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.match('image/(jpeg|jpg|png)')) {
        alert('JPG 또는 PNG 파일만 업로드 가능합니다.');
        return;
    }

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
        alert('파일 크기는 2MB 이하여야 합니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const currentVehicle = vehicles.find(v => v.id === currentVehicleId);
        if (currentVehicle) {
            currentVehicle.vehicleImage = e.target.result;
            saveData();
            renderVehicleImage();
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function renderVehicleImage() {
    // Always render markers since we have a default SVG image
    renderLocationMarkers();
}

function renderLocationMarkers() {
    const markersContainer = document.getElementById('locationMarkers');
    const items = getCurrentItems();

    // Count items per location
    const locationCounts = {};
    items.forEach(item => {
        locationCounts[item.location] = (locationCounts[item.location] || 0) + 1;
    });

    const locationNames = {
        'frontseat-left': '앞자리 운전석',
        'frontseat-right': '앞자리 조수석',
        'backseat-left': '뒷자리 좌측',
        'backseat-right': '뒷자리 우측',
        'trunk-left': '트렁크 좌측',
        'trunk-center': '트렁크 중앙',
        'trunk-right': '트렁크 우측'
    };

    // Generate markers
    const markersHtml = Object.keys(locationCoordinates).map(location => {
        const coords = locationCoordinates[location];
        const count = locationCounts[location] || 0;
        const locationItems = items.filter(item => item.location === location);

        const categoryIcons = {
            '공구': '🔧',
            '비상용품': '🚨',
            '레저용품': '⚽',
            '생활용품': '🏠',
            '기타': '📌'
        };

        const popupContent = locationItems.length > 0 ? `
            <div class="marker-popup">
                <div class="popup-title">${locationNames[location]}</div>
                <div class="popup-items">
                    ${locationItems.map(item => `
                        <div class="popup-item">
                            ${categoryIcons[item.category] || '📦'} ${item.name} ×${item.quantity}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div class="marker-popup">
                <div class="popup-title">${locationNames[location]}</div>
                <div class="popup-items">물건 없음</div>
            </div>
        `;

        return `
            <div class="location-marker" style="left: ${coords.x}%; top: ${coords.y}%;">
                <div class="marker-badge ${count === 0 ? 'empty' : ''}">${count}</div>
                ${popupContent}
            </div>
        `;
    }).join('');

    markersContainer.innerHTML = markersHtml;
}

function removeVehicleImage() {
    if (!confirm('차량 이미지를 삭제하시겠습니까?')) {
        return;
    }

    const currentVehicle = vehicles.find(v => v.id === currentVehicleId);
    if (currentVehicle) {
        delete currentVehicle.vehicleImage;
        saveData();
        renderVehicleImage();
    }
}

// ==================== Search Location Highlight ====================
function highlightSearchLocations(filteredItems) {
    // Get unique locations from filtered items
    const searchLocations = [...new Set(filteredItems.map(item => item.location))];

    // Clear previous highlights
    clearLocationHighlights();

    // Add highlight class to matching markers
    searchLocations.forEach(location => {
        const markers = document.querySelectorAll('.location-marker');
        markers.forEach(marker => {
            const markerStyle = marker.style.cssText;
            const coords = locationCoordinates[location];
            if (coords && markerStyle.includes(`left: ${coords.x}%`) && markerStyle.includes(`top: ${coords.y}%`)) {
                marker.classList.add('highlight');
                const badge = marker.querySelector('.marker-badge');
                if (badge) {
                    badge.classList.add('highlight');
                }
            }
        });
    });

    // Auto-scroll to vehicle image section if there are matches
    if (searchLocations.length > 0) {
        scrollToVehicleImage();
    }
}

function clearLocationHighlights() {
    const markers = document.querySelectorAll('.location-marker');
    markers.forEach(marker => {
        marker.classList.remove('highlight');
        const badge = marker.querySelector('.marker-badge');
        if (badge) {
            badge.classList.remove('highlight');
        }
    });
}

function scrollToVehicleImage() {
    const imageSection = document.getElementById('vehicleImageSection');

    // Always scroll to vehicle image section
    if (imageSection) {
        setTimeout(() => {
            imageSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

// ==================== Theme ====================
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update icon safely without removing text
    const btn = document.querySelector('.menu-item[onclick="toggleTheme()"]');
    if (btn) {
        const iconSpan = btn.querySelector('span');
        if (iconSpan) {
            iconSpan.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }
    }
}

// Load theme preference
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Sync icon
    const btn = document.querySelector('.menu-item[onclick="toggleTheme()"]');
    if (btn) {
        const iconSpan = btn.querySelector('span');
        if (iconSpan) {
            iconSpan.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
        }
    }
}

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', function () {
    loadTheme();
    loadData();
});

// Close modals on outside click
document.getElementById('itemModal').addEventListener('click', function (e) {
    if (e.target === this) {
        closeModal();
    }
});

document.getElementById('vehicleManagementModal').addEventListener('click', function (e) {
    if (e.target === this) {
        closeVehicleManagement();
    }
});

document.getElementById('vehicleModal').addEventListener('click', function (e) {
    if (e.target === this) {
        closeVehicleModal();
    }
});

// ==================== Menu & View Management ====================
let currentView = 'layout';

function toggleMainMenu() {
    const dropdown = document.getElementById('mainMenuDropdown');
    dropdown.classList.toggle('active');

    if (dropdown.classList.contains('active')) {
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOutside);
        }, 0);
    }
}

function switchView(viewId) {
    currentView = viewId;

    // Update View Containers
    document.querySelectorAll('.view-container').forEach(el => {
        el.classList.remove('active');
    });
    const viewEl = document.getElementById(`view-${viewId}`);
    if (viewEl) viewEl.classList.add('active');

    // Update Menu Active State
    document.querySelectorAll('.menu-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${viewId}'`)) {
            el.classList.add('active');
        }
    });

    // Specific View Logic
    if (viewId === 'category') {
        renderCategoryView();
    } else if (viewId === 'list') {
        renderItems();
    } else if (viewId === 'stats') {
        updateStats();
    } else if (viewId === 'zones') {
        updateStats();
    } else if (viewId === 'layout') {
        renderLocationMarkers();
    }

    // Close menu
    const menuDropdown = document.getElementById('mainMenuDropdown');
    if (menuDropdown) menuDropdown.classList.remove('active');
}

function navigateToZone(zone) {
    // Update Filter
    filterByLocation(zone);

    // Update Custom Dropdown UI if available
    const filterCurrentSpan = document.querySelector('.filter-current span');
    if (filterCurrentSpan) {
        const zoneNames = {
            'frontseat': '앞자리',
            'backseat': '뒷자리',
            'trunk': '트렁크'
        };
        if (zoneNames[zone]) {
            filterCurrentSpan.textContent = zoneNames[zone];
        }
    }

    // Switch to list view
    switchView('list');
}

function createItemCard(item) {
    const categoryIcons = {
        '공구': '🔧',
        '비상용품': '🚨',
        '레저용품': '⚽',
        '생활용품': '🏠',
        '기타': '📌'
    };

    const locationNames = {
        'frontseat-left': '앞자리 운전석',
        'frontseat-right': '앞자리 조수석',
        'backseat-left': '뒷자리 좌측',
        'backseat-right': '뒷자리 우측',
        'trunk-left': '트렁크 좌측',
        'trunk-center': '트렁크 중앙',
        'trunk-right': '트렁크 우측'
    };

    return `
        <div class="item-card">
            <div class="item-icon">${categoryIcons[item.category] || '📦'}</div>
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-meta">
                    <span class="item-tag">${item.category}</span>
                    <span class="item-tag">📍 ${locationNames[item.location] || item.location}</span>
                    <span class="item-tag">×${item.quantity}</span>
                </div>
                ${item.memo ? `<div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">${item.memo}</div>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn-small" onclick="openModal('${item.id}')" title="수정">✏️</button>
                <button class="btn-small btn-danger" onclick="deleteItem('${item.id}')" title="삭제">🗑️</button>
            </div>
        </div>
    `;
}

function renderCategoryView() {
    const container = document.getElementById('categoryViewContainer');
    const items = getCurrentItems();
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    // Filter by search term only (ignore location filter for category view)
    const filteredItems = items.filter(item => {
        return item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm) ||
            (item.memo && item.memo.toLowerCase().includes(searchTerm));
    });

    if (filteredItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <p>${searchTerm ? '검색 결과가 없습니다.' : '등록된 물건이 없습니다.<br>새 물건을 추가해보세요!'}</p>
            </div>`;
        return;
    }

    // Group items by category
    const categories = {};
    filteredItems.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });

    // Order: Tools, Emergency, Leisure, Daily, Other
    const categoryOrder = ['공구', '비상용품', '레저용품', '생활용품', '기타'];
    const categoryIcons = {
        '공구': '🔧',
        '비상용품': '🚨',
        '레저용품': '⚽',
        '생활용품': '🏠',
        '기타': '📌'
    };

    let html = '';

    categoryOrder.forEach(cat => {
        const catItems = categories[cat] || [];
        if (catItems.length > 0) {
            html += `
                <div class="category-group">
                    <div class="category-header">
                        <div class="category-title">
                            <span>${categoryIcons[cat]}</span> ${cat}
                            <span class="item-count" style="margin-left: var(--spacing-sm);">${catItems.length}</span>
                        </div>
                    </div>
                    <div class="items-list">
                        ${catItems.map(item => createItemCard(item)).join('')}
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html;
}

// Initialize view
// Ensure switchView is called after loadData 
const originalLoadData = loadData;
loadData = function () {
    originalLoadData();
    // switchView('layout'); // Don't reset view on reload if possible, but for simplicity let's stick to layout or keep current
    // Actually, keep current view if set
    switchView(currentView);
};
