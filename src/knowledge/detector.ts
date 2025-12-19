/**
 * Domain Detector - Auto-detect technology domain from files
 */

import * as path from 'path';
import { DomainType, DOMAINS } from './domains';

export interface DetectionResult {
    domain: DomainType;
    confidence: number;
    reason: string;
}

/**
 * Detect domain from a single file
 */
export function detectFromFile(filePath: string, content?: string): DetectionResult {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();

    // Check file extension first
    for (const [domainType, domain] of Object.entries(DOMAINS)) {
        if (domain.extensions.includes(ext)) {
            return {
                domain: domainType as DomainType,
                confidence: 0.9,
                reason: `File extension ${ext} matches ${domain.name}`
            };
        }

        // Check filename patterns (e.g., .component.ts)
        if (domain.extensions.some(e => fileName.endsWith(e.replace('.', '')))) {
            return {
                domain: domainType as DomainType,
                confidence: 0.8,
                reason: `Filename pattern matches ${domain.name}`
            };
        }
    }

    // Check content for keywords and imports
    if (content) {
        return detectFromContent(content, filePath);
    }

    // Default to TypeScript for .ts files
    if (ext === '.ts') {
        return {
            domain: 'typescript',
            confidence: 0.5,
            reason: 'TypeScript file (no specific domain detected)'
        };
    }

    return {
        domain: 'generic',
        confidence: 0.3,
        reason: 'No specific domain detected'
    };
}

/**
 * Detect domain from file content
 */
export function detectFromContent(content: string, filePath?: string): DetectionResult {
    const scores: Record<DomainType, number> = {
        webgpu: 0,
        webgl: 0,
        react: 0,
        vue: 0,
        angular: 0,
        tailwind: 0,
        typescript: 0,
        generic: 0
    };

    // Score each domain based on keywords and imports
    for (const [domainType, domain] of Object.entries(DOMAINS)) {
        const type = domainType as DomainType;

        // Check keywords
        for (const keyword of domain.keywords) {
            if (content.includes(keyword)) {
                scores[type] += 2;
            }
        }

        // Check imports
        for (const imp of domain.imports) {
            if (content.includes(`from '${imp}`) ||
                content.includes(`from "${imp}`) ||
                content.includes(`require('${imp}`)) {
                scores[type] += 3;
            }
        }
    }

    // Find highest score
    let maxScore = 0;
    let detectedDomain: DomainType = 'generic';

    for (const [domain, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            detectedDomain = domain as DomainType;
        }
    }

    // Calculate confidence
    const confidence = Math.min(maxScore / 10, 1);

    if (maxScore === 0) {
        return {
            domain: 'generic',
            confidence: 0.3,
            reason: 'No domain-specific patterns found'
        };
    }

    return {
        domain: detectedDomain,
        confidence,
        reason: `Found ${maxScore} matches for ${DOMAINS[detectedDomain].name}`
    };
}

/**
 * Detect domain from multiple files (project-level)
 */
export function detectFromProject(files: Array<{ path: string; content: string }>): DetectionResult {
    const domainCounts: Record<DomainType, number> = {
        webgpu: 0,
        webgl: 0,
        react: 0,
        vue: 0,
        angular: 0,
        tailwind: 0,
        typescript: 0,
        generic: 0
    };

    for (const file of files) {
        const result = detectFromFile(file.path, file.content);
        if (result.confidence > 0.5) {
            domainCounts[result.domain] += result.confidence;
        }
    }

    // Find dominant domain
    let maxCount = 0;
    let dominantDomain: DomainType = 'generic';

    for (const [domain, count] of Object.entries(domainCounts)) {
        if (count > maxCount) {
            maxCount = count;
            dominantDomain = domain as DomainType;
        }
    }

    return {
        domain: dominantDomain,
        confidence: Math.min(maxCount / files.length, 1),
        reason: `Project primarily uses ${DOMAINS[dominantDomain].name}`
    };
}
