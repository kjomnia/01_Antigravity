const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const XLSX = require('xlsx');
const iconv = require('iconv-lite');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'electron-preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, 'public/vite.svg') // Temporary icon
    });

    // In production, load the built index.html
    // In development, you could load the vite dev server, but we'll stick to built file for simplicity
    const indexPath = path.join(__dirname, 'dist/index.html');

    if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
    } else {
        // If dist doesn't exist, show a warning or load a placeholder
        mainWindow.loadURL('data:text/html,<h1>Build the project first (npm run build) then restart Electron.</h1>');
    }

    // mainWindow.webContents.openDevTools(); // [DEBUG] 자동으로 개발자 도구 열기
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handler for Printing
ipcMain.handle('print-data', async (event, { type, officeName, rows }) => {
    try {
        console.log(`Received print request [${type}] for office:`, officeName);

        let exportData = [];
        let fileName = 'print_data_tmp.xlsx';

        if (type === 'wire') {
            // 선로등록 mapping
            fileName = '선로등록양식.xlsx';
            exportData = rows.map(row => ({
                '규격1': row.spec1 || '',
                '선로 QR1': row.qr1 || '',
                '선로ID 1': row.id1 || '',
                '종료점 1': row.end1 || '',
                '별칭 1': row.alias1 || '',
                '규격2': row.spec2 || '',
                '선로 QR2': row.qr2 || '',
                '선로ID 2': row.id2 || '',
                '종료점 2': row.end2 || '',
                '별칭 2': row.alias2 || ''
            }));
        } else if (type === 'wdm') {
            // 장비wdm mapping
            fileName = '장비wdm.xlsx';
            exportData = rows.map(row => ({
                '장비ID': row.eqId || '',
                '장비QR': row.eqQr || '',
                'TID': row.tid || '',
                '장비명': row.eqName || ''
            }));
        } else {
            // QR바코드 (Default Rack) mapping
            fileName = '랙QR양식.xlsx';
            exportData = rows.map(row => {
                let rackId = row.rackIdQr || '';
                if (rackId.startsWith('RID-')) {
                    rackId = rackId.replace('RID-', '');
                }
                return {
                    '랙 ID QR': row.rackIdQr || '',
                    '랙ID': rackId,
                    '랙 모델 QR': row.rackModelQr || '',
                    '랙 위치 QR': row.rackLocQr || '',
                    '랙 위치': row.rackLoc || ''
                };
            });
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Data');

        const baseDir = 'C:\\Job\\Printer\\LGUPLUS_LABEL\\doc';
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }

        const filePath = path.join(baseDir, fileName);
        XLSX.writeFile(wb, filePath);

        // Launch the Printer App
        // When packaged, asarUnpack files are in 'app.asar.unpacked' folder
        let printerDir = path.join(__dirname, 'LGUPlusLabelPrinter');
        let printerExePath = path.join(printerDir, 'LGUPlusLabelPrinter.exe');

        // Robust path check for production (packed in ASAR)
        if (printerExePath.includes('app.asar') && !printerExePath.includes('app.asar.unpacked')) {
            const unpackedPath = printerExePath.replace('app.asar', 'app.asar.unpacked');
            if (fs.existsSync(unpackedPath)) {
                printerExePath = unpackedPath;
                printerDir = printerDir.replace('app.asar', 'app.asar.unpacked');
            }
        }

        console.log('Final Printer Path:', printerExePath);
        console.log('Final Printer Dir (CWD):', printerDir);

        if (fs.existsSync(printerExePath)) {
            // Use shell: true for Windows and specify cwd so DLLs can be found
            exec(`"${printerExePath}"`, { cwd: printerDir, shell: true }, (err) => {
                if (err) console.error('Failed to launch printer app:', err);
            });
            return { success: true, message: `[${type}] 데이터가 저장되고 프린터 프로그램이 실행되었습니다.` };
        } else {
            return { success: false, message: `프린터 프로그램을 찾을 수 없습니다: ${printerExePath}` };
        }

    } catch (error) {
        console.error('Print error:', error);
        return { success: false, message: error.message };
    }
});

// IPC Handler for Reading Env.Ini
ipcMain.handle('read-ini-file', async () => {
    try {
        let iniPath = path.join(__dirname, 'LGUPlusLabelPrinter', 'Env.Ini');
        if (iniPath.includes('app.asar') && !iniPath.includes('app.asar.unpacked')) {
            iniPath = iniPath.replace('app.asar', 'app.asar.unpacked');
        }

        if (fs.existsSync(iniPath)) {
            const buffer = fs.readFileSync(iniPath);
            const content = iconv.decode(buffer, 'euc-kr');
            return { success: true, content: content };
        }
        return { success: false, message: 'Env.Ini 파일을 찾을 수 없습니다.' };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// IPC Handler for Saving Env.Ini
ipcMain.handle('save-ini-file', async (event, content) => {
    try {
        let iniPath = path.join(__dirname, 'LGUPlusLabelPrinter', 'Env.Ini');
        if (iniPath.includes('app.asar') && !iniPath.includes('app.asar.unpacked')) {
            iniPath = iniPath.replace('app.asar', 'app.asar.unpacked');
        }

        const buffer = iconv.encode(content, 'euc-kr');
        fs.writeFileSync(iniPath, buffer);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// IPC Handler for Window Focus
ipcMain.on('focus-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        mainWindow.show();
    }
});
