import React from 'react';

const ScanPortManager = () => {
    return (
        <div className="w-full h-full flex flex-col">
            <h2 className="text-lg font-bold mb-4 px-4 pt-4">QR 스캔 포트</h2>
            <div className="flex-1 w-full h-full bg-white border-t border-gray-200">
                <iframe
                    src="./scanport.html"
                    className="w-full h-full border-none"
                    title="QR Scan Port"
                />
            </div>
        </div>
    );
};

export default ScanPortManager;
