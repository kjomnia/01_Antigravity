import React, { useState, useMemo, useEffect } from 'react';
import { Search, Save, RotateCcw, Database, Cable, Printer } from 'lucide-react';
import { exportDataFile } from '../utils/excelUtils';

const WireRegistrationManager = ({ inputRows, setInputRows, onReset }) => {
    console.log(`[WireRegistration] Rendering with ${inputRows?.length} rows`);

    // 컬럼 정의 (10개)
    const COLUMN_DEFS = [
        { key: 'spec1', label: '규격1' },
        { key: 'qr1', label: '선로 QR1' },
        { key: 'id1', label: '선로ID 1' },
        { key: 'end1', label: '종료점 1' },
        { key: 'alias1', label: '별칭 1' },
        { key: 'spec2', label: '규격2' },
        { key: 'qr2', label: '선로 QR2' },
        { key: 'id2', label: '선로ID 2' },
        { key: 'end2', label: '종료점 2' },
        { key: 'alias2', label: '별칭 2' },
    ];

    // 그리드 데이터 변경 핸들러
    const handleGridChange = (index, key, value) => {
        try {
            console.log(`[WireRegistration] Change - idx: ${index}, key: ${key}, val: ${value}`);
            const newRows = [...inputRows];
            newRows[index] = { ...newRows[index], [key]: value };

            // 행 자동 추가 (최대 999)
            if (index >= newRows.length - 1 && newRows.length < 999) {
                const rowsToAdd = Math.min(5, 999 - newRows.length);
                for (let i = 0; i < rowsToAdd; i++) {
                    newRows.push({});
                }
            }

            setInputRows(newRows);
        } catch (error) {
            console.error("[WireRegistration] handleGridChange error:", error);
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
            const exportRow = {
                '국사명': '없음',
                '국사 랙ID': ''
            };

            COLUMN_DEFS.forEach(col => {
                exportRow[col.label] = row[col.key] || '';
            });

            return exportRow;
        });

        exportDataFile(exportData, `선로등록_${new Date().getTime()}`, 'xls');
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
            type: 'wire',
            officeName: 'Unknown',
            rows: validRows
        });

        if (result.success) {
            alert(result.message);
        } else {
            alert("출력 오류: " + result.message);
        }
    };

    const handleReset = () => {
        if (confirm("입력된 내용을 모두 초기화하시겠습니까?")) {
            console.log("[WireRegistration] Reset called");
            if (typeof onReset === 'function') {
                onReset();
            } else {
                setInputRows(Array.from({ length: 20 }, () => ({})));
            }
        }
    };

    // [신규] 초기 로드 및 리마운트(리셋) 시 첫 번째 칸 포커스
    useEffect(() => {
        const timer = setTimeout(() => {
            const firstInput = document.querySelector('input');
            if (firstInput) {
                console.log("[WireRegistration] Focus restored");
                firstInput.focus();
                // 시각적 피드백: 잠시 테두리 강조
                firstInput.style.backgroundColor = '#f0f9ff';
                setTimeout(() => { if (firstInput) firstInput.style.backgroundColor = 'transparent'; }, 500);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex h-full gap-4 p-4 bg-gray-100 items-stretch" style={{ minHeight: 'calc(100vh - 180px)' }}>
            {/* LEFT & CENTER: Input Area - Now taking full width */}
            <div className="flex-1 flex flex-col gap-4">

                {/* Top Toolbar */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cable className="w-5 h-5 text-gray-600" />
                        <span className="font-bold text-gray-800 text-lg">선로등록 입력</span>
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
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[700px] overflow-y-auto w-full">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 font-bold">
                            <tr>
                                {COLUMN_DEFS.map((col, idx) => (
                                    <th key={idx} className="border p-2 min-w-[100px]">{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {inputRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    {COLUMN_DEFS.map((col, colIdx) => (
                                        <td key={colIdx} className="border p-0">
                                            <input
                                                className="w-full h-full p-2 outline-none bg-transparent"
                                                value={row[col.key] || ''}
                                                onChange={e => handleGridChange(idx, col.key, e.target.value)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WireRegistrationManager;
