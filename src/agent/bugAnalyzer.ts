/**
 * Bug Analyzer - Selects relevant files and analyzes bugs
 * Only sends 3-5 files to Ollama, not full repo!
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeBug, BugFile } from '../llm/ollama';

/**
 * Select relevant files based on error stacktrace
 * Extracts file paths from error message and loads them
 */
export function selectRelevantFiles(
    errorLog: string,
    basePath: string = process.cwd()
): BugFile[] {
    console.log('📂 Selecting relevant files from error...');

    // Extract file paths from error stacktrace
    // Matches patterns like: at Function (/path/to/file.ts:10:5)
    // Or: /path/to/file.ts:10
    const filePattern = /([a-zA-Z]:\\[^:]+\.(ts|js|tsx|jsx))|([\/][^:]+\.(ts|js|tsx|jsx))/g;
    const matches = errorLog.match(filePattern) || [];

    // Get unique file paths
    const uniquePaths = [...new Set(matches)].slice(0, 5);

    console.log(`   Found ${uniquePaths.length} files in stacktrace`);

    const files: BugFile[] = [];

    for (const filePath of uniquePaths) {
        try {
            const absolutePath = path.isAbsolute(filePath)
                ? filePath
                : path.join(basePath, filePath);

            if (fs.existsSync(absolutePath)) {
                const content = fs.readFileSync(absolutePath, 'utf-8');
                files.push({
                    path: absolutePath,
                    content: content
                });
                console.log(`   ✅ Loaded: ${path.basename(absolutePath)}`);
            }
        } catch (error) {
            console.log(`   ⚠️ Could not load: ${filePath}`);
        }
    }

    return files;
}

/**
 * Load specific files by path
 */
export function loadFiles(filePaths: string[]): BugFile[] {
    console.log(`📂 Loading ${filePaths.length} files...`);

    const files: BugFile[] = [];

    for (const filePath of filePaths.slice(0, 5)) { // Max 5 files
        try {
            const absolutePath = path.resolve(filePath);

            if (fs.existsSync(absolutePath)) {
                const content = fs.readFileSync(absolutePath, 'utf-8');
                files.push({
                    path: absolutePath,
                    content: content
                });
                console.log(`   ✅ ${path.basename(absolutePath)}`);
            } else {
                console.log(`   ❌ Not found: ${filePath}`);
            }
        } catch (error) {
            console.log(`   ⚠️ Error loading: ${filePath}`);
        }
    }

    return files;
}

/**
 * Main bug analysis function
 * Combines file selection with Ollama analysis
 */
export async function runBugAnalysis(
    errorLog: string,
    filePaths?: string[]
): Promise<string> {
    console.log('\n🐛 Bug Analysis Started');
    console.log('═'.repeat(50));

    // Get files - either from paths or parse from error
    const files = filePaths && filePaths.length > 0
        ? loadFiles(filePaths)
        : selectRelevantFiles(errorLog);

    if (files.length === 0) {
        throw new Error('No files to analyze. Provide file paths or ensure error contains valid file references.');
    }

    console.log(`\n📤 Sending to Ollama (${files.length} files)...`);

    // Analyze with Ollama
    const analysis = await analyzeBug(errorLog, files);

    console.log('\n✅ Analysis Complete');
    console.log('═'.repeat(50));

    return analysis;
}
