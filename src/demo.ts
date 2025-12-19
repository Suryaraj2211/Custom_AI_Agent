/**
 * Demo script to test repo scanner and dependency analyzer
 * Run with: npx ts-node src/demo.ts [path]
 */

import { scanRepository, printScannedFiles, getFileList } from './repo/scan';
import { buildDependencyMap, printDependencyMap, findDependents } from './repo/dependency';

async function demo() {
    // Get path from command line or use current directory
    const targetPath = process.argv[2] || '.';

    console.log('\n🤖 Free AI Agent - Scanner Demo');
    console.log('═'.repeat(50));

    // Step 1: Scan repository
    console.log('\n📌 STEP 1: Scanning repository...');
    const files = await scanRepository(targetPath);

    // Print file list
    printScannedFiles(files);

    // Step 2: Build dependency map
    console.log('\n📌 STEP 2: Analyzing dependencies...');
    const dependencyMap = buildDependencyMap(files);

    // Print dependency map
    printDependencyMap(dependencyMap);

    // Step 3: Show sample output format
    console.log('\n📌 STEP 3: Sample JSON output:');
    console.log('─'.repeat(50));

    const sampleOutput = files.slice(0, 2).map(f => ({
        file: f.file,
        content: f.content.substring(0, 100) + '...'
    }));

    console.log(JSON.stringify(sampleOutput, null, 2));

    // Show reverse dependency example
    if (files.length > 0) {
        console.log('\n📌 Reverse Dependencies Example:');
        console.log('─'.repeat(50));

        const firstFile = files[0].file;
        const dependents = findDependents(firstFile, dependencyMap);

        console.log(`Files that import ${firstFile}:`, dependents.length > 0 ? dependents : ['None']);
    }

    console.log('\n✅ Demo complete!\n');
}

demo().catch(console.error);
