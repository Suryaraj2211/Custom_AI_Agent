/**
 * Ollama LLM integration - interfaces with local Ollama instance
 */

import Ollama from 'ollama';

const MODEL = 'deepseek-coder:6.7b';

const ollama = Ollama;

// ============================================
// SYSTEM PROMPT - Core Agent Persona
// ============================================

const SYSTEM_PROMPT = `You are a senior full-stack and graphics engineer.

Your role:
- Act as a personal AI development agent.
- Help understand existing code deeply.
- Debug issues by finding the root cause.
- Design and add new features step by step.

Domains you support:
- WebGL, WebGPU, WGSL
- HTML, CSS, JavaScript
- React, Angular, Vue
- Tailwind CSS
- TypeScript, Node.js

Rules (VERY IMPORTANT):
1. Do NOT jump to writing code immediately.
2. First explain the concept and reasoning.
3. If the request is unclear, ask clarifying questions.
4. When adding a feature:
   - Explain architecture
   - List files to change
   - Then give minimal skeleton code
5. When debugging:
   - Explain what the error means
   - Trace where it likely comes from
   - Suggest a fix with reasoning
6. Prefer simple, maintainable solutions.
7. Assume the user is a developer, not a beginner.
8. Use only the given code/context. Do not guess.

Output format:
- Explanation
- Plan
- Then code (only if needed)

If something is not possible or not practical, say it honestly.`;

export async function queryOllama(prompt: string, customSystemPrompt?: string): Promise<string> {
    console.log('🤖 Querying Ollama...');

    try {
        const response = await ollama.chat({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: customSystemPrompt || SYSTEM_PROMPT
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        return response.message.content;
    } catch (error) {
        console.error('❌ Ollama error:', error);
        throw new Error('Failed to query Ollama. Make sure Ollama is running.');
    }
}

// ============================================
// SMART QUERY - Domain-Aware with Knowledge
// ============================================

import { detectFromFile, detectFromContent, getEnhancedPrompt, DomainType, getDomain } from '../knowledge';

/**
 * Query Ollama with automatic domain detection and knowledge injection
 */
export async function queryWithDomain(
    prompt: string,
    filePath?: string,
    fileContent?: string
): Promise<{ response: string; domain: DomainType }> {
    console.log('🤖 Querying Ollama (Smart Mode)...');

    // Detect domain
    let domain: DomainType = 'generic';

    if (filePath && fileContent) {
        const detection = detectFromFile(filePath, fileContent);
        domain = detection.domain;
        console.log(`   📌 Detected: ${getDomain(domain).name} (${(detection.confidence * 100).toFixed(0)}%)`);
    } else if (fileContent) {
        const detection = detectFromContent(fileContent);
        domain = detection.domain;
        console.log(`   📌 Detected: ${getDomain(domain).name}`);
    }

    // Get enhanced prompt with domain knowledge
    const systemPrompt = getEnhancedPrompt(domain, prompt);

    try {
        const response = await ollama.chat({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        return {
            response: response.message.content,
            domain
        };
    } catch (error) {
        console.error('❌ Ollama error:', error);
        throw new Error('Failed to query Ollama. Make sure Ollama is running.');
    }
}

export async function checkOllamaHealth(): Promise<boolean> {
    try {
        await ollama.list();
        return true;
    } catch {
        return false;
    }
}

/**
 * Analyze a bug with error log and relevant files (3-5 files max)
 * Uses senior software engineer prompt style
 */
export interface BugFile {
    path: string;
    content: string;
}

export async function analyzeBug(
    errorLog: string,
    files: BugFile[]
): Promise<string> {
    console.log('🐛 Analyzing bug with Ollama...');
    console.log(`   Error: ${errorLog.substring(0, 100)}...`);
    console.log(`   Files: ${files.length} (max 5)`);

    // Limit to 5 files only - no full repo!
    const relevantFiles = files.slice(0, 5);

    const codeContext = relevantFiles
        .map(f => `--- ${f.path} ---\n${f.content}`)
        .join('\n\n');

    try {
        const response = await ollama.chat({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: `You are a senior software engineer.
Analyze the following code and explain the bug.
Be concise and actionable. Focus on:
1. What is the bug?
2. Why is it happening?
3. How to fix it?`
                },
                {
                    role: 'user',
                    content: `Error Log:
${errorLog}

Related Code (${relevantFiles.length} files):
${codeContext}`
                }
            ]
        });

        return response.message.content;
    } catch (error) {
        console.error('❌ Bug analysis error:', error);
        throw new Error('Failed to analyze bug. Make sure Ollama is running.');
    }
}
