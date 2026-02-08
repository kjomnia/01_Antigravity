import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, AlertCircle } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadIni();
        }
    }, [isOpen]);

    const loadIni = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage('');
        try {
            const result = await window.electronAPI.readIni();
            if (result.success) {
                setContent(result.content);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('설정을 불러오는데 실패했습니다: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage('');
        try {
            const result = await window.electronAPI.saveIni(content);
            if (result.success) {
                setSuccessMessage('설정이 성공적으로 저장되었습니다.');
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('설정 저장 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">프린터 환경 설정 (Env.Ini)</h2>
                        <p className="text-sm text-gray-500 mt-1">LGUPlusLabelPrinter의 설정 파일을 편집합니다.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-auto bg-gray-50">
                    {isLoading && content === '' ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                            <p className="text-gray-500">설정 로딩 중...</p>
                        </div>
                    ) : (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-full min-h-[400px] p-4 font-mono text-sm bg-white border border-gray-200 rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                            placeholder="파일 내용이 없습니다."
                        />
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700">
                            <Save className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{successMessage}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex justify-between gap-3 bg-white">
                    <button
                        onClick={loadIni}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        새로고침
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-8 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            설정 저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
