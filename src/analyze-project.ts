/**
 * Project Analyzer - Scan entire project and find issues in each file
 * 
 * Usage: 
 *   npx ts-node src/analyze-project.ts --path ./project
 *   Or via web UI: /api/analyze/project
 */

import { scanRepository } from './repo/scan';
import { queryWithDomain } from './llm/ollama';
import { checkOllamaHealth } from './llm/ollama';
import { detectFromFile, DomainType } from './knowledge';

// ============================================
// TYPES
// ============================================

export interface FileIssue {
    file: string;
    path: string;
    domain: DomainType;
    severity: 'error' | 'warning' | 'info';
    line?: number;
    issue: string;
    suggestion: string;
}

export interface ProjectAnalysis {
    projectPath: string;
    totalFiles: number;
    filesAnalyzed: number;
    issues: FileIssue[];
    summary: string;
}

// ============================================
// ANALYZER
// ============================================

export async function analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    console.log('\n🔍 Project Issue Scanner');
    console.log('═'.repeat(50));
    console.log(`📂 Scanning: ${projectPath}`);

    // Scan all files
    const files = await scanRepository(projectPath);
    console.log(`\n✅ Found ${files.length} files`);

    const issues: FileIssue[] = [];
    let filesAnalyzed = 0;

    // Analyze each file (limit to first 10 for speed)
    const filesToAnalyze = files.slice(0, 10);

    for (const file of filesToAnalyze) {
        console.log(`\n📄 Analyzing: ${file.file}`);

        try {
            const fileIssues = await analyzeFile(file.path, file.content);
            issues.push(...fileIssues);
            filesAnalyzed++;

            if (fileIssues.length > 0) {
                console.log(`   ⚠️ Found ${fileIssues.length} issues`);
            } else {
                console.log(`   ✅ No issues`);
            }
        } catch (e) {
            console.log(`   ❌ Error analyzing`);
        }
    }

    // Generate summary
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    const summary = `Analyzed ${filesAnalyzed}/${files.length} files. Found ${errorCount} errors, ${warningCount} warnings.`;

    console.log('\n' + '═'.repeat(50));
    console.log(`📊 Summary: ${summary}`);

    return {
        projectPath,
        totalFiles: files.length,
        filesAnalyzed,
        issues,
        summary
    };
}

async function analyzeFile(filePath: string, content: string): Promise<FileIssue[]> {
    // Detect domain
    const detection = detectFromFile(filePath, content);

    // Skip very small files
    if (content.length < 50) return [];

    // Truncate large files
    const truncatedContent = content.substring(0, 2000);

    const prompt = `Analyze this code for issues, bugs, and improvements.

File: ${filePath}

Code:
\`\`\`
${truncatedContent}
\`\`\`

Return a JSON array of issues found. Each issue should have:
- severity: "error" | "warning" | "info"
- line: approximate line number (or null)
- issue: brief description of the problem
- suggestion: how to fix it

If no issues found, return empty array: []

Example response:
[
  {"severity": "warning", "line": 15, "issue": "Unused variable", "suggestion": "Remove or use the variable"},
  {"severity": "error", "line": 42, "issue": "Possible null reference", "suggestion": "Add null check"}
]

Return ONLY valid JSON, no explanation.`;

    try {
        const { response, domain } = await queryWithDomain(prompt, filePath, content);

        // Parse JSON from response
        const parsed = parseJsonFromResponse(response);

        if (Array.isArray(parsed)) {
            return parsed.map(issue => ({
                file: filePath.split(/[/\\]/).pop() || filePath,
                path: filePath,
                domain,
                severity: issue.severity || 'info',
                line: issue.line,
                issue: issue.issue || 'Unknown issue',
                suggestion: issue.suggestion || 'Review this code'
            }));
        }
    } catch (e) {
        // AI parsing failed, return empty
    }

    return [];
}

function parseJsonFromResponse(response: string): any {
    try {
        // Try direct parse
        return JSON.parse(response);
    } catch {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {
                return [];
            }
        }
    }
    return [];
}

// ============================================
// CLI
// ============================================

async function main() {
    const args = process.argv.slice(2);
    const pathIndex = args.indexOf('--path');
    const projectPath = pathIndex !== -1 ? args[pathIndex + 1] : process.cwd();

    console.log('');
    console.log('🤖 AI Project Issue Scanner');
    console.log('═'.repeat(50));

    // Check Ollama
    const healthy = await checkOllamaHealth();
    if (!healthy) {
        console.error('❌ Ollama not running! Run: ollama serve');
        process.exit(1);
    }
    console.log('🔌 Ollama: Connected\n');

    const result = await analyzeProject(projectPath);

    // Print issues
    if (result.issues.length > 0) {
        console.log('\n📋 Issues Found:');
        console.log('─'.repeat(50));

        for (const issue of result.issues) {
            const icon = issue.severity === 'error' ? '❌' :
                issue.severity === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`\n${icon} ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
            console.log(`   Issue: ${issue.issue}`);
            console.log(`   Fix: ${issue.suggestion}`);
        }
    }

    console.log('\n✅ Done!');
}

// Run if called directly
if (require.main === module) {
    main();
}
