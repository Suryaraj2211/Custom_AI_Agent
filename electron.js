/**
 * Electron Main Process - Windows Desktop App
 */

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Start the Express server
function startServer() {
    return new Promise((resolve, reject) => {
        console.log('Starting server...');

        serverProcess = spawn('node', [
            '-r', 'ts-node/register',
            path.join(__dirname, 'src/web/server.ts')
        ], {
            cwd: __dirname,
            shell: true
        });

        serverProcess.stdout.on('data', (data) => {
            console.log(`Server: ${data}`);
            if (data.toString().includes('localhost:3000')) {
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });

        // Give server time to start
        setTimeout(resolve, 3000);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, 'public/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#1e1e1e',
        title: 'AI Agent',
        autoHideMenuBar: true
    });

    // Load the IDE
    mainWindow.loadURL('http://localhost:3000/ide.html');

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    await startServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Kill server process
    if (serverProcess) {
        serverProcess.kill();
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
