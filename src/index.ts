/**
 * Free AI Agent - Multi-Mode Entry Point
 * 
 * Modes:
 *   chat    - Interactive prompt-based conversation
 *   debug   - Analyze errors and provide fixes
 *   concept - Explain system architecture
 *   feature - Plan new feature implementation
 *   analyze - Full 5-step bug analysis (default)
 * 
 * Usage:
 *   npx ts-node src/index.ts --mode chat --path ./project
 *   npx ts-node src/index.ts --mode debug --error "error message"
 *   npx ts-node src/index.ts --mode concept --path ./src
 *   npx ts-node src/index.ts --mode feature --request "Add feature"
 *   npx ts-node src/index.ts (interactive analyze mode)
 */

import { runAgentLoop } from './agent/loop';
import { debug } from './modes/debug';
import { concept } from './modes/concept';
import { feature } from './modes/feature';
import { runChatMode } from './modes/chat';
import { checkOllamaHealth } from './llm/ollama';

// ============================================
// CLI ARGUMENT PARSING
// ============================================

function parseArgs(): {
    mode: string;
    error?: string;
    path?: string;
    request?: string;
    files?: string[];
} {
    const args = process.argv.slice(2);

    const getArg = (flag: string): string | undefined => {
        const index = args.indexOf(flag);
        return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
    };

    const getFiles = (): string[] => {
        const index = args.indexOf('--files');
        if (index === -1) return [];

        const files: string[] = [];
        for (let i = index + 1; i < args.length; i++) {
            if (args[i].startsWith('--')) break;
            files.push(args[i]);
        }
        return files;
    };

    return {
        mode: getArg('--mode') || 'analyze',
        error: getArg('--error'),
        path: getArg('--path'),
        request: getArg('--request'),
        files: getFiles()
    };
}

function printUsage(): void {
    console.log(`
🤖 Free AI Agent - Multi-Mode CLI

Usage:
  npx ts-node src/index.ts [--mode <mode>] [options]

Modes:
  chat      Interactive prompt-based conversation 💬
  debug     Analyze errors and provide detailed fixes
  concept   Explain system architecture like a teammate
  feature   Plan new feature implementation
  analyze   Full 5-step bug analysis (default)

Options:
  --mode <mode>      Select agent mode
  --error <text>     Error message to analyze (debug/analyze mode)
  --path <path>      Project path to analyze (concept/feature mode)
  --request <text>   Feature request description (feature mode)
  --files <files>    Specific files to analyze (space-separated)

Examples:
  npx ts-node src/index.ts --mode debug --error "bindGroupLayout mismatch"
  npx ts-node src/index.ts --mode concept --path ./src
  npx ts-node src/index.ts --mode feature --request "Add global illumination"
  npx ts-node src/index.ts (interactive mode)
`);
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('');
    console.log('🚀 Free AI Agent');
    console.log('═'.repeat(50));

    // Check Ollama connection
    console.log('🔌 Checking Ollama...');
    const isHealthy = await checkOllamaHealth();

    if (!isHealthy) {
        console.error('❌ Ollama is not running!');
        console.error('   Start it with: ollama serve');
        process.exit(1);
    }
    console.log('   ✅ Connected!\n');

    // Parse arguments
    const { mode, error, path: projectPath, request, files } = parseArgs();

    try {
        switch (mode) {
            case 'chat':
                await runChatMode(projectPath);
                return; // Chat mode handles its own exit

            case 'debug':
                if (!error) {
                    console.error('❌ Debug mode requires --error flag');
                    console.error('   Example: --mode debug --error "TypeError: x is undefined"');
                    process.exit(1);
                }
                await debug(error, projectPath, files);
                break;

            case 'concept':
                await concept(projectPath);
                break;

            case 'feature':
                if (!request) {
                    console.error('❌ Feature mode requires --request flag');
                    console.error('   Example: --mode feature --request "Add dark mode"');
                    process.exit(1);
                }
                await feature(request, projectPath);
                break;

            case 'analyze':
            default:
                // Full agent loop (interactive)
                const result = await runAgentLoop();

                console.log('\n📊 Summary');
                console.log('─'.repeat(30));
                console.log(`   Files analyzed: ${result.files.length}`);
                console.log(`   Bug severity: ${result.analysis.severity}`);
                console.log(`   Fixes suggested: ${result.fixes.length}`);
                break;
        }

        console.log('\n✅ Done!');

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

// Show usage if --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    process.exit(0);
}

main();
