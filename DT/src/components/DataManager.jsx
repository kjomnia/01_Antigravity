import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, Download, Search, Trash2, FileSpreadsheet, Plus, X, Filter, Image as ImageIcon } from 'lucide-react';
import { readDataFile, exportDataFile } from '../utils/excelUtils';

const DataManager = ({ type, columns, title, data, setData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [fileName, setFileName] = useState('');
    const [selectedRows, setSelectedRows] = useState(new Set());

    // 컬럼 너비 상태 관리
    const [colWidths, setColWidths] = useState({});
    const resizingRef = useRef(null);

    // 수동 추가 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({});

    const [isEditMode, setIsEditMode] = useState(false);

    const handleAddItem = () => {
        setNewItem({});
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleEditSelected = () => {
        if (selectedRows.size !== 1) return;
        const index = [...selectedRows][0];
        setNewItem({ ...data[index] });
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNewItem({});
        setIsEditMode(false);
    };

    const handleSaveItem = () => {
        if (Object.keys(newItem).length === 0) {
            alert("정보를 입력해주세요.");
            return;
        }

        if (isEditMode) {
            // 수정 모드
            const index = [...selectedRows][0];
            const newData = [...data];
            newData[index] = newItem;
            setData(newData);
        } else {
            // 추가 모드
            setData([newItem, ...data]);
        }
        handleCloseModal();
    };

    const handleInputChange = (key, value) => {
        let finalValue = value;
        // [신규] 대상 설비의 상징문자와 코드는 대문자 강제
        if (type === 'equipment' && (key === 'symbol' || key === 'code')) {
            finalValue = value.toUpperCase();
        }
        setNewItem(prev => ({ ...prev, [key]: finalValue }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        try {
            let loadedData = await readDataFile(file);

            // [신규] 대상 설비의 상징문자와 코드는 대문자 강제 (파일 업로드 시)
            if (type === 'equipment') {
                loadedData = loadedData.map(item => ({
                    ...item,
                    symbol: item.symbol ? String(item.symbol).toUpperCase() : item.symbol,
                    code: item.code ? String(item.code).toUpperCase() : item.code
                }));
            }

            // [수정] 중복 제외 후 병합 로직
            setData(prevData => {
                const existingSet = new Set(prevData.map(row => JSON.stringify(row)));

                const uniqueNewRows = loadedData.filter(newRow => {
                    // 키 순서가 다를 수 있으므로 키 정렬 후 비교하거나, 
                    // 단순하게 JSON.stringify로 비교 (데이터 구조가 단순하다고 가정)
                    // 더 정확한 비교를 위해 키들을 정렬하여 문자열 생성
                    const sortedNewRow = {};
                    Object.keys(newRow).sort().forEach(key => {
                        sortedNewRow[key] = newRow[key];
                    });

                    // 기존 데이터에서도 같은 방식으로 비교해야 함. 
                    // 성능을 위해 기존 데이터를 Set으로 만들 때 정렬해서 넣는 것이 좋음.
                    // 여기서는 간단하게 some으로 순회 비교 (데이터 양이 많지 않음)

                    const isDuplicate = prevData.some(existingRow => {
                        const keys1 = Object.keys(existingRow).filter(k => k !== '_originalIdx');
                        const keys2 = Object.keys(newRow).filter(k => k !== '_originalIdx');

                        if (keys1.length !== keys2.length) return false;

                        return keys1.every(key => existingRow[key] === newRow[key]);
                    });

                    return !isDuplicate;
                });

                if (uniqueNewRows.length < loadedData.length) {
                    alert(`총 ${loadedData.length}건 중 중복된 ${loadedData.length - uniqueNewRows.length}건을 제외하고 ${uniqueNewRows.length}건이 추가되었습니다.`);
                } else {
                    alert(`${uniqueNewRows.length}건의 데이터가 성공적으로 로드되었습니다.`);
                }

                return [...uniqueNewRows, ...prevData];
            });

            setSelectedRows(new Set()); // 파일 로드 시 선택 초기화
            e.target.value = ''; // 같은 파일 다시 선택 가능하게
        } catch (error) {
            console.error("File load error:", error);
            alert("파일을 읽는 중 오류가 발생했습니다.");
        }
    };

    const handleExport = () => {
        if (data.length === 0) {
            alert("내보낼 데이터가 없습니다.");
            return;
        }
        const exportFileName = fileName || (type === 'office' ? 'OfficeList' : 'RackModelList');
        const exportType = type === 'rack' ? 'csv' : 'xlsx';
        exportDataFile(data, exportFileName, exportType);
    };

    // 선택 기능
    const toggleSelectAll = () => {
        if (selectedRows.size === data.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(data.map((_, idx) => idx)));
        }
    };

    const toggleSelectRow = (index) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedRows(newSelected);
    };

    // 삭제 기능
    const handleDeleteSelected = () => {
        if (selectedRows.size === 0) return;
        if (!confirm(`선택한 ${selectedRows.size}개 항목을 삭제하시겠습니까?`)) return;

        const newData = data.filter((_, idx) => !selectedRows.has(idx));
        setData(newData);
        setSelectedRows(new Set());
    };

    const handleDeleteAll = () => {
        if (data.length === 0) return;
        if (!confirm("모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
        setData([]);
        setSelectedRows(new Set());
    };

    const [columnFilters, setColumnFilters] = useState({});

    // [신규] 필터 입력창 표시 상태 관리
    const [visibleFilters, setVisibleFilters] = useState(new Set());

    const toggleFilter = (key) => {
        setVisibleFilters(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    // 리사이즈 핸들러
    const startResize = (e, key) => {
        e.preventDefault();
        e.stopPropagation(); // 이벤트 전파 중단
        const currentWidth = colWidths[key] || 150;
        resizingRef.current = { key, startX: e.pageX, startWidth: currentWidth };

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // 드래그 중 텍스트 선택 방지
    };

    const handleResize = (e) => {
        if (!resizingRef.current) return;
        const { key, startX, startWidth } = resizingRef.current;
        const diff = e.pageX - startX;
        setColWidths(prev => ({
            ...prev,
            [key]: Math.max(50, startWidth + diff) // 최소 너비 50px
        }));
    };

    const stopResize = () => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    // 자동 너비 조절 (더블 클릭 시)
    const autoResize = (key, headerText) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = '14px sans-serif'; // 현재 테이블 폰트와 일치시킴

        let maxWidth = context.measureText(headerText).width + 30; // 헤더 너비 + 패딩

        // 데이터 텍스트 너비 측정 (모든 행 검사)
        data.forEach(row => {
            const text = String(row[key] || '');
            const width = context.measureText(text).width + 30; // 텍스트 너비 + 패딩
            if (width > maxWidth) maxWidth = width;
        });

        // 최대 500px 제한, 최소 80px 설정
        const finalWidth = Math.min(500, Math.max(80, maxWidth));

        setColWidths(prev => ({
            ...prev,
            [key]: finalWidth
        }));
    };

    const handleColumnFilterChange = (key, value) => {
        setColumnFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const filteredData = useMemo(() => {
        let result = data.map((row, idx) => {
            // [신규] 랙 모델인 경우 이미지 등록 여부 가상 필드 추가
            const virtualFields = {};
            if (type === 'rack') {
                virtualFields.imageStatus = row.imageFile ? "등록" : "미등록";
            }
            return { ...row, ...virtualFields, _originalIdx: idx };
        });

        // 1. Global Search
        if (searchTerm) {
            result = result.filter(row =>
                Object.values(row).some(val =>
                    String(val).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // 2. Column Search
        if (Object.keys(columnFilters).length > 0) {
            result = result.filter(row => {
                return Object.entries(columnFilters).every(([key, filterVal]) => {
                    if (!filterVal) return true;
                    // 컬럼 키가 데이터에 없으면 빈 문자열 취급
                    const cellVal = String(row[key] || '').toLowerCase();
                    return cellVal.includes(filterVal.toLowerCase());
                });
            });
        }

        return result;
    }, [data, searchTerm, columnFilters]);

    // 동적 컬럼 결정: 정의된 columns + 데이터에만 있는 추가 컬럼
    const { displayHeaders, dataKeys } = useMemo(() => {
        if (data.length === 0) return { displayHeaders: [], dataKeys: [] };

        // 1. 정의된 컬럼은 순서대로 우선 배치
        const definedKeys = columns.map(col => col.key);
        const headers = columns.map(col => col.label);
        const keys = [...definedKeys];

        // 2. 데이터의 첫 번째 행을 기준으로 정의되지 않은 키 찾기
        const firstRow = data[0];
        Object.keys(firstRow).forEach(key => {
            if (key !== '_originalIdx' && !definedKeys.includes(key)) {
                keys.push(key);
                headers.push(key);
            }
        });

        // [신규] 랙 모델인 경우 '사진' 컬럼 추가
        if (type === 'rack') {
            keys.push('imageStatus');
            headers.push('사진');
        }

        return { displayHeaders: headers, dataKeys: keys };
    }, [data, columns, type]);

    // [신규] 페이지별 필터 적용 컬럼 정의
    const filterableColumns = useMemo(() => {
        if (type === 'office') return ['teamName', 'locationType'];
        if (type === 'rack') return ['modelId', 'code', 'ru', 'height', 'width', 'depth'];
        // equipment는 제한 없음 (null이면 전체 허용)
        if (type === 'equipment') return null;
        return null;
    }, [type]);

    // [신규] 컬럼별 유니크 값 추출 (필터 자동완성용)
    const uniqueValuesByColumn = useMemo(() => {
        const values = {};
        if (data.length === 0) return values;

        dataKeys.forEach(key => {
            const uniqueSet = new Set();
            data.forEach(row => {
                if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                    let val = String(row[key]);
                    // [신규] 랙 모델 ID는 앞 6자리만 추출하여 목록 구성
                    if (type === 'rack' && key === 'modelId') {
                        if (val.length >= 6) val = val.substring(0, 6);
                    }
                    uniqueSet.add(val);
                } else if (type === 'rack' && key === 'imageStatus') {
                    // [신규] 가상 필드 처리
                    const status = row.imageFile ? "등록" : "미등록";
                    uniqueSet.add(status);
                }
            });
            values[key] = Array.from(uniqueSet).sort();
        });
        return values;
    }, [data, dataKeys, type]);

    return (
        <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-primary-700">
                    <FileSpreadsheet className="w-6 h-6" />
                    {title}
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={handleAddItem}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>직접 추가</span>
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-sm">
                        <Upload className="w-4 h-4" />
                        <span>파일 업로드</span>
                        <input
                            type="file"
                            accept=".xlsx, .xlsm, .xls, .csv"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        <span>다운로드 ({type === 'rack' ? 'CSV' : 'Excel'})</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 flex-1">
                    <Search className="w-5 h-5 text-gray-400 ml-2" />
                    <input
                        type="text"
                        placeholder="검색어를 입력하세요..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 w-full text-gray-700"
                    />
                </div>

                <div className="flex items-center gap-2 px-2 border-l border-gray-300 pl-4">
                    {selectedRows.size === 1 && (
                        <button
                            onClick={handleEditSelected}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-sm font-medium transition-colors"
                        >
                            <span className="w-4 h-4 flex items-center justify-center font-bold">✎</span>
                            수정
                        </button>
                    )}
                    {selectedRows.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            선택 삭제 ({selectedRows.size})
                        </button>
                    )}
                    {data.length > 0 && (
                        <button
                            onClick={handleDeleteAll}
                            className="text-sm text-gray-500 hover:text-red-500 underline ml-2"
                        >
                            전체 삭제
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
                {data.length > 0 ? (
                    <table className="w-full text-sm text-left text-gray-500" style={{ tableLayout: 'fixed' }}>
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 border-b border-gray-200 w-10 bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={data.length > 0 && selectedRows.size === data.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                {displayHeaders.map((header, index) => {
                                    const key = dataKeys[index];
                                    const width = colWidths[key] || 150;
                                    // [신규] 필터 적용 여부 확인
                                    const isFilterable = !filterableColumns || filterableColumns.includes(key);

                                    return (
                                        <th
                                            key={header}
                                            className="px-2 py-2 border-b border-gray-200 whitespace-nowrap relative group select-none bg-gray-100 align-top"
                                            style={{ width: `${width}px` }}
                                        >
                                            <div className="flex flex-col gap-1 w-full h-full">
                                                <div
                                                    className="relative flex items-center justify-center w-full h-6 font-bold text-center cursor-pointer select-none"
                                                    onClick={() => isFilterable && toggleFilter(key)}
                                                >
                                                    <span className="w-full px-4 truncate">{header}</span>
                                                    {isFilterable && (
                                                        <div
                                                            className="absolute right-0 top-1/2 transform -translate-y-1/2 p-1 flex items-center"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleFilter(key);
                                                            }}
                                                        >
                                                            <Filter
                                                                className={`w-3 h-3 hover:text-blue-600 transition-colors ${columnFilters[key] || visibleFilters.has(key) ? 'text-blue-600 fill-blue-100' : 'text-gray-400'}`}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                {isFilterable && visibleFilters.has(key) && (
                                                    <>
                                                        <input
                                                            type="text"
                                                            placeholder="필터..."
                                                            className="w-full px-2 py-1 text-xs font-normal border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-center animate-fadeIn"
                                                            value={columnFilters[key] || ''}
                                                            onChange={(e) => handleColumnFilterChange(key, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onMouseDown={(e) => e.stopPropagation()} // 드래그 시작 방지
                                                            list={`datalist-filter-${key}`} // [신규] datalist 연결
                                                            autoFocus
                                                        />
                                                        {/* [신규] 필터용 datalist */}
                                                        <datalist id={`datalist-filter-${key}`}>
                                                            {uniqueValuesByColumn[key]?.map((val, idx) => (
                                                                <option key={`${key}-${idx}`} value={val} />
                                                            ))}
                                                        </datalist>
                                                    </>
                                                )}
                                            </div>
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all z-20 active:bg-blue-700"
                                                style={{ backgroundColor: 'transparent' }}
                                                onMouseDown={(e) => startResize(e, key)}
                                                onDoubleClick={() => autoResize(key, header)}
                                                title="드래그하여 크기 조절, 더블클릭하여 자동 맞춤"
                                            >
                                                <div className="h-full w-[1px] bg-gray-300 mx-auto group-hover:bg-transparent transition-colors pointer-events-none" />
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row) => {
                                const originalIndex = row._originalIdx;
                                const isSelected = selectedRows.has(originalIndex);
                                return (
                                    <tr key={originalIndex} className={`border-b hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                                        <td className="px-4 py-4 w-10 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectRow(originalIndex)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        {dataKeys.map((key) => (
                                            <td key={key} className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 overflow-hidden text-ellipsis border-r border-transparent hover:border-gray-200 text-center">
                                                {row[key] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <FileSpreadsheet className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg">데이터가 없습니다.</p>
                        <p className="text-sm">파일을 업로드하여 데이터를 확인하세요.</p>
                    </div>
                )}
            </div>

            <div className="mt-2 text-right text-xs text-gray-400">
                총 {data.length}건 {filteredData.length !== data.length && `/ 검색 ${filteredData.length}건`}
            </div>

            {/* 수동 추가/수정 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">{isEditMode ? '항목 수정' : '새 항목 추가'}</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {columns.map((col) => {
                                // [신규] 특정 컬럼에 대해 자동완성(Dropdown) 데이터 준비
                                let suggestions = [];
                                if (['code', 'symbol', 'equipmentType'].includes(col.key)) {
                                    const uniqueValues = new Set();
                                    // 기본 추천값 추가
                                    if (col.key === 'code' || col.key === 'symbol') {
                                        ['T', 'Q', 'P', 'R', 'U', 'S', 'B', 'D', 'A', 'F', 'H', 'W', 'O', 'BK'].forEach(v => uniqueValues.add(v));
                                    }
                                    // 데이터에 존재하는 값 추가
                                    data.forEach(row => {
                                        if (row[col.key]) uniqueValues.add(String(row[col.key]).toUpperCase());
                                    });
                                    suggestions = Array.from(uniqueValues).sort();
                                }

                                return (
                                    <div key={col.key}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {col.label}
                                        </label>
                                        {suggestions.length > 0 ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={newItem[col.key] || ''}
                                                    onChange={(e) => handleInputChange(col.key, e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                                                    placeholder={`${col.label} 선택 또는 입력`}
                                                    list={`list-${col.key}`}
                                                />
                                                <datalist id={`list-${col.key}`}>
                                                    {suggestions.map(val => <option key={val} value={val} />)}
                                                </datalist>
                                            </>
                                        ) : (
                                            <input
                                                type="text"
                                                value={newItem[col.key] || ''}
                                                onChange={(e) => handleInputChange(col.key, e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder={`${col.label} 입력`}
                                            />
                                        )}
                                    </div>
                                );
                            })}

                            {/* [신규] 랙 모델인 경우 이미지 업로드 필드 추가 */}
                            {type === 'rack' && (
                                <ImageUploadField
                                    currentImage={newItem.imageFile}
                                    onImageChange={(filename) => setNewItem(prev => ({ ...prev, imageFile: filename }))}
                                    electronAPI={window.electronAPI}
                                />
                            )}
                        </div>


                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSaveItem}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// [신규] 이미지 업로드 컴포넌트 (랙 모델 전용)
const ImageUploadField = ({ currentImage, onImageChange, electronAPI }) => {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (currentImage && electronAPI) {
            electronAPI.readImage(currentImage).then(res => {
                if (res.success) setPreview(res.data);
            });
        }
    }, [currentImage, electronAPI]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !electronAPI) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const buffer = e.target.result;
            // 파일명 고유화 (timestamp 추가)
            const ext = file.name.split('.').pop();
            const filename = `rack_${new Date().getTime()}.${ext}`;

            try {
                const result = await electronAPI.saveImage({ filename, buffer });
                if (result.success) {
                    onImageChange(filename);
                    // alert("이미지가 저장되었습니다."); // [수정] 포커스 문제로 alert 제거
                    if (electronAPI.focusWindow) electronAPI.focusWindow(); // [수정] 강제 포커스
                } else {
                    alert("이미지 저장 실패: " + result.message);
                }
            } catch (err) {
                console.error(err);
                alert("이미지 저장 중 오류 발생");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="border p-3 rounded-lg bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">랙 모델 사진</label>
            <div className="flex gap-4 items-start">
                <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center overflow-hidden border">
                    {preview ? (
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xs text-gray-400">No Image</span>
                    )}
                </div>
                <div className="flex-1">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">※ 이미지가 즉시 저장됩니다.</p>
                </div>
            </div>
        </div>
    );
};

export default DataManager;
