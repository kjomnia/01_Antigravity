import * as XLSX from 'xlsx';

// 국사 리스트 컬럼 매핑 (Excel)
export const OFFICE_COLUMNS = [
    { key: 'teamName', label: '팀명', aliases: ['팀 명', 'Team Name', 'TeamName'] },
    { key: 'locationType', label: '설치장소구분', aliases: ['설치장소 구분', '설치 장소 구분', 'Location Type'] },
    { key: 'locationName', label: '설치장소명', aliases: ['설치장소 명', '설치 장소 명', 'Location Name'] },
    { key: 'locationId', label: '설치장소ID', aliases: ['설치장소 ID', '설치 장소 ID', 'Location ID'] },
    { key: 'barcode', label: '바코드', aliases: ['Barcode'] },
    { key: 'rackQr', label: '국사 랙ID', aliases: ['랙 ID QR코드', '랙ID QR코드', 'Rack ID QR', 'Rack QR'] },
];

// 랙 모델 컬럼 매핑 (CSV)
export const RACK_COLUMNS = [
    { key: 'modelId', label: '랙 모델 ID', aliases: ['Rack Model ID', 'Rack Model Id'] },
    { key: 'code', label: '코드', aliases: ['열1', 'Column1', 'Code'] }, // '열1'도 허용
    { key: 'modelName', label: '랙 모델 명', aliases: ['랙 모델명', 'Rack Model Name', 'Model Name'] },
    { key: 'ru', label: '랙 RU', aliases: ['Rack RU', 'RU'] },
    { key: 'height', label: '높이 (MM)', aliases: ['높이(MM)', '높이', 'Height'] },
    { key: 'width', label: '가로 (MM)', aliases: ['가로(MM)', '가로', 'Width'] },
    { key: 'depth', label: '깊이 (MM)', aliases: ['깊이(MM)', '깊이', 'Depth'] },
];

// 대상 설비 컬럼 매핑
export const EQUIPMENT_COLUMNS = [
    { key: 'equipmentType', label: '설비종류', aliases: ['설비종류', '설비 종류', 'Equipment Type'] },
    { key: 'equipmentId', label: '대상 설비', aliases: ['대상설비', '설비코드', 'Equipment ID'] },
    { key: 'symbol', label: '상징문자', aliases: ['상징문자', '상징 문자', 'Symbol'] },
    { key: 'code', label: 'CODE', aliases: ['코드', 'Code'] },
    { key: 'description', label: '비고', aliases: ['설명', 'Description', 'Note'] },
];

export const readDataFile = (file) => {
    return new Promise((resolve, reject) => {
        // 파일명으로 CSV 여부 판단
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target.result;
                // CSV: string (EUC-KR decoded), Excel: binary
                const workbook = XLSX.read(data, { type: isCSV ? 'string' : 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // 헤더 포함 전체 데이터 읽기 전, 헤더 행 위치 찾기
                const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                let headerRowIndex = 0;

                // 모든 정의된 컬럼의 라벨과 별칭을 수집하여 매칭 후보 준비
                const allColumns = [...OFFICE_COLUMNS, ...RACK_COLUMNS, ...EQUIPMENT_COLUMNS];
                const validHeaderKeywords = new Set();
                allColumns.forEach(col => {
                    validHeaderKeywords.add(col.label.replace(/\s+/g, '').toLowerCase());
                    if (col.aliases) {
                        col.aliases.forEach(a => validHeaderKeywords.add(a.replace(/\s+/g, '').toLowerCase()));
                    }
                });

                // 상위 20행까지 검사하여 헤더 행 찾기
                for (let i = 0; i < Math.min(rawData.length, 20); i++) {
                    const row = rawData[i];
                    if (!row || !Array.isArray(row)) continue;

                    let matchCount = 0;
                    row.forEach(cell => {
                        if (cell && typeof cell === 'string') {
                            const cleanCell = cell.replace(/\s+/g, '').toLowerCase();
                            if (validHeaderKeywords.has(cleanCell)) {
                                matchCount++;
                            }
                        }
                    });

                    // 유효한 헤더 키워드가 발견되면 이 행을 헤더로 간주
                    if (matchCount > 0) {
                        headerRowIndex = i;
                        break;
                    }
                }

                // 찾은 헤더 행부터 데이터 읽기
                const jsonData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: "" });

                // 데이터 정규화 및 정리

                const normalizedData = jsonData.map(row => {
                    const newRow = {};

                    // 1. 정의된 컬럼 매핑 시도
                    Object.keys(row).forEach(header => {
                        const cleanHeader = String(header).replace(/\s+/g, '').trim().toLowerCase();

                        // Label 또는 Alias와 일치하는지 확인
                        const matchedCol = allColumns.find(col => {
                            const cleanLabel = col.label.replace(/\s+/g, '').trim().toLowerCase();
                            const cleanAliases = (col.aliases || []).map(a => a.replace(/\s+/g, '').trim().toLowerCase());
                            return cleanLabel === cleanHeader || cleanAliases.includes(cleanHeader);
                        });

                        if (matchedCol) {
                            newRow[matchedCol.key] = row[header];
                        } else {
                            // 매핑되지 않은 컬럼은, 키를 그대로 사용
                            newRow[header] = row[header];
                        }
                    });

                    return newRow;
                });

                resolve(normalizedData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);

        if (isCSV) {
            // CSV 파일은 EUC-KR로 읽어서 한글 깨짐 방지
            reader.readAsText(file, 'EUC-KR');
        } else {
            // 엑셀(.xlsx 등)은 바이너리로 읽기
            reader.readAsBinaryString(file);
        }
    });
};

export const exportDataFile = (data, fileName, type = 'xlsx') => {
    // 숨김 처리된 _originalIdx 등은 제외하고 내보내기 (여기서는 간단히 그대로 내보냄)
    // 필요 시 필터링 로직 추가 가능
    const exportData = data.map(({ _originalIdx, ...rest }) => rest);

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    if (type === 'csv') {
        XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' });
    } else if (type === 'xls') {
        // [신규] .xls (Excel 97-2003) 지원
        XLSX.writeFile(workbook, `${fileName}.xls`, { bookType: 'biff8' });
    } else {
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
};
