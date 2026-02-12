import React, { useState, useMemo } from 'react';
import { Search, Save, RotateCcw, PenTool, Database, Printer, Image as ImageIcon, X } from 'lucide-react';
import { exportDataFile } from '../utils/excelUtils';
import SearchableSelect from './SearchableSelect';
import ConfirmModal from './ConfirmModal';
import { matchKorean, convertKoreanToEnglish } from '../utils/koreanUtils';

const FieldInputManager = ({ officeData, rackData, equipmentData, inputRows, setInputRows, onReset }) => {
    console.log(`[FieldInputManager] Rendering with ${inputRows?.length} rows`);
    // [안전장치] rackData가 배열이 아닐 경우 빈 배열 처리 (렌더링 오류 방지)
    const safeRackData = Array.isArray(rackData) ? rackData : [];

    // 우측 패널: 선택된 국사
    const [selectedOffice, setSelectedOffice] = useState(null);
    const [officeSearchTerm, setOfficeSearchTerm] = useState('');

    // [신규] 랙 모델 검색 (4개 항목)
    const [rackSearchParams, setRackSearchParams] = useState({ symbol: '', h: '', w: '', d: '' });
    const [foundModelId, setFoundModelId] = useState('');
    const [foundModelImage, setFoundModelImage] = useState(null); // [신규] 발견된 모델의 이미지 파일명

    // [신규] 이미지 보기 모달 상태
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

    // 초기화 확인 모달 상태
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // 중앙 그리드: 입력 데이터 -> App.jsx에서 Props로 전달받음

    // 랙 모델 검색 핸들러
    const handleRackSearchChange = (key, value) => {
        const newParams = { ...rackSearchParams, [key]: value.toUpperCase() };
        setRackSearchParams(newParams);

        // [수정] BK 상징문자 처리: 규격 입력 없이 BLANK 반환
        if (newParams.symbol === 'BK') {
            setFoundModelId('BLANK');
            setFoundModelImage(null);
            return;
        }

        // 그 외: 4개 값이 모두 입력되었을 때 검색 수행
        if (newParams.symbol && newParams.h && newParams.w && newParams.d) {
            const { symbol, h, w, d } = newParams;

            const found = safeRackData.find(r => {
                if (!r) return false;
                const wMm = parseInt(w, 10);
                const dMm = parseInt(d, 10);
                const rW = parseInt(r.width, 10);
                const rD = parseInt(r.depth, 10);

                // 너비, 깊이 비교 (mm 그대로 비교)
                const widthMatch = (rW === wMm);
                const depthMatch = (rD === dMm);

                if (!widthMatch || !depthMatch) return false;

                // [수정] Symbol이 T 또는 TU일 경우 RU 비교
                if (['T', 'TU'].includes(symbol)) {
                    // Symbol T/TU: RU 비교
                    return String(r.ru) === String(parseInt(h, 10));
                } else {
                    // Symbol != T/TU: Height 비교 (mm 그대로 비교)
                    const hMm = parseInt(h, 10);
                    const rH = parseInt(r.height, 10);
                    return (rH === hMm);
                }
            });

            setFoundModelId(found ? found.modelId : '일치하는 모델 없음');
            setFoundModelImage(found ? found.imageFile : null); // [신규] 이미지 설정
        } else {
            setFoundModelId('');
            setFoundModelImage(null); // [신규] 이미지 초기화
        }
    };

    // 국사 검색 필터링 (초성 검색 적용)
    const filteredOffices = useMemo(() => {
        if (!officeSearchTerm.trim()) return [];
        return officeData.filter(office =>
            office && Object.values(office).some(val =>
                val && matchKorean(String(val), officeSearchTerm)
            )
        );
    }, [officeData, officeSearchTerm]);

    // [신규] 유효한 RU, 높이, 상징(Code) 목록 추출 (랙 데이터 기반 - 정적)
    // [신규] 대상 설비 상징문자 목록 추출 (equipmentData 기반)
    const { validRUs, validHeights, uniqueSymbols, uniqueHardwareSymbols } = useMemo(() => {
        const rus = new Set();
        const heights = new Set();
        const uSymbol = new Set();
        const uHardwareSymbol = new Set();

        safeRackData.forEach(r => {
            if (!r) return;
            if (r.ru) rus.add(String(r.ru));
            if (r.height) {
                const hStr = String(r.height);
                heights.add(hStr);
                // mm 단위 그대로 사용
            }
            if (r.code) {
                uSymbol.add(String(r.code).toUpperCase());
            }
        });

        // equipmentData에서 상징문자 추출
        if (Array.isArray(equipmentData)) {
            equipmentData.forEach(e => {
                if (e && e.symbol) {
                    uHardwareSymbol.add(String(e.symbol).toUpperCase());
                }
            });
        }

        // 'BK'는 기본적으로 허용 (빈 칸)
        if (!uHardwareSymbol.has('BK')) {
            uHardwareSymbol.add('BK');
        }

        uSymbol.add('BK');

        const sortStr = (a, b) => a.localeCompare(b);

        return {
            validRUs: Array.from(rus),
            validHeights: Array.from(heights),
            uniqueSymbols: Array.from(uSymbol).sort(sortStr),
            uniqueHardwareSymbols: Array.from(uHardwareSymbol).sort(sortStr)
        };
    }, [safeRackData, equipmentData]);

    // [최적화] 자동완성용 데이터 생성 (비동기 처리로 UI 블로킹 방지)
    const [filterOptions, setFilterOptions] = useState({ uniqueHs: [], uniqueWs: [], uniqueDs: [] });
    const { uniqueHs, uniqueWs, uniqueDs } = filterOptions;

    React.useEffect(() => {
        const calculateOptions = () => {
            const uH = new Set();
            const uW = new Set();
            const uD = new Set();

            const currentSymbol = rackSearchParams.symbol;
            const currentH = rackSearchParams.h;
            const currentW = rackSearchParams.w;

            // 1. Symbol에 따른 데이터 필터링
            let filteredBySymbol;

            if (currentSymbol) {
                filteredBySymbol = safeRackData.filter(r => r && String(r.code || '').toUpperCase() === currentSymbol);
                if (['T', 'TU'].includes(currentSymbol)) {
                    filteredBySymbol = filteredBySymbol.filter(r => r && r.ru);
                } else {
                    filteredBySymbol = filteredBySymbol.filter(r => r && r.height);
                }
            } else {
                filteredBySymbol = safeRackData.filter(r => r);
            }

            // 2. 필터링된 데이터 기반으로 자동완성 목록 생성
            filteredBySymbol.forEach(r => {
                if (['T', 'TU'].includes(currentSymbol)) {
                    if (r.ru) uH.add(String(r.ru));
                } else {
                    if (r.height) {
                        const hNum = parseInt(r.height, 10);
                        if (!isNaN(hNum)) uH.add(String(hNum));
                        else uH.add(String(r.height));
                    }
                }
            });

            let filteredByHeight = filteredBySymbol;
            if (currentH) {
                filteredByHeight = filteredBySymbol.filter(r => {
                    if (['T', 'TU'].includes(currentSymbol)) {
                        return String(r.ru) === currentH;
                    } else {
                        const hMm = parseInt(currentH, 10);
                        const rH = parseInt(r.height, 10);
                        return (rH === hMm);
                    }
                });
            }

            (currentH ? filteredByHeight : filteredBySymbol).forEach(r => {
                if (r.width) {
                    const wNum = parseInt(r.width, 10);
                    if (!isNaN(wNum)) uW.add(String(wNum));
                    else uW.add(String(r.width));
                }
            });

            let filteredByWidth = filteredByHeight;
            if (currentW) {
                filteredByWidth = filteredByHeight.filter(r => {
                    const wMm = parseInt(currentW, 10);
                    const rW = parseInt(r.width, 10);
                    return (rW === wMm);
                });
            }

            (currentW ? filteredByWidth : (currentH ? filteredByHeight : filteredBySymbol)).forEach(r => {
                if (r.depth) {
                    const dNum = parseInt(r.depth, 10);
                    if (!isNaN(dNum)) uD.add(String(dNum));
                    else uD.add(String(r.depth));
                }
            });

            const sortNum = (a, b) => parseInt(a, 10) - parseInt(b, 10);

            setFilterOptions({
                uniqueHs: Array.from(uH).sort(sortNum),
                uniqueWs: Array.from(uW).sort(sortNum),
                uniqueDs: Array.from(uD).sort(sortNum)
            });
        };

        // UI 렌더링을 양보하기 위해 setTimeout 사용
        const timer = setTimeout(calculateOptions, 0);
        return () => clearTimeout(timer);
    }, [safeRackData, rackSearchParams.symbol, rackSearchParams.h, rackSearchParams.w]);

    // 국사 선택 핸들러
    const handleOfficeSelect = (office) => {
        setSelectedOffice(office);
    };

    // 그리드 데이터 변경 핸들러
    const handleGridChange = (index, key, value) => {
        try {
            console.log(`[FieldInputManager] Change - idx: ${index}, key: ${key}, val: ${value}`);
            let newValue = value;

            // 구역(ZONE), 위치(행) : 영문 대문자 1자리 (한글 자동 변환)
            if (['zone', 'row'].includes(key)) {
                let val = convertKoreanToEnglish(value); // 한글 → 영문 변환
                val = val.slice(-1); // 마지막 1글자만 유지

                if (key === 'row') {
                    const currentZone = inputRows[index].zone;
                    if (currentZone === 'W') {
                        if (['T', 'R', 'L', 'B'].includes(val) || val === '') {
                            newValue = val;
                        } else {
                            console.warn("W 구역 row 제한 위반 (T,R,L,B만 가능), 하지만 입력을 허용합니다.");
                            newValue = val;
                        }
                    } else {
                        newValue = val;
                    }
                } else {
                    newValue = val;
                }
            }
            // 위치(열) : 숫자 (최대 2자리)
            else if (key === 'col') {
                newValue = value.slice(-2);
            }
            // H (높이) : Symbol에 따라 제한 (로깅으로 변경하여 입력 차단 해제)
            else if (key === 'h') {
                const val = value;
                const currentType = inputRows[index].type;

                if (currentType === 'T' && val !== '') {
                    const isValidRU = validRUs.some(ru => ru === val || ru.startsWith(val));
                    if (!isValidRU) console.warn("RU 목록에 없는 값입니다.");
                } else if (currentType && currentType !== 'T' && val !== '') {
                    const isValidHeight = validHeights.some(h => h === val || h.startsWith(val));
                    if (!isValidHeight) console.warn("높이 목록에 없는 값입니다.");
                }
                newValue = val;
            }
            // W, D : 숫자 3자리
            else if (['w', 'd'].includes(key)) {
                newValue = value.slice(0, 3);
            }
            // 대상 설비 (상징문자) : 한글 자동 변환
            else if (key === 'type') {
                newValue = convertKoreanToEnglish(value); // 한글 → 영문 변환

                // [수정] equipmentData에서 추출한 상징문자 목록 사용
                // 입력값이 비어있거나, 허용된 심볼 중 하나와 일치하거나, 허용된 심볼의 접두사인 경우만 허용
                const isValidInput = newValue === '' || uniqueHardwareSymbols.some(sym => sym === newValue || sym.startsWith(newValue));

                if (!isValidInput) {
                    console.warn("비허용 상징문자입니다:", newValue);
                    return; // 입력 무시
                }
            }
            // 랙 위치 (rackLoc) : 영문 대문자 자동 변환
            else if (key === 'rackLoc') {
                newValue = value.toUpperCase();
            }

            const newRows = [...inputRows];
            const updatedRow = { ...newRows[index], [key]: newValue };

            // 열 자동 입력 로직
            if ((key === 'zone' || key === 'row') && updatedRow.zone && updatedRow.row) {
                if (index === 0) {
                    updatedRow.col = '1';
                } else {
                    const prevRow = newRows[index - 1];
                    if (prevRow.zone && prevRow.row && prevRow.col) {
                        if (prevRow.zone === updatedRow.zone && prevRow.row === updatedRow.row) {
                            updatedRow.col = String(parseInt(prevRow.col, 10) + 1);
                        } else {
                            updatedRow.col = '1';
                        }
                    }
                }
            }

            // 랙 ID QR 자동 생성 로직
            if (
                updatedRow.zone && updatedRow.row && updatedRow.col &&
                !updatedRow.rackIdQr &&
                selectedOffice?.rackQr
            ) {
                updatedRow.rackIdQr = `${selectedOffice.rackQr}${String(index + 1).padStart(3, '0')}`;
            }

            // 랙 위치 자동 생성 로직
            if (updatedRow.zone && updatedRow.row && updatedRow.col) {
                updatedRow.rackLoc = `${updatedRow.zone}${updatedRow.row}${updatedRow.col.padStart(2, '0')}`;
                updatedRow.rackLocQr = `RL-${updatedRow.rackLoc}`;
            } else {
                updatedRow.rackLoc = '';
                updatedRow.rackLocQr = '';
            }

            // 랙 모델 QR 자동 생성 로직
            if (updatedRow.type === 'BK') {
                updatedRow.rackModelQr = 'BLANK';
            } else if (updatedRow.type && updatedRow.h && updatedRow.w && updatedRow.d) {
                const hPadded = String(updatedRow.h).padStart(2, '0');
                const wPadded = String(updatedRow.w).padStart(3, '0');
                const dPadded = String(updatedRow.d).padStart(3, '0');

                // [수정] T는 U(Unit), 그 외는 H(Height) 접미사 사용
                const suffix = updatedRow.type === 'T' ? 'U' : 'H';
                updatedRow.rackModelQr = `RM1-${updatedRow.type}${suffix}${hPadded}W${wPadded}D${dPadded}`;
            } else if (['type', 'h', 'w', 'd'].includes(key)) {
                updatedRow.rackModelQr = '';
            }

            // 행 자동 추가 로직
            if (index >= newRows.length - 1 && newRows.length < 999) {
                const rowsToAdd = Math.min(5, 999 - newRows.length);
                for (let i = 0; i < rowsToAdd; i++) {
                    newRows.push({});
                }
            }

            newRows[index] = updatedRow;
            setInputRows(newRows);
        } catch (error) {
            console.error("[FieldInputManager] handleGridChange error:", error);
        }
    };

    // 포커스 해제(Blur) 시 포맷팅 처리
    const handleBlur = (index, key) => {
        const row = inputRows[index];
        if (!row) return;

        let value = row[key];
        if (!value) return;

        let needsUpdate = false;
        let newValue = value;

        if (key === 'h') {
            const currentType = row.type;
            if (currentType === 'T') {
                newValue = value.padStart(2, '0');
            } else if (currentType) {
                // [수정] 끝자리 0 제거 로직 삭제 (10 입력 시 01 되는 문제 해결)
                // if (newValue.endsWith('0') && newValue.length > 1) {
                //    newValue = newValue.slice(0, -1);
                // }
                newValue = newValue.padStart(2, '0');
            }
            if (newValue !== value) needsUpdate = true;
        } else if (['w', 'd'].includes(key)) {
            newValue = value.padStart(3, '0');
            if (newValue !== value) needsUpdate = true;
        }

        if (needsUpdate) {
            const newRows = [...inputRows];
            newRows[index] = { ...row, [key]: newValue };
            setInputRows(newRows);
        }
    };

    // 엔터 및 화살표 키 핸들러
    const handleKeyDown = (e, index, key) => {
        const columnOrder = ['zone', 'row', 'col', 'type', 'h', 'w', 'd', 'rackIdQr', 'rackModelQr', 'rackLocQr', 'rackLoc'];
        let nextRowIndex = index;
        let nextKey = key;
        let move = false;

        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            nextRowIndex = index + 1;
            move = true;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            nextRowIndex = index - 1;
            move = true;
        } else if (e.key === 'ArrowRight') {
            const colIdx = columnOrder.indexOf(key);
            if (colIdx < columnOrder.length - 1) {
                e.preventDefault();
                nextKey = columnOrder[colIdx + 1];
                move = true;
            }
        } else if (e.key === 'ArrowLeft') {
            const colIdx = columnOrder.indexOf(key);
            if (colIdx > 0) {
                e.preventDefault();
                nextKey = columnOrder[colIdx - 1];
                move = true;
            }
        }

        if (move) {
            if (nextRowIndex === inputRows.length && inputRows.length < 999) {
                const newRows = [...inputRows, {}];
                setInputRows(newRows);
            }

            if (nextRowIndex >= 0 && nextRowIndex < 999) {
                const nextInputId = `input-${nextRowIndex}-${nextKey}`;
                setTimeout(() => {
                    const nextInput = document.getElementById(nextInputId);
                    if (nextInput) {
                        nextInput.focus();
                        nextInput.select();
                    }
                }, 50);
            }
        }
    };

    // 엑셀 다운로드
    const handleExport = () => {
        const validRows = inputRows.filter(row => Object.keys(row).length > 0);
        if (validRows.length === 0) {
            alert("저장할 데이터가 없습니다.");
            return;
        }

        const exportData = validRows.map(row => {
            let rackId = row.rackIdQr || '';
            if (rackId.startsWith('RID-')) {
                rackId = rackId.replace('RID-', '');
            }

            return {
                '랙 ID QR': row.rackIdQr,
                '랙ID': rackId,
                '랙 모델 QR': row.rackModelQr,
                '랙 위치 QR': row.rackLocQr,
                '랙 위치': row.rackLoc
            };
        });

        exportDataFile(exportData, `현장실사결과_${selectedOffice?.locationName || 'Unknown'}_${new Date().getTime()}`, 'xls');
    };

    const handlePrint = async () => {
        if (!window.electronAPI) {
            alert("이 기능은 전용 데스크톱 프로그램에서만 사용 가능합니다.");
            return;
        }

        const validRows = inputRows.filter(row => Object.keys(row).length > 0);
        if (validRows.length === 0) {
            alert("출력할 데이터가 없습니다.");
            return;
        }

        const result = await window.electronAPI.sendPrintData({
            type: 'rack',
            officeName: selectedOffice?.locationName || 'Unknown',
            rows: validRows
        });

        if (result.success) {
            alert(result.message);
            alert("출력 오류: " + result.message);
        }
    };

    const handleReset = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmReset = () => {
        setShowConfirmModal(false);

        console.log("[FieldInputManager] Reset sequence started");

        // 1. 공통 데이터 리셋
        if (typeof onReset === 'function') {
            onReset();
        } else {
            setInputRows(Array.from({ length: 20 }, () => ({})));
        }

        // 2. 로컬 상태 리셋
        setSelectedOffice(null);
        setOfficeSearchTerm('');
        setRackSearchParams({ symbol: '', h: '', w: '', d: '' });
        setFoundModelId('');
        setFoundModelImage(null);

        // 3. 첫 번째 입력 필드에 즉시 포커스
        setTimeout(() => {
            const firstInput = document.getElementById('input-0-zone');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    };

    // [신규] 이미지 모달 열기
    const handleOpenImageModal = async () => {
        if (!foundModelImage || !window.electronAPI) return;

        try {
            const result = await window.electronAPI.readImage(foundModelImage);
            if (result.success) {
                setImagePreviewUrl(result.data);
                setIsImageModalOpen(true);
            } else {
                // alert("이미지를 불러올 수 없습니다: " + result.message); // [수정] 포커스 문제로 alert 제거
                if (window.electronAPI && window.electronAPI.focusWindow) window.electronAPI.focusWindow();
            }
        } catch (err) {
            console.error(err);
            // alert("이미지 로드 중 오류가 발생했습니다."); // [수정] 포커스 문제로 alert 제거
            if (window.electronAPI && window.electronAPI.focusWindow) window.electronAPI.focusWindow();
        }
    };

    const handleCloseImageModal = () => {
        setIsImageModalOpen(false);
        setImagePreviewUrl(null);
    };

    // 랙 모델 QR 배경색 결정 함수
    const getRackModelQrBgColor = (rackModelQr) => {
        if (!rackModelQr || rackModelQr.trim() === '') return '';

        // rackData에서 일치하는 모델 찾기 (modelId와 비교)
        const found = safeRackData.find(r => r && r.modelId === rackModelQr);

        if (found) {
            return 'bg-green-100'; // 일치: 녹색
        } else {
            return 'bg-red-100'; // 불일치: 빨강
        }
    };

    // [신규] 초기 로드 및 리셋(리마운트) 시 첫 번째 칸 포커스
    React.useEffect(() => {
        setTimeout(() => {
            const firstInput = document.getElementById('input-0-zone');
            if (firstInput) {
                console.log("[FieldInputManager] Auto-focusing first input after mount/reset");
                firstInput.focus();
            }
        }, 300); // 넉넉하게 300ms 대기 (리마운트 완료 보장)
    }, []);

    return (
        <div className="flex h-full gap-4 p-4 bg-gray-100 items-stretch" style={{ minHeight: 'calc(100vh - 180px)' }}>
            {/* LEFT & CENTER: Input Area */}
            <div className="flex-1 flex flex-col gap-4">

                {/* Top: 랙 모델 조회 */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-700">랙 모델 조회:</span>

                        <div className="flex items-center gap-2">
                            <SearchableSelect
                                placeholder="상징"
                                value={rackSearchParams.symbol}
                                onChange={(val) => handleRackSearchChange('symbol', val)}
                                options={uniqueSymbols}
                                onFocus={(e) => e.target.select()}
                                className="w-20"
                            />

                            <SearchableSelect
                                placeholder={['T', 'TU'].includes(rackSearchParams.symbol) ? "RU" : "H(mm)"}
                                value={rackSearchParams.h}
                                onChange={(val) => handleRackSearchChange('h', val)}
                                options={uniqueHs}
                                onFocus={(e) => e.target.select()}
                                className="w-24"
                            />

                            <SearchableSelect
                                placeholder="W(mm)"
                                value={rackSearchParams.w}
                                onChange={(val) => handleRackSearchChange('w', val)}
                                options={uniqueWs}
                                onFocus={(e) => e.target.select()}
                                className="w-24"
                            />

                            <SearchableSelect
                                placeholder="D(mm)"
                                value={rackSearchParams.d}
                                onChange={(val) => handleRackSearchChange('d', val)}
                                options={uniqueDs}
                                onFocus={(e) => e.target.select()}
                                className="w-24"
                            />
                        </div>

                        {foundModelId && (
                            <div className={`px-4 py-1 rounded font-medium border ${foundModelId === '일치하는 모델 없음' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                {foundModelId}
                            </div>
                        )}

                        {/* [신규] 사진 보기 버튼 */}
                        {foundModelId && foundModelId !== '일치하는 모델 없음' && foundModelImage && (
                            <button
                                onClick={handleOpenImageModal}
                                className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-sm font-medium border border-indigo-200 transition-colors"
                            >
                                <ImageIcon className="w-4 h-4" /> 사진
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                            <Printer className="w-4 h-4" /> 출력
                        </button>
                        <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                            <Save className="w-4 h-4" /> 저장
                        </button>
                        <button onClick={handleReset} className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
                            <RotateCcw className="w-4 h-4" /> 초기화
                        </button>
                    </div>
                </div>

                {/* Center: Input Grid */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[700px] overflow-y-auto">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 font-bold">
                            <tr>
                                <th className="border p-2 min-w-[50px]">구역(ZONE)</th>
                                <th className="border p-2 min-w-[50px]">위치(행)</th>
                                <th className="border p-2 min-w-[60px]">위치(열)</th>
                                <th className="border p-2 min-w-[80px]">상징문자</th>
                                <th className="border p-2 min-w-[50px]">RU&H(mm)</th>
                                <th className="border p-2 min-w-[50px]">W (mm)</th>
                                <th className="border p-2 min-w-[50px]">D (mm)</th>
                                <th className="border p-2 min-w-[120px]">랙 ID QR</th>
                                <th className="border p-2 min-w-[120px]">랙 모델 QR</th>
                                <th className="border p-2 min-w-[100px]">랙 위치 QR</th>
                                <th className="border p-2 min-w-[80px]">랙 위치</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inputRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="border p-0"><input id={`input-${idx}-zone`} autoComplete="off" className="w-full h-full p-2 outline-none bg-transparent text-center" value={row.zone || ''} onChange={e => handleGridChange(idx, 'zone', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'zone')} /></td>
                                    <td className="border p-0"><input id={`input-${idx}-row`} autoComplete="off" className="w-full h-full p-2 outline-none bg-transparent text-center" value={row.row || ''} onChange={e => handleGridChange(idx, 'row', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'row')} /></td>
                                    <td className="border p-0"><input id={`input-${idx}-col`} autoComplete="off" className="w-full h-full p-2 outline-none bg-transparent text-center" value={row.col || ''} onChange={e => handleGridChange(idx, 'col', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'col')} /></td>
                                    <td className="border p-0"><input id={`input-${idx}-type`} autoComplete="off" className="w-full h-full p-2 outline-none bg-transparent text-center" value={row.type || ''} onChange={e => handleGridChange(idx, 'type', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'type')} /></td>
                                    <td className="border p-0"><input id={`input-${idx}-h`} autoComplete="off" className="w-full h-full p-2 outline-none bg-transparent text-center" value={row.h || ''} onChange={e => handleGridChange(idx, 'h', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'h')} onBlur={() => handleBlur(idx, 'h')} /></td>
                                    <td className="border p-0"><input id={`input-${idx}-w`} autoComplete="off" className="w-full h-full p-2 outline-none bg-transparent text-center" value={row.w || ''} onChange={e => handleGridChange(idx, 'w', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'w')} onBlur={() => handleBlur(idx, 'w')} /></td>
                                    <td className="border p-0"><input id={`input-${idx}-d`} autoComplete="off" className="w-full h-full p-2 outline-none bg-transparent text-center" value={row.d || ''} onChange={e => handleGridChange(idx, 'd', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'd')} onBlur={() => handleBlur(idx, 'd')} /></td>
                                    <td className="border p-0"><input id={`input-${idx}-rackIdQr`} autoComplete="off" className="w-full h-full p-2 outline-none bg-transparent text-center" value={row.rackIdQr || ''} onChange={e => handleGridChange(idx, 'rackIdQr', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'rackIdQr')} /></td>
                                    <td className="border p-0"><input id={`input-${idx}-rackModelQr`} autoComplete="off" className={`w-full h-full p-2 outline-none text-center ${getRackModelQrBgColor(row.rackModelQr)}`} value={row.rackModelQr || ''} onChange={e => handleGridChange(idx, 'rackModelQr', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'rackModelQr')} /></td>
                                    <td className="border p-0"><input id={`input-${idx}-rackLocQr`} autoComplete="off" className="w-full h-full p-2 outline-none bg-transparent text-center" value={row.rackLocQr || ''} onChange={e => handleGridChange(idx, 'rackLocQr', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'rackLocQr')} /></td>
                                    <td className="border p-0"><input id={`input-${idx}-rackLoc`} autoComplete="off" className="w-full h-full p-2 outline-none bg-transparent text-center" value={row.rackLoc || ''} onChange={e => handleGridChange(idx, 'rackLoc', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 'rackLoc')} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RIGHT: Office Selector */}
            <div className="w-96 flex flex-col gap-4">

                {/* Selected Office Info */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4" /> 선택된 국사 정보
                    </h3>
                    {selectedOffice ? (
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-gray-500">팀명</span>
                                <span className="font-medium">{selectedOffice.teamName || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-gray-500">구분</span>
                                <span className="font-medium">{selectedOffice.locationType || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-gray-500">국사명</span>
                                <span className="font-medium text-right truncate w-40">{selectedOffice.locationName || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-gray-500">설치장소ID</span>
                                <span className="font-medium">{selectedOffice.locationId || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">국사 랙ID</span>
                                <span className="font-medium">{selectedOffice.rackQr || '-'}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded">
                            국사를 선택해주세요.
                        </div>
                    )}
                </div>

                {/* Office List */}
                <div className="bg-white h-80 rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-3 border-b bg-gray-50">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="국사명 검색..."
                                className="w-full pl-8 pr-2 py-2 border rounded text-sm outline-none focus:border-blue-500"
                                value={officeSearchTerm}
                                onChange={(e) => setOfficeSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-scroll [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
                        {filteredOffices.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {filteredOffices.map((office, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleOfficeSelect(office)}
                                        className={`p-3 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${selectedOffice === office ? 'bg-blue-100 border-l-4 border-blue-500' : ''}`}
                                    >
                                        <div className="font-medium text-gray-800">{office.locationName}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                            <span>{office.teamName}</span>
                                            <span>{office.locationId}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-sm text-gray-400">
                                {!officeSearchTerm.trim()
                                    ? "국사명을 검색하면 리스트가 표시됩니다."
                                    : "검색 결과가 없습니다."}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showConfirmModal}
                message="입력된 내용을 모두 초기화하시겠습니까?"
                onConfirm={handleConfirmReset}
                onCancel={() => setShowConfirmModal(false)}
            />

            {/* [신규] 이미지 보기 모달 */}
            {isImageModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={handleCloseImageModal}>
                    <div className="bg-white rounded-lg shadow-2xl overflow-hidden max-w-4xl max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <div className="p-2 flex justify-between items-center border-b">
                            <h3 className="font-bold text-gray-700 px-2">랙 모델 사진 ({foundModelId})</h3>
                            <button onClick={handleCloseImageModal} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-gray-100">
                            {imagePreviewUrl ? (
                                <img src={imagePreviewUrl} alt="Rack Model" className="max-w-full max-h-[70vh] object-contain shadow-md" />
                            ) : (
                                <div className="text-gray-400">이미지 로딩 중...</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// export default React.memo(FieldInputManager);
export default React.memo(FieldInputManager);
