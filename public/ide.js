// AI Code Editor - VS Code-like IDE with AI Assistant

const API_BASE = 'http://localhost:3000/api';

// State
let projectPath = '';
let projectFiles = [];
let openFiles = {}; // {path: content}
let currentFile = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    checkConnection();

    // Load last project from localStorage
    const lastProject = localStorage.getItem('lastProject');
    if (lastProject) {
        document.getElementById('projectPath').value = lastProject;
    }
});

async function checkConnection() {
    try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();

        document.getElementById('connectionStatus').textContent =
            data.ollama ? '🟢 AI Connected' : '🟡 Ollama Offline';
    } catch (e) {
        document.getElementById('connectionStatus').textContent = '🔴 Server Offline';
    }
}

// ============================================
// PROJECT LOADING
// ============================================

async function loadProject() {
    const path = document.getElementById('projectPath').value.trim();
    if (!path) {
        addMessage('Please enter a project path', 'error');
        return;
    }

    projectPath = path;
    localStorage.setItem('lastProject', path);

    addMessage(`Loading project: ${path}...`, 'ai');

    try {
        const res = await fetch(`${API_BASE}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        const data = await res.json();

        if (data.success) {
            projectFiles = data.files;
            displayFileTree(data.files);
            addMessage(`✅ Loaded ${data.files.length} files!`, 'success');
        } else {
            addMessage('Error: ' + data.error, 'error');
        }
    } catch (e) {
        addMessage('Error loading project: ' + e.message, 'error');
    }
}

function displayFileTree(files) {
    const tree = document.getElementById('fileTree');

    tree.innerHTML = files.map((f, i) => `
        <div class="file-item" onclick="openFile(${i})" data-path="${f.path}">
            <span class="icon">${getFileIcon(f.extension)}</span>
            <span>${f.name}</span>
        </div>
    `).join('');
}

function getFileIcon(ext) {
    const icons = {
        '.ts': '📘',
        '.js': '📙',
        '.tsx': '⚛️',
        '.jsx': '⚛️',
        '.css': '🎨',
        '.html': '🌐',
        '.json': '📋',
        '.wgsl': '🔮',
        '.glsl': '🔮',
        '.md': '📝'
    };
    return icons[ext] || '📄';
}

// ============================================
// FILE OPERATIONS
// ============================================

async function openFile(index) {
    const file = projectFiles[index];
    if (!file) return;

    // Check if already open
    if (openFiles[file.path]) {
        switchToFile(file);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/file/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: file.path })
        });
        const data = await res.json();

        if (data.success) {
            openFiles[file.path] = {
                ...file,
                content: data.content,
                original: data.content
            };
            addTab(file);
            switchToFile(file);

            // Update file tree selection
            document.querySelectorAll('.file-item').forEach((el, i) => {
                el.classList.toggle('active', i === index);
            });
        }
    } catch (e) {
        addMessage('Error opening file: ' + e.message, 'error');
    }
}

function addTab(file) {
    const tabs = document.getElementById('tabs');

    // Remove welcome tab if exists
    const welcomeTab = tabs.querySelector('[data-file="welcome"]');
    if (welcomeTab) welcomeTab.remove();

    // Check if tab exists
    if (tabs.querySelector(`[data-file="${file.path}"]`)) return;

    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.file = file.path;
    tab.innerHTML = `
        <span>${getFileIcon(file.extension)} ${file.name}</span>
        <span class="close" onclick="closeTab(event, '${file.path}')">×</span>
    `;
    tab.onclick = (e) => {
        if (!e.target.classList.contains('close')) {
            switchToFile(file);
        }
    };

    tabs.appendChild(tab);
}

function switchToFile(file) {
    currentFile = file;

    // Update editor
    const editor = document.getElementById('codeEditor');
    editor.value = openFiles[file.path]?.content || '';

    // Update tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.file === file.path);
    });

    // Update status
    document.getElementById('fileStatus').textContent = `${file.name} - ${file.path}`;

    // Save on change
    editor.oninput = () => {
        if (openFiles[file.path]) {
            openFiles[file.path].content = editor.value;
        }
    };
}

function closeTab(event, path) {
    event.stopPropagation();

    const tab = document.querySelector(`.tab[data-file="${path}"]`);
    if (tab) tab.remove();

    delete openFiles[path];

    // Switch to another file
    const remaining = Object.keys(openFiles);
    if (remaining.length > 0) {
        const nextFile = projectFiles.find(f => f.path === remaining[0]);
        if (nextFile) switchToFile(nextFile);
    } else {
        currentFile = null;
        document.getElementById('codeEditor').value = '';
        document.getElementById('fileStatus').textContent = 'No file open';
    }
}

async function saveCurrentFile() {
    if (!currentFile || !openFiles[currentFile.path]) return false;

    try {
        const res = await fetch(`${API_BASE}/file/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filePath: currentFile.path,
                content: openFiles[currentFile.path].content
            })
        });
        const data = await res.json();
        return data.success;
    } catch (e) {
        return false;
    }
}

// ============================================
// AI CHAT - THE MAGIC ✨
// ============================================

async function sendPrompt() {
    const input = document.getElementById('chatInput');
    const prompt = input.value.trim();
    if (!prompt) return;

    input.value = '';
    addMessage(prompt, 'user');

    // Check if we have a file open
    if (!currentFile) {
        addMessage('Please open a file first!', 'error');
        return;
    }

    addMessage('🤔 Thinking...', 'ai');

    const currentContent = openFiles[currentFile.path]?.content || '';

    try {
        const res = await fetch(`${API_BASE}/chat/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                filePath: currentFile.path,
                content: currentContent,
                projectPath
            })
        });
        const data = await res.json();

        // Remove "thinking" message
        removeLastMessage();

        if (data.success) {
            if (data.newContent) {
                // AI made changes - update editor
                openFiles[currentFile.path].content = data.newContent;
                document.getElementById('codeEditor').value = data.newContent;

                addMessage(`✅ ${data.message}`, 'success');

                // Auto-save
                if (await saveCurrentFile()) {
                    addMessage('💾 Changes saved!', 'success');
                }
            } else {
                // AI just responded
                addMessage(data.response, 'ai');
            }
        } else {
            addMessage('Error: ' + data.error, 'error');
        }
    } catch (e) {
        removeLastMessage();
        addMessage('Error: ' + e.message, 'error');
    }
}

function addMessage(text, type) {
    const container = document.getElementById('chatMessages');
    const msg = document.createElement('div');
    msg.className = `msg ${type}`;
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

function removeLastMessage() {
    const container = document.getElementById('chatMessages');
    const last = container.lastElementChild;
    if (last) last.remove();
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', async (e) => {
    // Ctrl+S - Save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (await saveCurrentFile()) {
            addMessage('💾 Saved!', 'success');
        }
    }
});
