import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, Check, ArrowLeft, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { OFFICE_COLUMNS, RACK_COLUMNS, EQUIPMENT_COLUMNS, createTemplateData } from '../utils/excelUtils';

const DataSetupPage = ({
    officeData, setOfficeData,
    rackData, setRackData,
    equipmentData, setEquipmentData,
    onBack
}) => {
    const [activeTab, setActiveTab] = useState('office');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

    const tabs = [
        { id: 'office', label: '국사 리스트', columns: OFFICE_COLUMNS, data: officeData, setData: setOfficeData },
        { id: 'rack', label: '랙 모델', columns: RACK_COLUMNS, data: rackData, setData: setRackData },
        { id: 'equipment', label: '대상 설비', columns: EQUIPMENT_COLUMNS, data: equipmentData, setData: setEquipmentData }
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    // 엑셀 템플릿 다운로드
    const handleDownloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const wsData = createTemplateData(currentTab.columns);
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, `${currentTab.label}_template.xlsx`);
    };

    // 파일 업로드 핸들러
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (rawData.length < 2) {
                    throw new Error('데이터가 없습니다.');
                }

                // 헤더 매핑 확인
                const fileHeader = rawData[0];
                const colMap = {};
                currentTab.columns.forEach(col => {
                    const idx = fileHeader.indexOf(col.label);
                    if (idx !== -1) colMap[col.key] = idx;
                });

                // 데이터 변환
                const newData = rawData.slice(1).map((row, idx) => {
                    const item = { id: Date.now() + idx };
                    Object.keys(colMap).forEach(key => {
                        item[key] = row[colMap[key]];
                    });
                    return item;
                });

                if (newData.length === 0) {
                    throw new Error('유효한 데이터가 없습니다.');
                }

                // [중요] 기존 데이터 덮어쓰기 (DB 등록이므로 초기화 후 등록이 일반적이나, 추가 옵션 고려)
                // 여기서는 "등록"의 의미를 "추가"로 해석하되, 
                // 사용자 입장에서 헷갈리지 않게 Confirm 창으로 물어봄.

                const append = window.confirm(
                    `총 ${newData.length}건의 데이터를 발견했습니다.\n\n[확인] : 기존 데이터에 추가\n[취소] : 기존 데이터를 삭제하고 새로 등록`
                );

                if (append) {
                    currentTab.setData(prev => [...prev, ...newData]);
                    setMessage({ type: 'success', text: `기존 데이터 뒤에 ${newData.length}건이 추가되었습니다.` });
                } else {
                    currentTab.setData(newData);
                    setMessage({ type: 'success', text: `기존 데이터를 삭제하고 ${newData.length}건이 새로 등록되었습니다.` });
                }

            } catch (error) {
                console.error("Upload Error:", error);
                setMessage({ type: 'error', text: `파일 처리 중 오류가 발생했습니다: ${error.message}` });
            } finally {
                setIsLoading(false);
                e.target.value = ''; // Reset input
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">데이터 설정 (DB 등록)</h1>
                        <p className="text-sm text-gray-500">관리자 권한 없이 데이터를 등록/업로드 할 수 있습니다.</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col max-w-5xl mx-auto w-full">

                {/* Tabs */}
                <div className="flex mb-6 bg-white rounded-lg shadow-sm p-1 border border-gray-200">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setMessage(null); }}
                            className={`flex-1 py-3 text-sm font-medium rounded-md transition-all ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Upload Area */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center flex-1 min-h-[400px]">
                    <div className="mb-4 p-4 bg-blue-50 rounded-full">
                        <FileSpreadsheet className="w-12 h-12 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentTab.label} 데이터 등록</h2>
                    <p className="text-gray-500 mb-8 text-center max-w-md">
                        엑셀 파일을 업로드하여 데이터를 등록하세요.<br />
                        기존 데이터에 추가하거나, 새로 덮어쓸 수 있습니다.
                    </p>

                    <div className="flex flex-col gap-4 w-full max-w-sm">
                        <label className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors shadow-md text-lg font-bold">
                            <Upload className="w-6 h-6" />
                            <span>엑셀 파일 업로드</span>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={isLoading}
                            />
                        </label>

                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors font-medium"
                        >
                            <Download className="w-5 h-5" />
                            <span>등록 양식(템플릿) 다운로드</span>
                        </button>
                    </div>

                    {/* Status Message */}
                    {message && (
                        <div className={`mt-8 p-4 rounded-lg flex items-center gap-3 w-full max-w-md ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {message.type === 'success' ? <Check className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
                            <span className="font-medium">{message.text}</span>
                        </div>
                    )}

                    {/* Current Count */}
                    <div className="mt-8 text-sm text-gray-500">
                        현재 등록된 데이터: <strong className="text-gray-900">{currentTab.data ? currentTab.data.length : 0}</strong> 건
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataSetupPage;
