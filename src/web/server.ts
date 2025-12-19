/**
 * Web Server for AI Agent UI
 * Run with: npx ts-node src/web/server.ts
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { debug } from '../modes/debug';
import { concept } from '../modes/concept';
import { feature } from '../modes/feature';
import { checkOllamaHealth } from '../llm/ollama';
import { scanRepository } from '../repo/scan';
import { queryOllama } from '../llm/ollama';
import { analyzeProject } from '../analyze-project';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', async (_req: Request, res: Response) => {
    const ollamaOk = await checkOllamaHealth();
    res.json({
        status: 'ok',
        ollama: ollamaOk,
        message: ollamaOk ? 'Connected' : 'Ollama not running'
    });
});

// Scan project files
app.post('/api/scan', async (req: Request, res: Response) => {
    try {
        const { path: projectPath } = req.body;
        const files = await scanRepository(projectPath || process.cwd());
        res.json({
            success: true,
            files: files.map(f => ({
                name: f.file,
                path: f.path,
                extension: f.extension,
                lines: f.content.split('\n').length
            }))
        });
    } catch (error) {
        res.json({ success: false, error: String(error) });
    }
});

// Analyze entire project for issues
app.post('/api/analyze/project', async (req: Request, res: Response) => {
    try {
        const { path: projectPath } = req.body;
        const result = await analyzeProject(projectPath || process.cwd());
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, error: String(error) });
    }
});

// Debug mode
app.post('/api/debug', async (req: Request, res: Response) => {
    try {
        const { error, projectPath, files } = req.body;
        const result = await debug(error, projectPath, files);
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, error: String(error) });
    }
});

// Concept mode
app.post('/api/concept', async (req: Request, res: Response) => {
    try {
        const { projectPath } = req.body;
        const result = await concept(projectPath);
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, error: String(error) });
    }
});

// Feature mode
app.post('/api/feature', async (req: Request, res: Response) => {
    try {
        const { request, projectPath } = req.body;
        const result = await feature(request, projectPath);
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, error: String(error) });
    }
});

// Chat
app.post('/api/chat', async (req: Request, res: Response) => {
    try {
        const { message, projectPath } = req.body;

        // Simple chat prompt
        const prompt = `You are a helpful AI coding assistant. 
Project: ${projectPath || 'Unknown'}
User: ${message}
Respond helpfully and concisely.`;

        const response = await queryOllama(prompt);
        res.json({ success: true, response });
    } catch (error) {
        res.json({ success: false, error: String(error) });
    }
});

// ============================================
// AI EDIT - THE MAGIC ✨
// ============================================

// Smart chat that can edit files
app.post('/api/chat/edit', async (req: Request, res: Response) => {
    try {
        const { prompt, filePath, content, projectPath } = req.body;

        const fileName = path.basename(filePath);

        // Check if this is an edit request or just a question
        const editKeywords = ['add', 'remove', 'fix', 'change', 'update', 'modify', 'create', 'delete', 'refactor', 'improve', 'implement', 'write'];
        const isEditRequest = editKeywords.some(keyword =>
            prompt.toLowerCase().includes(keyword)
        );

        if (isEditRequest) {
            // AI should modify the code
            const editPrompt = `You are a senior software engineer. Modify this code based on the user's request.

File: ${fileName}

Current Code:
\`\`\`
${content}
\`\`\`

User Request: ${prompt}

IMPORTANT RULES:
1. Return ONLY the complete modified code
2. Do NOT include any explanations, markdown, or code blocks markers
3. Do NOT add \`\`\` at the start or end
4. The response should be the exact code that will replace the file
5. Keep the same code style and formatting

Modified code:`;

            const newContent = await queryOllama(editPrompt);

            // Clean up response - remove any markdown if AI added it
            let cleanContent = newContent.trim();
            if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
            }

            res.json({
                success: true,
                newContent: cleanContent,
                message: `Modified ${fileName} based on: "${prompt}"`
            });
        } else {
            // Just a question, respond normally
            const questionPrompt = `You are a helpful AI coding assistant. The user is working on this file:

File: ${fileName}
Code:
\`\`\`
${content.substring(0, 1000)}...
\`\`\`

User Question: ${prompt}

Provide a helpful, concise answer.`;

            const response = await queryOllama(questionPrompt);
            res.json({ success: true, response });
        }
    } catch (error) {
        res.json({ success: false, error: String(error) });
    }
});

// ============================================
// FILE EDITOR API
// ============================================

import * as fs from 'fs';

// Read file content
app.post('/api/file/read', async (req: Request, res: Response) => {
    try {
        const { filePath } = req.body;

        if (!fs.existsSync(filePath)) {
            res.json({ success: false, error: 'File not found' });
            return;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const extension = path.extname(filePath);

        res.json({
            success: true,
            content,
            name: path.basename(filePath),
            extension,
            lines: content.split('\n').length
        });
    } catch (error) {
        res.json({ success: false, error: String(error) });
    }
});

// Write file content
app.post('/api/file/write', async (req: Request, res: Response) => {
    try {
        const { filePath, content } = req.body;

        fs.writeFileSync(filePath, content, 'utf-8');

        res.json({ success: true, message: 'File saved!' });
    } catch (error) {
        res.json({ success: false, error: String(error) });
    }
});

// Get AI suggestion for code
app.post('/api/file/suggest', async (req: Request, res: Response) => {
    try {
        const { filePath, content, instruction } = req.body;

        const prompt = `You are a senior software engineer. 
File: ${path.basename(filePath)}

Current Code:
\`\`\`
${content}
\`\`\`

User Request: ${instruction}

Provide the improved/fixed code. Return ONLY the code, no explanations.`;

        const response = await queryOllama(prompt);
        res.json({ success: true, suggestion: response });
    } catch (error) {
        res.json({ success: false, error: String(error) });
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('');
    console.log('🚀 AI Agent Web UI');
    console.log('═'.repeat(40));
    console.log(`🌐 Open: http://localhost:${PORT}`);
    console.log('═'.repeat(40));
    console.log('');
});
