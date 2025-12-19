/**
 * Chat Mode - Interactive prompt-based conversation with AI
 * 
 * Usage: npx ts-node src/index.ts --mode chat --path ./project
 * 
 * Features:
 * - Continuous conversation
 * - Context-aware (remembers project files)
 * - Multiple commands: /debug, /concept, /feature, /help, /exit
 */

import * as readline from 'readline';
import { FileContent } from '../agent/reader';
import { scanRepository } from '../repo/scan';
import { queryOllama } from '../llm/ollama';
import * as path from 'path';

// ============================================
// CHAT MODE
// ============================================

export async function runChatMode(projectPath?: string): Promise<void> {
    console.log('\n💬 Chat Mode - Interactive AI Assistant');
    console.log('═'.repeat(50));
    console.log('Commands: /debug, /concept, /feature, /files, /help, /exit');
    console.log('Or just type your question!');
    console.log('═'.repeat(50));

    // Load project files for context
    const basePath = projectPath || process.cwd();
    console.log(`\n📂 Loading project: ${basePath}`);

    let files: FileContent[] = [];
    try {
        const scanned = await scanRepository(basePath);
        files = scanned.map(f => ({
            path: f.path,
            content: f.content,
            extension: f.extension
        }));
        console.log(`   ✅ Loaded ${files.length} files\n`);
    } catch (e) {
        console.log('   ⚠️ No files loaded, using current directory\n');
    }

    // Create readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const prompt = () => {
        rl.question('\n🤖 You: ', async (input) => {
            const trimmed = input.trim();

            if (!trimmed) {
                prompt();
                return;
            }

            // Handle commands
            if (trimmed.startsWith('/')) {
                await handleCommand(trimmed, files, basePath);
                prompt();
                return;
            }

            // Regular chat - send to AI
            await chat(trimmed, files);
            prompt();
        });
    };

    // Start prompting
    prompt();
}

/**
 * Handle slash commands
 */
async function handleCommand(
    command: string,
    files: FileContent[],
    basePath: string
): Promise<void> {
    const [cmd, ...args] = command.split(' ');

    switch (cmd) {
        case '/help':
            console.log(`
📖 Available Commands:
──────────────────────────────
/debug <error>     - Analyze an error
/concept           - Explain the codebase
/feature <request> - Plan a new feature
/files             - List loaded files
/reload            - Reload project files
/exit              - Exit chat mode

Or just type any question to chat with AI!
`);
            break;

        case '/debug':
            const error = args.join(' ') || 'general error';
            await debugChat(error, files);
            break;

        case '/concept':
            await conceptChat(files);
            break;

        case '/feature':
            const request = args.join(' ') || 'new feature';
            await featureChat(request, files);
            break;

        case '/files':
            console.log(`\n📁 Loaded Files (${files.length}):`);
            files.slice(0, 10).forEach(f => {
                console.log(`   • ${path.basename(f.path)}`);
            });
            if (files.length > 10) {
                console.log(`   ... and ${files.length - 10} more`);
            }
            break;

        case '/exit':
        case '/quit':
            console.log('\n👋 Goodbye!');
            process.exit(0);
            break;

        default:
            console.log(`❓ Unknown command: ${cmd}. Type /help for help.`);
    }
}

/**
 * Regular chat with AI
 */
async function chat(message: string, files: FileContent[]): Promise<void> {
    console.log('\n🤔 Thinking...');

    // Prepare context
    const fileList = files.slice(0, 10).map(f => path.basename(f.path)).join(', ');
    const sampleCode = files.slice(0, 3)
        .map(f => `--- ${path.basename(f.path)} ---\n${f.content.substring(0, 300)}...`)
        .join('\n\n');

    const prompt = `You are a helpful AI coding assistant. Answer the user's question about their codebase.

Project Files: ${fileList}

Sample Code:
${sampleCode}

User Question: ${message}

Provide a helpful, concise answer. Be conversational and friendly.`;

    try {
        const response = await queryOllama(prompt);
        console.log('\n🤖 AI:', response);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

/**
 * Debug mode in chat
 */
async function debugChat(error: string, files: FileContent[]): Promise<void> {
    console.log(`\n🐛 Debugging: "${error}"`);
    console.log('🤔 Analyzing...');

    const codeContext = files.slice(0, 5)
        .map(f => `--- ${path.basename(f.path)} ---\n${f.content.substring(0, 500)}`)
        .join('\n\n');

    const prompt = `You are a senior software engineer. Debug this error:

Error: ${error}

Code:
${codeContext}

Explain:
1. What is the error?
2. Which file/function?
3. Why it happens?
4. How to fix it?

Be concise and actionable.`;

    try {
        const response = await queryOllama(prompt);
        console.log('\n🤖 AI:', response);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

/**
 * Concept mode in chat
 */
async function conceptChat(files: FileContent[]): Promise<void> {
    console.log('\n📚 Explaining codebase...');
    console.log('🤔 Analyzing architecture...');

    const fileList = files.map(f => path.basename(f.path)).join(', ');
    const sampleCode = files.slice(0, 5)
        .map(f => `--- ${path.basename(f.path)} ---\n${f.content.substring(0, 400)}...`)
        .join('\n\n');

    const prompt = `Explain this codebase to me like a teammate:

Files: ${fileList}

Code:
${sampleCode}

Give me:
1. High-level architecture
2. Key components
3. How they work together
4. Important things to know

Be friendly and clear!`;

    try {
        const response = await queryOllama(prompt);
        console.log('\n🤖 AI:', response);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

/**
 * Feature mode in chat
 */
async function featureChat(request: string, files: FileContent[]): Promise<void> {
    console.log(`\n✨ Planning: "${request}"`);
    console.log('🤔 Thinking...');

    const fileList = files.map(f => path.basename(f.path)).join(', ');
    const sampleCode = files.slice(0, 3)
        .map(f => `--- ${path.basename(f.path)} ---\n${f.content.substring(0, 300)}...`)
        .join('\n\n');

    const prompt = `Plan how to implement this feature:

Request: ${request}

Existing Files: ${fileList}

Code:
${sampleCode}

Provide:
1. Approach
2. Files to create/modify
3. Skeleton code
4. Warnings

Be practical and specific.`;

    try {
        const response = await queryOllama(prompt);
        console.log('\n🤖 AI:', response);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}
