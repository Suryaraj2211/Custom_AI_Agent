/**
 * Analyzer - Analyzes code logic and explains bugs
 * Step 3 & 4 of Agent Loop
 */

import { FileContent, ProblemInput } from './reader';
import { queryOllama } from '../llm/ollama';

// ============================================
// INTERFACES
// ============================================

export interface BugAnalysis {
    bugExplanation: string;      // What is the bug?
    rootCause: string;           // Why is it happening?
    affectedCode: string[];      // Which files/functions affected?
    severity: 'low' | 'medium' | 'high' | 'critical';
    summary: string;             // Short summary for suggester
}

export interface CodeAnalysis {
    summary: string;
    patterns: string[];
    issues: string[];
    dependencies: string[];
}

// ============================================
// STEP 3 & 4: ANALYZE LOGIC + EXPLAIN BUG
// ============================================

/**
 * Analyze bug and explain root cause
 * Uses senior software engineer prompt style
 */
export async function analyzeBugLogic(
    problem: ProblemInput,
    files: FileContent[]
): Promise<BugAnalysis> {
    console.log('\n🔬 Analyzing bug logic...');

    // Prepare code context (max 5 files)
    const codeContext = files
        .slice(0, 5)
        .map(f => `--- ${f.path} ---\n${f.content}`)
        .join('\n\n');

    const prompt = `You are a senior software engineer. Analyze this bug and provide a structured explanation.

## Problem Description
${problem.description}

## Error Log
${problem.errorLog || 'No error log provided'}

## Related Code (${files.length} files)
${codeContext}

## Your Analysis
Provide a JSON response with this exact structure:
{
    "bugExplanation": "Clear explanation of what the bug is",
    "rootCause": "Why this bug is happening - the root cause",
    "affectedCode": ["file1.ts:functionName", "file2.ts:line 10-20"],
    "severity": "low|medium|high|critical",
    "summary": "One-line summary of the issue"
}

IMPORTANT: Return ONLY the JSON object, no markdown code blocks, no extra text.`;

    try {
        const response = await queryOllama(prompt);

        // Try to parse JSON from response
        try {
            // Clean response - remove markdown code blocks if present
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(cleanResponse);

            console.log('   ✅ Bug analysis complete');
            console.log(`   Severity: ${parsed.severity || 'medium'}`);

            return {
                bugExplanation: parsed.bugExplanation || response,
                rootCause: parsed.rootCause || 'Unable to determine root cause',
                affectedCode: parsed.affectedCode || files.map(f => f.path),
                severity: parsed.severity || 'medium',
                summary: parsed.summary || problem.description
            };
        } catch (parseError) {
            // If JSON parsing fails, use raw response
            console.log('   ⚠️ Using unstructured response');

            return {
                bugExplanation: response,
                rootCause: 'See explanation above',
                affectedCode: files.map(f => f.path),
                severity: 'medium',
                summary: problem.description
            };
        }
    } catch (error) {
        console.error('❌ Analysis failed:', error);
        throw new Error('Failed to analyze bug. Make sure Ollama is running.');
    }
}

/**
 * Print bug analysis results
 */
export function printBugAnalysis(analysis: BugAnalysis): void {
    console.log('\n📋 Bug Analysis Results');
    console.log('═'.repeat(50));

    console.log('\n🐛 What is the bug?');
    console.log('─'.repeat(30));
    console.log(analysis.bugExplanation);

    console.log('\n❓ Why is it happening?');
    console.log('─'.repeat(30));
    console.log(analysis.rootCause);

    console.log('\n📍 Affected Code:');
    console.log('─'.repeat(30));
    for (const code of analysis.affectedCode) {
        console.log(`   • ${code}`);
    }

    const severityEmoji = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴'
    };
    console.log(`\n⚠️ Severity: ${severityEmoji[analysis.severity]} ${analysis.severity.toUpperCase()}`);
}

// ============================================
// LEGACY SUPPORT
// ============================================

/**
 * Legacy function for backward compatibility
 */
export async function analyzeCode(files: FileContent[]): Promise<CodeAnalysis> {
    console.log('🔍 Analyzing code...');

    const codeContext = files
        .map(f => `--- ${f.path} ---\n${f.content}`)
        .join('\n\n');

    const prompt = `Analyze the following code and provide:
1. A brief summary
2. Design patterns used
3. Potential issues
4. Key dependencies

Code:
${codeContext}`;

    const response = await queryOllama(prompt);

    return {
        summary: response,
        patterns: [],
        issues: [],
        dependencies: []
    };
}
