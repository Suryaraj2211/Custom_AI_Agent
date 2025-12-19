// AI Agent Web UI - Frontend JavaScript

const API_BASE = 'http://localhost:3000/api';

// State
let currentMode = 'chat';
let projectPath = '';
let currentFile = null;
let projectFiles = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check health on load
    checkHealth();

    // Mode button clicks
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    // Project path input
    document.getElementById('projectPath').addEventListener('change', (e) => {
        projectPath = e.target.value;
    });

    // Scan button
    document.getElementById('scanBtn').addEventListener('click', scanProject);
});

// ============================================
// HEALTH CHECK
// ============================================

async function checkHealth() {
    const statusEl = document.getElementById('status');

    try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();

        if (data.ollama) {
            statusEl.innerHTML = '<span class="dot"></span><span>✅ Connected</span>';
            statusEl.className = 'status connected';
        } else {
            statusEl.innerHTML = '<span class="dot"></span><span>⚠️ Ollama not running</span>';
            statusEl.className = 'status error';
        }
    } catch (e) {
        statusEl.innerHTML = '<span class="dot"></span><span>❌ Server offline</span>';
        statusEl.className = 'status error';
    }
}

// ============================================
// MODE SWITCHING
// ============================================

function switchMode(mode) {
    currentMode = mode;

    // Update buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Update panels
    document.querySelectorAll('.mode-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${mode}Panel`).classList.add('active');
}

// ============================================
// PROJECT SCANNING
// ============================================

async function scanProject() {
    const path = document.getElementById('projectPath').value;
    if (!path) {
        alert('Please enter a project path');
        return;
    }

    projectPath = path;
    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        const data = await res.json();

        if (data.success) {
            displayFiles(data.files);
        } else {
            alert('Error scanning: ' + data.error);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }

    showLoading(false);
}

function displayFiles(files) {
    projectFiles = files; // Store globally
    const panel = document.getElementById('filesPanel');
    const list = document.getElementById('filesList');

    list.innerHTML = files.map((f, i) =>
        `<span class="file-tag" onclick="openFile(${i})" data-index="${i}">${f.name}</span>`
    ).join('');

    panel.style.display = 'block';
}

// ============================================
// CHAT MODE
// ============================================

async function sendChat() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    // Add user message
    addChatMessage(message, 'user');
    input.value = '';

    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, projectPath })
        });
        const data = await res.json();

        if (data.success) {
            addChatMessage(data.response, 'ai');
        } else {
            addChatMessage('Error: ' + data.error, 'ai');
        }
    } catch (e) {
        addChatMessage('Error: ' + e.message, 'ai');
    }

    showLoading(false);
}

function addChatMessage(text, type) {
    const container = document.getElementById('chatContainer');
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.innerHTML = `<strong>${type === 'user' ? '👤 You:' : '🤖 AI:'}</strong> ${text}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ============================================
// DEBUG MODE
// ============================================

async function runDebug() {
    const error = document.getElementById('errorInput').value.trim();
    if (!error) {
        alert('Please enter an error message');
        return;
    }

    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/debug`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error, projectPath })
        });
        const data = await res.json();

        if (data.success) {
            displayDebugResult(data.result);
        } else {
            document.getElementById('debugResult').textContent = 'Error: ' + data.error;
        }
    } catch (e) {
        document.getElementById('debugResult').textContent = 'Error: ' + e.message;
    }

    showLoading(false);
}

function displayDebugResult(result) {
    const html = `
❓ Error Meaning:
${result.errorMeaning}

📁 Location:
   File: ${result.file}
   Function: ${result.function}

🔍 Why It Happens:
${result.whyItHappens}

🔧 What To Change:
${result.whatToChange}

${result.codeExample ? `💻 Code Example:\n${result.codeExample}` : ''}
    `.trim();

    document.getElementById('debugResult').textContent = html;
}

// ============================================
// CONCEPT MODE
// ============================================

async function runConcept() {
    if (!projectPath) {
        alert('Please enter and scan a project path first');
        return;
    }

    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/concept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectPath })
        });
        const data = await res.json();

        if (data.success) {
            displayConceptResult(data.result);
        } else {
            document.getElementById('conceptResult').textContent = 'Error: ' + data.error;
        }
    } catch (e) {
        document.getElementById('conceptResult').textContent = 'Error: ' + e.message;
    }

    showLoading(false);
}

function displayConceptResult(result) {
    const html = `
🏗️ Architecture:
${result.architecture}

🔄 Data Flow:
${result.dataFlow}

💡 Key Insights:
${result.keyInsights.map(i => `• ${i}`).join('\n')}

📝 Summary:
${result.summary}
    `.trim();

    document.getElementById('conceptResult').textContent = html;
}

// ============================================
// FEATURE MODE
// ============================================

async function runFeature() {
    const request = document.getElementById('featureInput').value.trim();
    if (!request) {
        alert('Please enter a feature request');
        return;
    }

    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/feature`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request, projectPath })
        });
        const data = await res.json();

        if (data.success) {
            displayFeatureResult(data.result);
        } else {
            document.getElementById('featureResult').textContent = 'Error: ' + data.error;
        }
    } catch (e) {
        document.getElementById('featureResult').textContent = 'Error: ' + e.message;
    }

    showLoading(false);
}

function displayFeatureResult(result) {
    const html = `
⚡ Complexity: ${result.estimatedComplexity.toUpperCase()}

❓ Clarifying Questions:
${result.clarifications.map((q, i) => `${i + 1}. ${q}`).join('\n')}

🎯 Recommended Approach:
${result.approach}

📁 Files to Modify:
${result.filesToModify.map(f => `• ${f.file} [${f.action.toUpperCase()}] - ${f.description}`).join('\n')}

💻 Skeleton Code:
${result.skeletonCode}

⚠️ Warnings:
${result.warnings.map(w => `• ${w}`).join('\n')}
    `.trim();

    document.getElementById('featureResult').textContent = html;
}

// ============================================
// UTILITIES
// ============================================

function showLoading(show) {
    document.getElementById('loading').classList.toggle('show', show);
}

// ============================================
// EDITOR MODE
// ============================================

async function openFile(index) {
    const file = projectFiles[index];
    if (!file) return;

    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/file/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: file.path })
        });
        const data = await res.json();

        if (data.success) {
            currentFile = file;
            document.getElementById('codeEditor').value = data.content;
            document.getElementById('currentFileName').textContent = `📄 ${file.name} (${data.lines} lines)`;

            // Highlight active file
            document.querySelectorAll('.file-tag').forEach((tag, i) => {
                tag.classList.toggle('active', i === index);
            });

            // Switch to editor mode
            switchMode('editor');
        } else {
            alert('Error opening file: ' + data.error);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }

    showLoading(false);
}

async function saveFile() {
    if (!currentFile) {
        alert('No file loaded');
        return;
    }

    const content = document.getElementById('codeEditor').value;
    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/file/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filePath: currentFile.path,
                content
            })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('editorResult').textContent = '✅ File saved successfully!';
            setTimeout(() => {
                document.getElementById('editorResult').textContent = '';
            }, 3000);
        } else {
            alert('Error saving: ' + data.error);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }

    showLoading(false);
}

async function askAI() {
    if (!currentFile) {
        alert('No file loaded');
        return;
    }

    const instruction = document.getElementById('aiInstruction').value.trim();
    if (!instruction) {
        alert('Please enter an instruction for AI');
        return;
    }

    const content = document.getElementById('codeEditor').value;
    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/file/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filePath: currentFile.path,
                content,
                instruction
            })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('editorResult').textContent = '🤖 AI Suggestion:\n\n' + data.suggestion;
        } else {
            document.getElementById('editorResult').textContent = 'Error: ' + data.error;
        }
    } catch (e) {
        document.getElementById('editorResult').textContent = 'Error: ' + e.message;
    }

    showLoading(false);
    document.getElementById('aiInstruction').value = '';
}

