import React, { useEffect, useRef } from 'react';

const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
    const confirmButtonRef = useRef(null);

    useEffect(() => {
        if (isOpen && confirmButtonRef.current) {
            // 모달이 열리면 확인 버튼에 포커스
            confirmButtonRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onCancel}
            />

            {/* 모달 컨텐츠 */}
            <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
                <div className="mb-6">
                    <p className="text-lg text-gray-800">{message}</p>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        ref={confirmButtonRef}
                        onClick={onConfirm}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
