/**
 * Suggester - Generates fix suggestions for bugs
 * Step 5 of Agent Loop
 */

import { BugAnalysis, CodeAnalysis } from './analyzer';
import { FileContent } from './reader';
import { queryOllama } from '../llm/ollama';

// ============================================
// INTERFACES
// ============================================

export interface FixSuggestion {
    file: string;
    description: string;
    currentCode?: string;
    suggestedCode?: string;
    explanation: string;
    priority: 'low' | 'medium' | 'high';
}

export interface Suggestion {
    type: 'improvement' | 'bug' | 'refactor' | 'security';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
}

// ============================================
// STEP 5: SUGGEST FIX
// ============================================

/**
 * Generate fix suggestions based on bug analysis
 */
export async function suggestFix(
    analysis: BugAnalysis,
    files: FileContent[]
): Promise<FixSuggestion[]> {
    console.log('\n💡 Generating fix suggestions...');

    // Prepare code context
    const codeContext = files
        .slice(0, 3)
        .map(f => `--- ${f.path} ---\n${f.content}`)
        .join('\n\n');

    const prompt = `You are a senior software engineer. Based on this bug analysis, suggest specific code fixes.

## Bug Summary
${analysis.summary}

## Bug Explanation
${analysis.bugExplanation}

## Root Cause
${analysis.rootCause}

## Affected Code
${analysis.affectedCode.join('\n')}

## Current Code
${codeContext}

## Your Fix Suggestions
Provide a JSON array with specific fixes:
[
    {
        "file": "filename.ts",
        "description": "What to change",
        "currentCode": "// problematic code snippet",
        "suggestedCode": "// fixed code snippet", 
        "explanation": "Why this fix works",
        "priority": "high|medium|low"
    }
]

IMPORTANT: Return ONLY the JSON array, no markdown code blocks, no extra text. If you cannot provide code snippets, omit currentCode and suggestedCode fields.`;

    try {
        const response = await queryOllama(prompt);

        // Try to parse JSON from response
        try {
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(cleanResponse);

            if (Array.isArray(parsed)) {
                console.log(`   ✅ Generated ${parsed.length} fix suggestion(s)`);
                return parsed.map(fix => ({
                    file: fix.file || 'unknown',
                    description: fix.description || 'See explanation',
                    currentCode: fix.currentCode,
                    suggestedCode: fix.suggestedCode,
                    explanation: fix.explanation || fix.description || '',
                    priority: fix.priority || 'medium'
                }));
            }
        } catch (parseError) {
            // JSON parse failed - use raw response
            console.log('   ⚠️ Using unstructured response');
        }

        // Fallback: create single suggestion from raw response
        return [{
            file: analysis.affectedCode[0] || 'unknown',
            description: 'AI Generated Fix',
            explanation: response,
            priority: 'medium'
        }];

    } catch (error) {
        console.error('❌ Fix generation failed:', error);
        throw new Error('Failed to generate fix. Make sure Ollama is running.');
    }
}

/**
 * Print fix suggestions
 */
export function printFixSuggestions(fixes: FixSuggestion[]): void {
    console.log('\n🔧 Fix Suggestions');
    console.log('═'.repeat(50));

    for (let i = 0; i < fixes.length; i++) {
        const fix = fixes[i];
        const priorityEmoji = {
            low: '🟢',
            medium: '🟡',
            high: '🔴'
        };

        console.log(`\n${i + 1}. ${priorityEmoji[fix.priority]} ${fix.description}`);
        console.log('─'.repeat(40));
        console.log(`📁 File: ${fix.file}`);

        if (fix.currentCode) {
            console.log('\n❌ Current Code:');
            console.log(fix.currentCode);
        }

        if (fix.suggestedCode) {
            console.log('\n✅ Suggested Fix:');
            console.log(fix.suggestedCode);
        }

        console.log('\n💬 Explanation:');
        console.log(fix.explanation);
    }
}

// ============================================
// LEGACY SUPPORT
// ============================================

/**
 * Legacy function for backward compatibility
 */
export async function generateSuggestions(analysis: CodeAnalysis): Promise<Suggestion[]> {
    console.log('💡 Generating suggestions...');

    const prompt = `Based on this code analysis, provide actionable improvement suggestions:

Analysis Summary: ${analysis.summary}
Issues Found: ${analysis.issues.join(', ')}
Patterns: ${analysis.patterns.join(', ')}

Provide specific, actionable suggestions for improvement.`;

    const response = await queryOllama(prompt);

    return [{
        type: 'improvement',
        title: 'AI Generated Suggestion',
        description: response,
        priority: 'medium'
    }];
}
