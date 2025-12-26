import { describe, it, expect } from 'vitest';
import { checkTextWords } from './textFilter.server';

describe('checkTextWords', () => {
    describe('Valid English text', () => {
        it('should accept text with only dictionary words', () => {
            const result = checkTextWords('I went to the store and bought some groceries');
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
            expect(result.validWordPercentage).toBe(100);
        });

        it('should accept text with capitalized words', () => {
            const result = checkTextWords('The Quick Brown Fox Jumps Over The Lazy Dog');
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should accept longer sentences', () => {
            const result = checkTextWords(
                'Today was a beautiful day and I enjoyed walking through the park with my friends'
            );
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });
    });

    describe('Slang and acronyms', () => {
        it('should accept common internet slang', () => {
            const result = checkTextWords('omg this is so lit lol');
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should accept mixed slang with regular words', () => {
            const result = checkTextWords('ngl the vibe was amazing btw thanks');
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should accept tech acronyms', () => {
            const result = checkTextWords('working on ai and ml projects with gpt api');
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should accept casual spellings', () => {
            const result = checkTextWords('gonna wanna ur plz thx yep nah');
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should accept modern slang terms', () => {
            const result = checkTextWords('that was sus but lowkey kinda dope');
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });
    });

    describe('Possessives', () => {
        it('should accept possessive nouns', () => {
            const result = checkTextWords("the director's vision was amazing");
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should accept multiple possessives', () => {
            const result = checkTextWords("John's car and Mary's house are beautiful");
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should accept possessive with slang', () => {
            const result = checkTextWords("my friend's vibe was lit ngl");
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });
    });

    describe('Contractions', () => {
        it('should accept common contractions', () => {
            const result = checkTextWords("I don't think we can't do this");
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should accept various contraction types', () => {
            const result = checkTextWords("I'm sure you're right and they're coming");
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should accept negative contractions', () => {
            const result = checkTextWords("I won't go and they shouldn't worry");
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should accept mixed contractions and possessives', () => {
            const result = checkTextWords("I don't like the director's choice but it's okay");
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });
    });

    describe('Invalid text (gibberish)', () => {
        it('should reject pure keyboard mashing', () => {
            const result = checkTextWords('asdfghjkl qwertyuiop zxcvbnm');
            expect(result.isValid).toBe(false);
            expect(result.invalidWords.length).toBeGreaterThan(0);
            expect(result.invalidWords).toContain('asdfghjkl');
            expect(result.invalidWords).toContain('qwertyuiop');
        });

        it('should reject random letter combinations', () => {
            const result = checkTextWords('xyzabc defghi jklmno pqrstu');
            expect(result.isValid).toBe(false);
            expect(result.invalidWords.length).toBeGreaterThan(0);
        });

        it('should reject mixed gibberish with valid words', () => {
            const result = checkTextWords('the quick asdfgh jumped over xyzabc');
            expect(result.isValid).toBe(false);
            expect(result.invalidWords).toContain('asdfgh');
            expect(result.invalidWords).toContain('xyzabc');
        });

        it('should limit invalid words returned to 5', () => {
            const result = checkTextWords('aaa bbb ccc ddd eee fff ggg hhh');
            expect(result.isValid).toBe(false);
            expect(result.invalidWords.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty string', () => {
            const result = checkTextWords('');
            expect(result.isValid).toBe(false);
            expect(result.validWordPercentage).toBe(0);
        });

        it('should handle single valid word', () => {
            const result = checkTextWords('hello');
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should handle single invalid word', () => {
            const result = checkTextWords('xyzabc');
            expect(result.isValid).toBe(false);
            expect(result.invalidWords).toContain('xyzabc');
        });

        it('should handle text with numbers (ignored)', () => {
            const result = checkTextWords('I have 123 apples and 456 oranges');
            expect(result.isValid).toBe(true);
        });

        it('should handle text with punctuation', () => {
            const result = checkTextWords('Hello! How are you? I am fine, thanks.');
            expect(result.isValid).toBe(true);
            expect(result.invalidWords).toHaveLength(0);
        });

        it('should handle text with special characters', () => {
            const result = checkTextWords('check my email and visit the website later');
            expect(result.isValid).toBe(true);
        });

        it('should not add duplicate invalid words', () => {
            const result = checkTextWords('xyzabc hello xyzabc world xyzabc');
            expect(result.isValid).toBe(false);
            expect(result.invalidWords.filter((w) => w === 'xyzabc')).toHaveLength(1);
        });
    });

    describe('Real-world examples', () => {
        it('should accept casual daily update', () => {
            const result = checkTextWords(
                'woke up early ngl had some coffee btw it was lit'
            );
            expect(result.isValid).toBe(true);
        });

        it('should accept work-related text', () => {
            const result = checkTextWords(
                'working on the api integration with the new ml model asap'
            );
            expect(result.isValid).toBe(true);
        });

        it('should accept movie review style', () => {
            const result = checkTextWords(
                "looked at some beautiful film that was too full of the director's vision"
            );
            expect(result.isValid).toBe(true);
        });

        it('should accept social media style', () => {
            const result = checkTextWords(
                'omg just finished this project and its lowkey amazing tbh'
            );
            expect(result.isValid).toBe(true);
        });

        it('should reject obvious AI gibberish', () => {
            const result = checkTextWords(
                'the synergistic paradigm leverages blockchain innovativeness zxqw'
            );
            expect(result.isValid).toBe(false);
            expect(result.invalidWords).toContain('zxqw');
        });
    });

    describe('Validation strictness', () => {
        it('should require 100% valid words (no tolerance)', () => {
            const result = checkTextWords('hello world this is mostly valid text xyzabc');
            expect(result.isValid).toBe(false);
            expect(result.invalidWords).toContain('xyzabc');
        });

        it('should calculate correct valid word percentage', () => {
            const result = checkTextWords('hello xyzabc world');
            expect(result.validWordPercentage).toBeCloseTo(66.67, 1);
            expect(result.isValid).toBe(false);
        });
    });
});

