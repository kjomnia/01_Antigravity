const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8080;

// When run as an executable (pkg), process.cwd() is usually the directory where the exe is located.
// We want to serve files from the current directory.
const SERVE_DIR = process.cwd();

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv'
};

const server = http.createServer((req, res) => {
    // Decode URL to handle spaces/symbols
    const safeUrl = decodeURIComponent(req.url);
    let filePath = path.join(SERVE_DIR, safeUrl === '/' ? 'index.html' : safeUrl);

    // Prevent directory traversal
    if (!filePath.startsWith(SERVE_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    let ext = path.extname(filePath).toLowerCase();
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is in use, trying ${PORT + 1}...`);
        server.listen(PORT + 1);
    } else {
        console.error(e);
    }
});

server.listen(PORT, () => {
    const address = server.address();
    const realPort = address.port;
    const url = `http://localhost:${realPort}`;

    console.log('='.repeat(40));
    console.log(`  Simple Static Server Running`);
    console.log(`  Serving: ${SERVE_DIR}`);
    console.log(`  URL:     ${url}`);
    console.log('='.repeat(40));
    console.log('  Close this window to stop the server.');

    exec(`start ${url}`, (err) => {
        if (err) {
            // Cannot auto-open, ignore
        }
    });
});
