/**
 * Dependency Analyzer - Parses imports and builds file dependency map
 * No AI - just import statement parsing
 */

import * as path from 'path';
import { ScannedFile } from './scan';

// Dependency map type
export interface DependencyMap {
    [file: string]: string[];  // file → [imported files]
}

// Detailed dependency info
export interface FileDependency {
    file: string;
    imports: ImportInfo[];
    dependsOn: string[];      // resolved filenames
}

export interface ImportInfo {
    raw: string;              // original import statement
    module: string;           // imported module path
    isRelative: boolean;      // true if ./something or ../something
    isPackage: boolean;       // true if node_modules package
}

/**
 * Build dependency map from scanned files
 * 
 * @param files - Array of scanned files
 * @returns Map of file → dependencies
 * 
 * @example
 * const map = buildDependencyMap(files);
 * // Returns:
 * // {
 * //   "Renderer.ts": ["Pipeline.ts", "Shader.ts"],
 * //   "Pipeline.ts": ["Shader.ts"]
 * // }
 */
export function buildDependencyMap(files: ScannedFile[]): DependencyMap {
    console.log('\n🔗 Building dependency map...');
    console.log('─'.repeat(50));

    const dependencyMap: DependencyMap = {};
    const fileNames = new Set(files.map(f => f.file));

    for (const file of files) {
        const imports = parseImports(file.content);
        const dependencies: string[] = [];

        for (const imp of imports) {
            if (imp.isRelative) {
                // Try to resolve to actual file
                const resolved = resolveImport(imp.module, fileNames);
                if (resolved) {
                    dependencies.push(resolved);
                }
            }
        }

        dependencyMap[file.file] = dependencies;

        if (dependencies.length > 0) {
            console.log(`   ${file.file} → ${dependencies.join(', ')}`);
        }
    }

    console.log('─'.repeat(50));
    console.log(`✅ Mapped ${Object.keys(dependencyMap).length} files\n`);

    return dependencyMap;
}

/**
 * Parse import statements from file content
 * Handles:
 *   - import { x } from './file'
 *   - import x from './file'
 *   - import './file'
 *   - import * as x from './file'
 *   - const x = require('./file')
 */
export function parseImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
            continue;
        }

        // ES6 import patterns
        // import { x } from 'module'
        // import x from 'module'
        // import 'module'
        // import * as x from 'module'
        const importMatch = trimmed.match(/^import\s+.*?from\s+['"](.+?)['"]|^import\s+['"](.+?)['"]/);

        if (importMatch) {
            const modulePath = importMatch[1] || importMatch[2];
            imports.push(createImportInfo(trimmed, modulePath));
            continue;
        }

        // CommonJS require pattern
        // const x = require('module')
        // require('module')
        const requireMatch = trimmed.match(/require\s*\(\s*['"](.+?)['"]\s*\)/);

        if (requireMatch) {
            imports.push(createImportInfo(trimmed, requireMatch[1]));
        }
    }

    return imports;
}

/**
 * Create ImportInfo object from parsed data
 */
function createImportInfo(raw: string, modulePath: string): ImportInfo {
    const isRelative = modulePath.startsWith('./') || modulePath.startsWith('../');

    return {
        raw: raw,
        module: modulePath,
        isRelative: isRelative,
        isPackage: !isRelative
    };
}

/**
 * Try to resolve import path to actual filename
 */
function resolveImport(modulePath: string, existingFiles: Set<string>): string | null {
    // Get the base name from path (e.g., './utils/Pipeline' → 'Pipeline')
    const baseName = path.basename(modulePath);

    // Try exact match
    if (existingFiles.has(baseName)) {
        return baseName;
    }

    // Try with extensions
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.wgsl'];
    for (const ext of extensions) {
        const withExt = baseName + ext;
        if (existingFiles.has(withExt)) {
            return withExt;
        }
    }

    // Try index file
    for (const ext of extensions) {
        const indexFile = `index${ext}`;
        if (existingFiles.has(indexFile)) {
            return indexFile;
        }
    }

    return null;
}

/**
 * Get detailed dependency analysis for a single file
 */
export function analyzeFileDependencies(file: ScannedFile, allFiles: ScannedFile[]): FileDependency {
    const fileNames = new Set(allFiles.map(f => f.file));
    const imports = parseImports(file.content);

    const dependsOn = imports
        .filter(imp => imp.isRelative)
        .map(imp => resolveImport(imp.module, fileNames))
        .filter((f): f is string => f !== null);

    return {
        file: file.file,
        imports: imports,
        dependsOn: dependsOn
    };
}

/**
 * Print dependency map in a nice format for debugging
 */
export function printDependencyMap(map: DependencyMap): void {
    console.log('\n🔍 Dependency Map:');
    console.log('═'.repeat(50));

    for (const [file, deps] of Object.entries(map)) {
        if (deps.length > 0) {
            console.log(`\n📄 ${file}`);
            for (const dep of deps) {
                console.log(`   └─ ${dep}`);
            }
        }
    }

    console.log('\n' + '═'.repeat(50));
}

/**
 * Find files that import a specific file (reverse dependencies)
 */
export function findDependents(targetFile: string, map: DependencyMap): string[] {
    const dependents: string[] = [];

    for (const [file, deps] of Object.entries(map)) {
        if (deps.includes(targetFile)) {
            dependents.push(file);
        }
    }

    return dependents;
}
