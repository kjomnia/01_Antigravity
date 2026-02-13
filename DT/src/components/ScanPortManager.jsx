import React from 'react';

export default function ScanPortManager() {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'auto'
        }}>
            <iframe
                src="./scanport.html"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                }}
                title="QR Scan Port"
            />
        </div>
    );
}
