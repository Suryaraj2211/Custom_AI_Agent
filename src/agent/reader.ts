/**
 * Reader - Reads problem input and finds related files
 * Step 1 & 2 of Agent Loop
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { scanRepository, ScannedFile } from '../repo/scan';

// ============================================
// INTERFACES
// ============================================

export interface ProblemInput {
    description: string;     // Bug/error description
    errorLog?: string;       // Stack trace (optional)
    filePaths?: string[];    // Manual file paths (optional)
    basePath: string;        // Project root
}

export interface FileContent {
    path: string;
    content: string;
    extension: string;
}

// ============================================
// STEP 1: READ PROBLEM
// ============================================

/**
 * Read problem from command line arguments
 */
export function readProblemFromArgs(): ProblemInput | null {
    const args = process.argv.slice(2);

    // Find --error or --problem flag
    const errorIndex = args.indexOf('--error');
    const problemIndex = args.indexOf('--problem');
    const descIndex = errorIndex !== -1 ? errorIndex : problemIndex;

    if (descIndex === -1 || !args[descIndex + 1]) {
        return null;
    }

    const description = args[descIndex + 1];

    // Find --files flag (optional)
    const filesIndex = args.indexOf('--files');
    let filePaths: string[] = [];

    if (filesIndex !== -1) {
        for (let i = filesIndex + 1; i < args.length; i++) {
            if (args[i].startsWith('--')) break;
            filePaths.push(args[i]);
        }
    }

    // Find --path flag (optional)
    const pathIndex = args.indexOf('--path');
    const basePath = pathIndex !== -1 && args[pathIndex + 1]
        ? args[pathIndex + 1]
        : process.cwd();

    return {
        description,
        errorLog: description, // Same for now
        filePaths: filePaths.length > 0 ? filePaths : undefined,
        basePath
    };
}

/**
 * Read problem interactively from stdin
 */
export async function readProblemInteractive(): Promise<ProblemInput> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt: string): Promise<string> =>
        new Promise(resolve => rl.question(prompt, resolve));

    console.log('\n🐛 AI Bug Analyzer');
    console.log('═'.repeat(50));

    const description = await question('\n📝 Describe the bug/error:\n> ');

    const errorLogAnswer = await question('\n📋 Paste error log (or press Enter to skip):\n> ');
    const errorLog = errorLogAnswer.trim() || undefined;

    const filesAnswer = await question('\n📂 Related files (comma-separated, or Enter to auto-detect):\n> ');
    const filePaths = filesAnswer.trim()
        ? filesAnswer.split(',').map(f => f.trim())
        : undefined;

    const pathAnswer = await question('\n📁 Project path (Enter for current dir):\n> ');
    const basePath = pathAnswer.trim() || process.cwd();

    rl.close();

    return {
        description,
        errorLog,
        filePaths,
        basePath
    };
}

/**
 * Main function to get problem input
 */
export async function readProblem(): Promise<ProblemInput> {
    // Try command line args first
    const argsInput = readProblemFromArgs();

    if (argsInput) {
        console.log('📥 Problem loaded from command line');
        return argsInput;
    }

    // Fall back to interactive mode
    return readProblemInteractive();
}

// ============================================
// STEP 2: FIND RELATED FILES
// ============================================

/**
 * Extract file paths from error stacktrace
 */
function extractFilesFromError(errorLog: string): string[] {
    // Match file paths in stacktrace
    const patterns = [
        /at\s+.*?\((.+?\.(ts|js|tsx|jsx)):\d+:\d+\)/g,  // at Function (/path/file.ts:10:5)
        /at\s+(.+?\.(ts|js|tsx|jsx)):\d+:\d+/g,         // at /path/file.ts:10:5
        /([a-zA-Z]:\\[^:]+\.(ts|js|tsx|jsx))/g,        // Windows paths
        /([\/][^:\s]+\.(ts|js|tsx|jsx))/g              // Unix paths
    ];

    const matches: string[] = [];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(errorLog)) !== null) {
            matches.push(match[1]);
        }
    }

    return [...new Set(matches)]; // Unique paths
}

/**
 * Smart file finder - finds related files based on problem
 */
export async function findRelatedFiles(problem: ProblemInput): Promise<FileContent[]> {
    console.log('\n🔍 Finding related files...');

    const files: FileContent[] = [];

    // Option 1: Use manually specified files
    if (problem.filePaths && problem.filePaths.length > 0) {
        console.log('   Using specified files...');

        for (const filePath of problem.filePaths.slice(0, 5)) {
            try {
                const absolutePath = path.isAbsolute(filePath)
                    ? filePath
                    : path.join(problem.basePath, filePath);

                if (fs.existsSync(absolutePath)) {
                    const content = fs.readFileSync(absolutePath, 'utf-8');
                    files.push({
                        path: absolutePath,
                        content,
                        extension: path.extname(absolutePath)
                    });
                    console.log(`   ✅ ${path.basename(absolutePath)}`);
                }
            } catch (e) {
                console.log(`   ⚠️ Could not load: ${filePath}`);
            }
        }

        return files;
    }

    // Option 2: Extract from error stacktrace
    if (problem.errorLog) {
        console.log('   Extracting from stacktrace...');
        const errorFiles = extractFilesFromError(problem.errorLog);

        for (const filePath of errorFiles.slice(0, 5)) {
            try {
                const absolutePath = path.isAbsolute(filePath)
                    ? filePath
                    : path.join(problem.basePath, filePath);

                if (fs.existsSync(absolutePath)) {
                    const content = fs.readFileSync(absolutePath, 'utf-8');
                    files.push({
                        path: absolutePath,
                        content,
                        extension: path.extname(absolutePath)
                    });
                    console.log(`   ✅ ${path.basename(absolutePath)}`);
                }
            } catch (e) { /* skip */ }
        }

        if (files.length > 0) return files;
    }

    // Option 3: Scan and find relevant files by keyword matching
    console.log('   Scanning project for relevant files...');
    const allFiles = await scanRepository(problem.basePath);

    // Search for files containing keywords from description
    const keywords = problem.description
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3);

    const scoredFiles = allFiles.map(f => {
        let score = 0;
        const lowerContent = f.content.toLowerCase();

        for (const keyword of keywords) {
            if (lowerContent.includes(keyword)) score++;
            if (f.file.toLowerCase().includes(keyword)) score += 2;
        }

        return { file: f, score };
    });

    // Sort by relevance and take top 5
    const relevantFiles = scoredFiles
        .filter(sf => sf.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(sf => ({
            path: sf.file.path,
            content: sf.file.content,
            extension: sf.file.extension
        }));

    if (relevantFiles.length > 0) {
        for (const f of relevantFiles) {
            console.log(`   ✅ ${path.basename(f.path)}`);
        }
        return relevantFiles;
    }

    // Fallback: just take first 3 files
    console.log('   Using first few project files...');
    return allFiles.slice(0, 3).map(f => ({
        path: f.path,
        content: f.content,
        extension: f.extension
    }));
}

// ============================================
// LEGACY SUPPORT
// ============================================

/**
 * Legacy function for backward compatibility
 */
export async function readFiles(targetPath?: string): Promise<FileContent[]> {
    console.log('📖 Reading files...');
    const files = await scanRepository(targetPath || process.cwd());
    return files.map(f => ({
        path: f.path,
        content: f.content,
        extension: f.extension
    }));
}
