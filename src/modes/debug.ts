/**
 * Debug Mode - Analyze errors and provide detailed fix guidance
 * 
 * Output:
 * - Error meaning
 * - Which file
 * - Which function
 * - Why it happens
 * - What to change
 */

import { FileContent, findRelatedFiles, ProblemInput } from '../agent/reader';
import { queryOllama } from '../llm/ollama';
import * as path from 'path';

// ============================================
// INTERFACES
// ============================================

export interface DebugResult {
    errorMeaning: string;     // What does this error mean?
    file: string;             // Which file has the bug?
    function: string;         // Which function?
    line?: number;            // Which line (if known)?
    whyItHappens: string;     // Root cause explanation
    whatToChange: string;     // Specific fix instructions
    codeExample?: string;     // Example fix code
}

// ============================================
// DEBUG MODE
// ============================================

/**
 * Run debug analysis on an error
 */
export async function runDebugMode(
    errorMessage: string,
    files: FileContent[]
): Promise<DebugResult> {
    console.log('\n🐛 Debug Mode - Analyzing Error');
    console.log('═'.repeat(50));
    console.log(`Error: ${errorMessage}`);
    console.log('─'.repeat(50));

    // Prepare code context
    const codeContext = files
        .slice(0, 5)
        .map(f => `--- ${path.basename(f.path)} ---\n${f.content}`)
        .join('\n\n');

    const prompt = `You are a senior software engineer debugging an error. Analyze this error and provide a precise diagnosis.

## Error Message
${errorMessage}

## Related Code (${files.length} files)
${codeContext}

## Your Analysis
Provide a JSON response with this EXACT structure:
{
    "errorMeaning": "Clear explanation of what this error means in plain terms",
    "file": "The specific filename where the bug is (e.g., Renderer.ts)",
    "function": "The specific function name containing the bug",
    "line": null,
    "whyItHappens": "Detailed explanation of WHY this error is happening - the root cause",
    "whatToChange": "Step-by-step instructions on exactly what to change to fix this",
    "codeExample": "// Example fixed code snippet"
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown code blocks
- Be SPECIFIC about the file and function
- Make whatToChange actionable and clear`;

    try {
        const response = await queryOllama(prompt);

        // Parse JSON response
        try {
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(cleanResponse);

            return {
                errorMeaning: parsed.errorMeaning || 'Unable to determine',
                file: parsed.file || 'Unknown file',
                function: parsed.function || 'Unknown function',
                line: parsed.line || undefined,
                whyItHappens: parsed.whyItHappens || 'See analysis',
                whatToChange: parsed.whatToChange || 'See suggestions',
                codeExample: parsed.codeExample || undefined
            };
        } catch (parseError) {
            // Fallback if JSON parsing fails
            return {
                errorMeaning: response,
                file: files[0]?.path || 'Unknown',
                function: 'See analysis',
                whyItHappens: 'See error meaning above',
                whatToChange: 'Review the analysis for fix suggestions'
            };
        }
    } catch (error) {
        console.error('❌ Debug analysis failed:', error);
        throw new Error('Failed to analyze error. Make sure Ollama is running.');
    }
}

/**
 * Print debug results in formatted output
 */
export function printDebugResult(result: DebugResult): void {
    console.log('\n📋 Debug Analysis Results');
    console.log('═'.repeat(50));

    console.log('\n❓ Error Meaning:');
    console.log('─'.repeat(30));
    console.log(result.errorMeaning);

    console.log('\n📁 Location:');
    console.log('─'.repeat(30));
    console.log(`   File: ${result.file}`);
    console.log(`   Function: ${result.function}`);
    if (result.line) {
        console.log(`   Line: ${result.line}`);
    }

    console.log('\n🔍 Why It Happens:');
    console.log('─'.repeat(30));
    console.log(result.whyItHappens);

    console.log('\n🔧 What To Change:');
    console.log('─'.repeat(30));
    console.log(result.whatToChange);

    if (result.codeExample) {
        console.log('\n💻 Code Example:');
        console.log('─'.repeat(30));
        console.log(result.codeExample);
    }
}

/**
 * Main debug mode entry point
 */
export async function debug(
    errorMessage: string,
    basePath?: string,
    filePaths?: string[]
): Promise<DebugResult> {
    const problem: ProblemInput = {
        description: errorMessage,
        errorLog: errorMessage,
        filePaths,
        basePath: basePath || process.cwd()
    };

    // Find related files
    const files = await findRelatedFiles(problem);

    if (files.length === 0) {
        throw new Error('No files found to analyze. Specify files with --files or provide a project path.');
    }

    // Run debug analysis
    const result = await runDebugMode(errorMessage, files);

    // Print results
    printDebugResult(result);

    return result;
}
