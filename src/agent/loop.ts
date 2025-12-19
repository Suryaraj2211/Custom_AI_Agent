/**
 * Agent Loop - Orchestrates the 5-step bug analysis cycle
 * 
 * Flow:
 * 1. Read problem (user input)
 * 2. Find related files (smart discovery)
 * 3. Analyze logic (AI reasoning)
 * 4. Explain bug (root cause)
 * 5. Suggest fix (actionable solutions)
 */

import { readProblem, findRelatedFiles, FileContent, ProblemInput } from './reader';
import { analyzeBugLogic, printBugAnalysis, BugAnalysis } from './analyzer';
import { suggestFix, printFixSuggestions, FixSuggestion } from './suggester';
import { checkOllamaHealth } from '../llm/ollama';

// ============================================
// RESULT INTERFACE
// ============================================

export interface AgentResult {
    problem: ProblemInput;
    files: FileContent[];
    analysis: BugAnalysis;
    fixes: FixSuggestion[];
}

// ============================================
// MAIN AGENT LOOP
// ============================================

/**
 * Run the full 5-step agent loop
 */
export async function runAgentLoop(): Promise<AgentResult> {
    console.log('\n🤖 AI Bug Analyzer Agent');
    console.log('═'.repeat(50));
    console.log('5-Step Flow: Read → Find → Analyze → Explain → Fix');
    console.log('═'.repeat(50));

    // Pre-check: Ollama connection
    console.log('\n🔌 Checking Ollama connection...');
    const isHealthy = await checkOllamaHealth();

    if (!isHealthy) {
        console.error('❌ Ollama is not running!');
        console.error('   Start it with: ollama serve');
        throw new Error('Ollama is not running. Start it with: ollama serve');
    }
    console.log('   ✅ Ollama connected!\n');

    // ============================================
    // STEP 1: READ PROBLEM
    // ============================================
    console.log('📌 STEP 1: Reading problem...');
    console.log('─'.repeat(30));

    const problem = await readProblem();

    console.log(`   Problem: ${problem.description.substring(0, 50)}...`);
    console.log(`   Path: ${problem.basePath}`);

    // ============================================
    // STEP 2: FIND RELATED FILES
    // ============================================
    console.log('\n📌 STEP 2: Finding related files...');
    console.log('─'.repeat(30));

    const files = await findRelatedFiles(problem);

    if (files.length === 0) {
        throw new Error('No files found. Please specify files or provide a path with code.');
    }

    console.log(`   Found ${files.length} relevant file(s)`);

    // ============================================
    // STEP 3 & 4: ANALYZE + EXPLAIN
    // ============================================
    console.log('\n📌 STEP 3 & 4: Analyzing logic & explaining bug...');
    console.log('─'.repeat(30));

    const analysis = await analyzeBugLogic(problem, files);

    // Print analysis results
    printBugAnalysis(analysis);

    // ============================================
    // STEP 5: SUGGEST FIX
    // ============================================
    console.log('\n📌 STEP 5: Generating fix suggestions...');
    console.log('─'.repeat(30));

    const fixes = await suggestFix(analysis, files);

    // Print fix suggestions
    printFixSuggestions(fixes);

    // ============================================
    // COMPLETE
    // ============================================
    console.log('\n═'.repeat(50));
    console.log('✅ Agent cycle complete!');
    console.log('═'.repeat(50));

    return {
        problem,
        files,
        analysis,
        fixes
    };
}

/**
 * Run agent with specific problem input (non-interactive)
 */
export async function runAgentWithInput(
    description: string,
    filePaths?: string[],
    basePath?: string
): Promise<AgentResult> {
    const problem: ProblemInput = {
        description,
        errorLog: description,
        filePaths,
        basePath: basePath || process.cwd()
    };

    console.log('\n🤖 AI Bug Analyzer Agent');
    console.log('═'.repeat(50));

    // Check Ollama
    const isHealthy = await checkOllamaHealth();
    if (!isHealthy) {
        throw new Error('Ollama is not running. Start it with: ollama serve');
    }

    // Find files
    const files = await findRelatedFiles(problem);

    // Analyze
    const analysis = await analyzeBugLogic(problem, files);
    printBugAnalysis(analysis);

    // Suggest
    const fixes = await suggestFix(analysis, files);
    printFixSuggestions(fixes);

    console.log('\n✅ Agent cycle complete!');

    return { problem, files, analysis, fixes };
}
