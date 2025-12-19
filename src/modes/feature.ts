/**
 * Feature Mode - Suggest implementation approach for new features
 * 
 * Output:
 * - Clarifying questions
 * - Suggested approach
 * - Files to modify
 * - Skeleton code
 */

import { FileContent } from '../agent/reader';
import { scanRepository } from '../repo/scan';
import { queryOllama } from '../llm/ollama';
import * as path from 'path';

// ============================================
// INTERFACES
// ============================================

export interface FeatureResult {
    clarifications: string[];    // Questions to ask for clarity
    approach: string;            // Recommended implementation approach
    filesToModify: FileModification[];  // Which files to change
    skeletonCode: string;        // Starter code
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
    warnings: string[];          // Things to watch out for
}

export interface FileModification {
    file: string;
    action: 'create' | 'modify' | 'delete';
    description: string;
}

// ============================================
// FEATURE MODE
// ============================================

/**
 * Run feature suggestion analysis
 */
export async function runFeatureMode(
    featureRequest: string,
    files: FileContent[]
): Promise<FeatureResult> {
    console.log('\n✨ Feature Mode - Planning Implementation');
    console.log('═'.repeat(50));
    console.log(`Feature: ${featureRequest}`);
    console.log('─'.repeat(50));

    // Prepare context
    const fileList = files.map(f => path.basename(f.path)).join(', ');
    const sampleFiles = files.slice(0, 5);
    const codeContext = sampleFiles
        .map(f => `--- ${path.basename(f.path)} ---\n${f.content.substring(0, 400)}...`)
        .join('\n\n');

    const prompt = `You are a senior architect helping plan a new feature. Be practical and specific.

## Feature Request
"${featureRequest}"

## Existing Codebase
Files: ${fileList}

## Code Context
${codeContext}

## Your Plan
Provide a JSON response:
{
    "clarifications": [
        "Question 1 to clarify requirements?",
        "Question 2 about scope?"
    ],
    "approach": "Detailed explanation of the best way to implement this feature, including which patterns to use and why",
    "filesToModify": [
        {
            "file": "NewFile.ts",
            "action": "create",
            "description": "What to add in this file"
        },
        {
            "file": "ExistingFile.ts",
            "action": "modify",
            "description": "What changes to make"
        }
    ],
    "skeletonCode": "// Starter code for the main component\\nexport class NewFeature {\\n  // TODO: implement\\n}",
    "estimatedComplexity": "simple|moderate|complex",
    "warnings": [
        "Thing to watch out for",
        "Potential issue to consider"
    ]
}

IMPORTANT: 
- Return ONLY valid JSON
- Be SPECIFIC about files and changes
- Provide REAL skeleton code, not just comments
- Ask 1-3 clarifying questions max`;

    try {
        const response = await queryOllama(prompt);

        // Parse JSON
        try {
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(cleanResponse);

            return {
                clarifications: parsed.clarifications || [],
                approach: parsed.approach || response,
                filesToModify: parsed.filesToModify || [],
                skeletonCode: parsed.skeletonCode || '// No skeleton provided',
                estimatedComplexity: parsed.estimatedComplexity || 'moderate',
                warnings: parsed.warnings || []
            };
        } catch (parseError) {
            return {
                clarifications: [],
                approach: response,
                filesToModify: [],
                skeletonCode: '// See approach for implementation details',
                estimatedComplexity: 'moderate',
                warnings: []
            };
        }
    } catch (error) {
        console.error('❌ Feature analysis failed:', error);
        throw new Error('Failed to analyze feature. Make sure Ollama is running.');
    }
}

/**
 * Print feature results
 */
export function printFeatureResult(result: FeatureResult): void {
    console.log('\n📋 Feature Implementation Plan');
    console.log('═'.repeat(50));

    // Complexity badge
    const complexityEmoji = {
        simple: '🟢',
        moderate: '🟡',
        complex: '🔴'
    };
    console.log(`\n⚡ Complexity: ${complexityEmoji[result.estimatedComplexity]} ${result.estimatedComplexity.toUpperCase()}`);

    if (result.clarifications.length > 0) {
        console.log('\n❓ Clarifying Questions:');
        console.log('─'.repeat(30));
        for (let i = 0; i < result.clarifications.length; i++) {
            console.log(`   ${i + 1}. ${result.clarifications[i]}`);
        }
    }

    console.log('\n🎯 Recommended Approach:');
    console.log('─'.repeat(30));
    console.log(result.approach);

    if (result.filesToModify.length > 0) {
        console.log('\n📁 Files to Modify:');
        console.log('─'.repeat(30));
        for (const file of result.filesToModify) {
            const actionEmoji = {
                create: '➕',
                modify: '✏️',
                delete: '🗑️'
            };
            console.log(`\n   ${actionEmoji[file.action]} ${file.file} [${file.action.toUpperCase()}]`);
            console.log(`      ${file.description}`);
        }
    }

    console.log('\n💻 Skeleton Code:');
    console.log('─'.repeat(30));
    console.log(result.skeletonCode);

    if (result.warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        console.log('─'.repeat(30));
        for (const warning of result.warnings) {
            console.log(`   • ${warning}`);
        }
    }
}

/**
 * Main feature mode entry point
 */
export async function feature(
    featureRequest: string,
    targetPath?: string
): Promise<FeatureResult> {
    const projectPath = targetPath || process.cwd();

    console.log(`\n📂 Scanning: ${projectPath}`);

    // Scan repository
    const scannedFiles = await scanRepository(projectPath);

    if (scannedFiles.length === 0) {
        throw new Error('No code files found. Make sure the path contains code files.');
    }

    const files: FileContent[] = scannedFiles.map(f => ({
        path: f.path,
        content: f.content,
        extension: f.extension
    }));

    // Run feature analysis
    const result = await runFeatureMode(featureRequest, files);

    // Print results
    printFeatureResult(result);

    return result;
}
