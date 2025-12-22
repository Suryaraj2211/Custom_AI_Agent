/**
 * Repository Scanner - Walks folder and reads .ts, .js, .wgsl files
 * No AI - just pure file reading
 */

import * as fs from 'fs';
import * as path from 'path';

// Output format
export interface ScannedFile {
    file: string;      // filename (e.g., "Renderer.ts")
    path: string;      // full path
    content: string;   // file content
    extension: string; // .ts, .js, .wgsl
}

// Folders to skip
const IGNORED_DIRS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '__pycache__'
];

// Supported file types
const SUPPORTED_EXTENSIONS = ['.ts', '.js', '.wgsl', '.html', '.css', '.json', '.glsl'];

/**
 * Scan repository and return all matching files with content
 * 
 * @param rootPath - Directory to scan
 * @returns Array of scanned files with content
 * 
 * @example
 * const files = await scanRepository('./src');
 * // Returns:
 * // [
 * //   { file: "Renderer.ts", path: "...", content: "...", extension: ".ts" },
 * //   { file: "Pipeline.ts", path: "...", content: "...", extension: ".ts" }
 * // ]
 */
export async function scanRepository(rootPath: string): Promise<ScannedFile[]> {
    const absolutePath = path.resolve(rootPath);
    console.log(`\n📂 Scanning: ${absolutePath}`);
    console.log('─'.repeat(50));

    const files: ScannedFile[] = [];

    await walkDirectory(absolutePath, files);

    console.log(`\n✅ Found ${files.length} files`);
    console.log('─'.repeat(50));

    // Print summary
    const byExtension = files.reduce((acc, f) => {
        acc[f.extension] = (acc[f.extension] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    for (const [ext, count] of Object.entries(byExtension)) {
        console.log(`   ${ext}: ${count} files`);
    }

    return files;
}

/**
 * Recursively walk directory and collect files
 */
async function walkDirectory(dirPath: string, files: ScannedFile[]): Promise<void> {
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                // Skip ignored directories
                if (!IGNORED_DIRS.includes(entry.name)) {
                    await walkDirectory(fullPath, files);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();

                // Only process supported extensions
                if (SUPPORTED_EXTENSIONS.includes(ext)) {
                    try {
                        const content = await fs.promises.readFile(fullPath, 'utf-8');

                        files.push({
                            file: entry.name,
                            path: fullPath,
                            content: content,
                            extension: ext
                        });

                        console.log(`   📄 ${entry.name}`);
                    } catch (readError) {
                        console.warn(`   ⚠️ Could not read: ${entry.name}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`❌ Error scanning ${dirPath}:`, error);
    }
}

/**
 * Get just filenames (useful for debugging)
 */
export function getFileList(files: ScannedFile[]): string[] {
    return files.map(f => f.file);
}

/**
 * Print files in a nice format for debugging
 */
export function printScannedFiles(files: ScannedFile[]): void {
    console.log('\n📋 Scanned Files:');
    console.log('─'.repeat(50));

    for (const file of files) {
        const lines = file.content.split('\n').length;
        console.log(`   ${file.file} (${lines} lines)`);
    }
}
