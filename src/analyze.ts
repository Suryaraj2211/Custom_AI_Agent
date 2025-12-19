/**
 * CLI for Bug Analysis
 * 
 * Usage:
 *   npx ts-node src/analyze.ts --error "error message" --files file1.ts file2.ts
 *   npx ts-node src/analyze.ts --error "error message"  (auto-detect from stacktrace)
 * 
 * Example:
 *   npx ts-node src/analyze.ts --error "TypeError: Cannot read property 'x' of undefined at /src/foo.ts:10" --files src/foo.ts src/bar.ts
 */

import { runBugAnalysis } from './agent/bugAnalyzer';
import { checkOllamaHealth } from './llm/ollama';

async function main() {
    console.log('\n🔍 AI Bug Analyzer');
    console.log('═'.repeat(50));

    // Parse command line arguments
    const args = process.argv.slice(2);

    // Find --error flag
    const errorIndex = args.indexOf('--error');
    if (errorIndex === -1 || !args[errorIndex + 1]) {
        console.error('❌ Usage: npx ts-node src/analyze.ts --error "error message" [--files file1.ts file2.ts]');
        process.exit(1);
    }

    const errorLog = args[errorIndex + 1];

    // Find --files flag (optional)
    const filesIndex = args.indexOf('--files');
    let filePaths: string[] = [];

    if (filesIndex !== -1) {
        // Get all args after --files until next flag or end
        for (let i = filesIndex + 1; i < args.length; i++) {
            if (args[i].startsWith('--')) break;
            filePaths.push(args[i]);
        }
    }

    // Check Ollama is running
    console.log('🔌 Checking Ollama connection...');
    const isHealthy = await checkOllamaHealth();

    if (!isHealthy) {
        console.error('❌ Ollama is not running. Start it with: ollama serve');
        process.exit(1);
    }
    console.log('✅ Ollama connected!\n');

    try {
        // Run analysis
        const analysis = await runBugAnalysis(errorLog, filePaths);

        // Print result
        console.log('\n📋 Bug Analysis Result:');
        console.log('─'.repeat(50));
        console.log(analysis);
        console.log('─'.repeat(50));

    } catch (error) {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    }
}

main();
