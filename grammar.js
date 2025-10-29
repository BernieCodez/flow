/**
 * Grammar Checker for Flow Text Editor
 * Provides basic grammar checking and correction functionality
 */

class GrammarChecker {
    constructor() {
        // Common grammar rules and patterns
        this.rules = [
            {
                pattern: /\b(their|there|they're)\b/gi,
                check: (match, context) => {
                    // Simplified check - in real implementation would use NLP
                    return null; // Placeholder for context-based checking
                },
                description: 'Commonly confused words: their/there/they\'re'
            },
            {
                pattern: /\b(your|you're)\b/gi,
                description: 'Commonly confused words: your/you\'re'
            },
            {
                pattern: /\b(its|it's)\b/gi,
                description: 'Commonly confused words: its/it\'s'
            },
            {
                pattern: /\b(then|than)\b/gi,
                description: 'Commonly confused words: then/than'
            },
            {
                pattern: /\s{2,}/g,
                fix: ' ',
                description: 'Multiple consecutive spaces'
            },
            {
                pattern: /([.!?])\s*([a-z])/g,
                fix: (match, p1, p2) => p1 + ' ' + p2.toUpperCase(),
                description: 'Sentence should start with capital letter'
            },
            {
                pattern: /\s+([.,!?;:])/g,
                fix: '$1',
                description: 'Space before punctuation'
            },
            {
                pattern: /([.,!?;:])([A-Za-z])/g,
                fix: '$1 $2',
                description: 'Missing space after punctuation'
            }
        ];

        // Common misspellings and their corrections
        this.commonMisspellings = {
            'teh': 'the',
            'recieve': 'receive',
            'occured': 'occurred',
            'definately': 'definitely',
            'seperate': 'separate',
            'wierd': 'weird',
            'untill': 'until',
            'begining': 'beginning',
            'acheive': 'achieve',
            'beleive': 'believe',
            'occassion': 'occasion',
            'accomodate': 'accommodate',
            'garantee': 'guarantee',
            'appearence': 'appearance',
            'dissapear': 'disappear',
            'embarass': 'embarrass',
            'existance': 'existence',
            'maintainance': 'maintenance',
            'persue': 'pursue',
            'posession': 'possession'
        };
    }

    /**
     * Check text for grammar issues
     */
    checkGrammar(text) {
        const issues = [];

        // Check for misspellings
        const words = text.split(/\b/);
        words.forEach((word, index) => {
            const lowerWord = word.toLowerCase();
            if (this.commonMisspellings[lowerWord]) {
                issues.push({
                    type: 'spelling',
                    original: word,
                    suggestion: this.commonMisspellings[lowerWord],
                    position: this.getWordPosition(text, index),
                    description: `Possible misspelling: "${word}" → "${this.commonMisspellings[lowerWord]}"`
                });
            }
        });

        // Check grammar rules
        this.rules.forEach(rule => {
            if (rule.fix) {
                let match;
                while ((match = rule.pattern.exec(text)) !== null) {
                    issues.push({
                        type: 'grammar',
                        original: match[0],
                        suggestion: typeof rule.fix === 'function' ? 
                            rule.fix(...match) : 
                            match[0].replace(rule.pattern, rule.fix),
                        position: match.index,
                        description: rule.description
                    });
                }
                // Reset lastIndex for global patterns
                if (rule.pattern.global) {
                    rule.pattern.lastIndex = 0;
                }
            }
        });

        return issues;
    }

    /**
     * Get word position in text
     */
    getWordPosition(text, wordIndex) {
        const words = text.split(/\b/);
        let position = 0;
        for (let i = 0; i < wordIndex && i < words.length; i++) {
            position += words[i].length;
        }
        return position;
    }

    /**
     * Apply all corrections to text
     */
    correctAll(text) {
        let correctedText = text;

        // Fix misspellings
        Object.keys(this.commonMisspellings).forEach(misspelling => {
            const correction = this.commonMisspellings[misspelling];
            const regex = new RegExp('\\b' + misspelling + '\\b', 'gi');
            correctedText = correctedText.replace(regex, (match) => {
                // Preserve case
                if (match[0] === match[0].toUpperCase()) {
                    return correction.charAt(0).toUpperCase() + correction.slice(1);
                }
                return correction;
            });
        });

        // Apply grammar fixes
        this.rules.forEach(rule => {
            if (rule.fix) {
                correctedText = correctedText.replace(rule.pattern, rule.fix);
            }
        });

        return correctedText;
    }

    /**
     * Count words in text
     */
    countWords(text) {
        const cleanText = text.replace(/<[^>]*>/g, '').trim();
        if (!cleanText) return 0;
        return cleanText.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Get text statistics
     */
    getStats(text) {
        const cleanText = text.replace(/<[^>]*>/g, '');
        const words = cleanText.trim().split(/\s+/).filter(w => w.length > 0);
        const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const characters = cleanText.length;
        const charactersNoSpaces = cleanText.replace(/\s/g, '').length;

        return {
            words: words.length,
            sentences: sentences.length,
            characters: characters,
            charactersNoSpaces: charactersNoSpaces,
            averageWordLength: charactersNoSpaces / (words.length || 1)
        };
    }
}

// Export for use in other files
window.GrammarChecker = GrammarChecker;
