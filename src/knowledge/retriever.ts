/**
 * Knowledge Retriever - Load and search knowledge base documents
 */

import * as fs from 'fs';
import * as path from 'path';
import { DomainType, getDomain } from './domains';

const KNOWLEDGE_DIR = path.join(__dirname, 'docs');

export interface KnowledgeDoc {
    domain: DomainType;
    title: string;
    content: string;
}

/**
 * Load knowledge document for a domain
 */
export function loadKnowledge(domain: DomainType): KnowledgeDoc | null {
    const filePath = path.join(KNOWLEDGE_DIR, `${domain}.md`);

    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return {
                domain,
                title: getDomain(domain).name,
                content
            };
        }
    } catch (e) {
        console.warn(`Knowledge doc not found: ${domain}.md`);
    }

    return null;
}

/**
 * Search knowledge for relevant sections
 */
export function searchKnowledge(domain: DomainType, query: string): string {
    const doc = loadKnowledge(domain);
    if (!doc) return '';

    const queryLower = query.toLowerCase();
    const lines = doc.content.split('\n');
    const relevantSections: string[] = [];

    let currentSection = '';
    let isRelevant = false;

    for (const line of lines) {
        // New section (heading)
        if (line.startsWith('#')) {
            if (isRelevant && currentSection) {
                relevantSections.push(currentSection.trim());
            }
            currentSection = line + '\n';
            isRelevant = line.toLowerCase().includes(queryLower);
        } else {
            currentSection += line + '\n';
            if (line.toLowerCase().includes(queryLower)) {
                isRelevant = true;
            }
        }
    }

    // Add last section
    if (isRelevant && currentSection) {
        relevantSections.push(currentSection.trim());
    }

    // Return top 3 relevant sections
    return relevantSections.slice(0, 3).join('\n\n---\n\n');
}

/**
 * Get full domain prompt with optional knowledge
 */
export function getEnhancedPrompt(domain: DomainType, context?: string): string {
    const domainInfo = getDomain(domain);
    let prompt = domainInfo.prompt;

    // Add relevant knowledge if context provided
    if (context) {
        const knowledge = searchKnowledge(domain, context);
        if (knowledge) {
            prompt += `\n\nRelevant Knowledge:\n${knowledge}`;
        }
    }

    return prompt;
}

/**
 * List all available knowledge docs
 */
export function listKnowledgeDocs(): DomainType[] {
    const available: DomainType[] = [];

    try {
        if (fs.existsSync(KNOWLEDGE_DIR)) {
            const files = fs.readdirSync(KNOWLEDGE_DIR);
            for (const file of files) {
                if (file.endsWith('.md')) {
                    const domain = file.replace('.md', '') as DomainType;
                    available.push(domain);
                }
            }
        }
    } catch (e) {
        console.warn('Could not list knowledge docs');
    }

    return available;
}
