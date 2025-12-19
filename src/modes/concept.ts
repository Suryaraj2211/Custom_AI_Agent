/**
 * Concept Mode - Explain system architecture like a teammate
 * 
 * Output:
 * - Architecture overview
 * - Key components
 * - Data flow
 * - Important insights
 */

import { FileContent } from '../agent/reader';
import { scanRepository } from '../repo/scan';
import { queryOllama } from '../llm/ollama';
import * as path from 'path';

// ============================================
// INTERFACES
// ============================================

export interface Component {
    name: string;
    file: string;
    purpose: string;
    dependencies: string[];
}

export interface ConceptResult {
    architecture: string;      // High-level overview
    components: Component[];   // Key parts of the system
    dataFlow: string;          // How data moves through the system
    keyInsights: string[];     // Important things to understand
    summary: string;           // One-liner summary
}

// ============================================
// CONCEPT MODE
// ============================================

/**
 * Run concept analysis on a codebase
 */
export async function runConceptMode(
    files: FileContent[]
): Promise<ConceptResult> {
    console.log('\n📚 Concept Mode - Understanding System');
    console.log('═'.repeat(50));
    console.log(`Analyzing ${files.length} files...`);
    console.log('─'.repeat(50));

    // Prepare code context (sample of files)
    const sampleFiles = files.slice(0, 8);
    const codeContext = sampleFiles
        .map(f => `--- ${path.basename(f.path)} ---\n${f.content.substring(0, 500)}...`)
        .join('\n\n');

    // File list for context
    const fileList = files.map(f => path.basename(f.path)).join(', ');

    const prompt = `You are a senior developer explaining this system to a new teammate. Be friendly, clear, and insightful.

## Files in Project
${fileList}

## Code Samples
${codeContext}

## Your Explanation
Explain this system like you're talking to a teammate. Provide a JSON response:
{
    "architecture": "High-level overview of what this system does and how it's structured",
    "components": [
        {
            "name": "ComponentName",
            "file": "filename.ts",
            "purpose": "What this component does",
            "dependencies": ["other", "components"]
        }
    ],
    "dataFlow": "Explain how data flows through the system step by step",
    "keyInsights": [
        "Important thing 1 to understand",
        "Important thing 2",
        "Common gotcha or tip"
    ],
    "summary": "One-line summary of the entire system"
}

IMPORTANT: Return ONLY valid JSON. Be conversational but informative.`;

    try {
        const response = await queryOllama(prompt);

        // Parse JSON
        try {
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(cleanResponse);

            return {
                architecture: parsed.architecture || response,
                components: parsed.components || [],
                dataFlow: parsed.dataFlow || 'See architecture',
                keyInsights: parsed.keyInsights || [],
                summary: parsed.summary || 'System analyzed'
            };
        } catch (parseError) {
            return {
                architecture: response,
                components: [],
                dataFlow: 'See architecture overview',
                keyInsights: ['Review the architecture explanation above'],
                summary: 'System analyzed'
            };
        }
    } catch (error) {
        console.error('❌ Concept analysis failed:', error);
        throw new Error('Failed to analyze system. Make sure Ollama is running.');
    }
}

/**
 * Print concept results
 */
export function printConceptResult(result: ConceptResult): void {
    console.log('\n📖 System Understanding');
    console.log('═'.repeat(50));

    console.log('\n🏗️ Architecture:');
    console.log('─'.repeat(30));
    console.log(result.architecture);

    if (result.components.length > 0) {
        console.log('\n🧩 Key Components:');
        console.log('─'.repeat(30));
        for (const comp of result.components) {
            console.log(`\n   📦 ${comp.name} (${comp.file})`);
            console.log(`      ${comp.purpose}`);
            if (comp.dependencies.length > 0) {
                console.log(`      → Uses: ${comp.dependencies.join(', ')}`);
            }
        }
    }

    console.log('\n🔄 Data Flow:');
    console.log('─'.repeat(30));
    console.log(result.dataFlow);

    if (result.keyInsights.length > 0) {
        console.log('\n💡 Key Insights:');
        console.log('─'.repeat(30));
        for (const insight of result.keyInsights) {
            console.log(`   • ${insight}`);
        }
    }

    console.log('\n📝 Summary:');
    console.log('─'.repeat(30));
    console.log(`   ${result.summary}`);
}

/**
 * Main concept mode entry point
 */
export async function concept(
    targetPath?: string
): Promise<ConceptResult> {
    const projectPath = targetPath || process.cwd();

    console.log(`\n📂 Scanning: ${projectPath}`);

    // Scan repository
    const scannedFiles = await scanRepository(projectPath);

    if (scannedFiles.length === 0) {
        throw new Error('No code files found. Make sure the path contains .ts, .js, or .wgsl files.');
    }

    const files: FileContent[] = scannedFiles.map(f => ({
        path: f.path,
        content: f.content,
        extension: f.extension
    }));

    // Run concept analysis
    const result = await runConceptMode(files);

    // Print results
    printConceptResult(result);

    return result;
}
