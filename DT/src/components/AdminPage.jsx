import React, { useState } from 'react';
import DataManager from './DataManager';
import { OFFICE_COLUMNS, RACK_COLUMNS, EQUIPMENT_COLUMNS } from '../utils/excelUtils';
import { Lock, LayoutGrid, Server, Settings, LogOut, KeyRound, X, FileDown } from 'lucide-react';

const AdminPage = ({
    officeData, setOfficeData,
    rackData, setRackData,
    equipmentData, setEquipmentData
}) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [loginError, setLoginError] = useState('');
    const [activeSubTab, setActiveSubTab] = useState('office');

    // [신규] 비밀번호 변경 상태
    const [isPwModalOpen, setIsPwModalOpen] = useState(false);
    const [pwChangeData, setPwChangeData] = useState({ current: '', new: '', confirm: '' });

    // 초기 비밀번호 로드 (localStorage에 없으면 '1234')
    const getStoredPassword = () => localStorage.getItem('adminPassword') || '1234';

    const handleLogin = (e) => {
        e.preventDefault();
        const storedPw = getStoredPassword();
        if (passwordInput === storedPw) {
            setIsAuthenticated(true);
            setLoginError('');
        } else {
            setLoginError('비밀번호가 올바르지 않습니다.');
        }
    };

    const handleChangePassword = () => {
        const { current, new: newPw, confirm } = pwChangeData;
        const storedPw = getStoredPassword();

        if (current !== storedPw) {
            alert("현재 비밀번호가 일치하지 않습니다.");
            return;
        }
        if (newPw.length < 4) {
            alert("새 비밀번호는 4자 이상이어야 합니다.");
            return;
        }
        if (newPw !== confirm) {
            alert("새 비밀번호 확인이 일치하지 않습니다.");
            return;
        }

        localStorage.setItem('adminPassword', newPw);
        alert("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
        setIsAuthenticated(false);
        setPasswordInput('');
        setIsPwModalOpen(false);
        setPwChangeData({ current: '', new: '', confirm: '' });
    };

    const handleExportForDeployment = () => {
        if (!window.confirm('현재 데이터를 배포용 파일(initialData.js)로 내보내시겠습니까?')) return;

        const content = `// 초기 배포용 데이터
// 관리자 페이지에서 [배포용 데이터 내보내기]를 통해 이 파일의 내용을 교체할 수 있습니다.

export const initialOfficeData = ${JSON.stringify(officeData, null, 2)};
export const initialRackData = ${JSON.stringify(rackData, null, 2)};
export const initialEquipmentData = ${JSON.stringify(equipmentData, null, 2)};
`;

        const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'initialData.js';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setPasswordInput('');
        setActiveSubTab('office');
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 w-full max-w-md">
                    <div className="flex flex-col items-center mb-6">
                        <div className="p-3 bg-blue-100 rounded-full mb-4">
                            <Lock className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">관리자 로그인</h2>
                        <p className="text-gray-500 text-sm mt-1">데이터 관리를 위해 비밀번호를 입력하세요.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="비밀번호"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                autoFocus
                            />
                            {loginError && <p className="text-red-500 text-sm mt-1 ml-1">{loginError}</p>}
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            로그인
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Admin Header / Sub-tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                <div className="flex space-x-1">
                    <button
                        onClick={() => setActiveSubTab('office')}
                        className={`
                            flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                            ${activeSubTab === 'office'
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                : 'text-gray-600 hover:bg-gray-100'}
                        `}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        국사 리스트
                    </button>
                    <button
                        onClick={() => setActiveSubTab('rack')}
                        className={`
                            flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                            ${activeSubTab === 'rack'
                                ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                                : 'text-gray-600 hover:bg-gray-100'}
                        `}
                    >
                        <Server className="w-4 h-4" />
                        랙 모델
                    </button>
                    <button
                        onClick={() => setActiveSubTab('equipment')}
                        className={`
                            flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                            ${activeSubTab === 'equipment'
                                ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                                : 'text-gray-600 hover:bg-gray-100'}
                        `}
                    >
                        <Settings className="w-4 h-4" />
                        대상 설비
                    </button>
                </div>

                <div className="flex items-center gap-3 pr-2 border-l pl-4 border-gray-200">
                    <span className="text-sm font-medium text-gray-500">관리자 모드</span>
                    <button
                        onClick={handleExportForDeployment}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="배포용 데이터 내보내기"
                    >
                        <FileDown className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsPwModalOpen(true)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="비밀번호 변경"
                    >
                        <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="로그아웃"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 비밀번호 변경 모달 */}
            {isPwModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <KeyRound className="w-5 h-5" /> 비밀번호 변경
                            </h3>
                            <button onClick={() => setIsPwModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
                                <input
                                    type="password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                    value={pwChangeData.current}
                                    onChange={e => setPwChangeData({ ...pwChangeData, current: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                                <input
                                    type="password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                    value={pwChangeData.new}
                                    onChange={e => setPwChangeData({ ...pwChangeData, new: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
                                <input
                                    type="password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                    value={pwChangeData.confirm}
                                    onChange={e => setPwChangeData({ ...pwChangeData, confirm: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setIsPwModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleChangePassword}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                            >
                                변경하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Content */}
            <div className="flex-1 overflow-hidden">
                {activeSubTab === 'office' && (
                    <DataManager
                        title="국사 리스트 관리 (Office List)"
                        type="office"
                        columns={OFFICE_COLUMNS}
                        data={officeData}
                        setData={setOfficeData}
                    />
                )}
                {activeSubTab === 'rack' && (
                    <DataManager
                        title="랙 모델 관리 (Rack Model)"
                        type="rack"
                        columns={RACK_COLUMNS}
                        data={rackData}
                        setData={setRackData}
                    />
                )}
                {activeSubTab === 'equipment' && (
                    <DataManager
                        title="대상 설비 관리 (Equipment)"
                        type="equipment"
                        columns={EQUIPMENT_COLUMNS}
                        data={equipmentData}
                        setData={setEquipmentData}
                    />
                )}
            </div>
        </div>
    );
};

export default React.memo(AdminPage);
