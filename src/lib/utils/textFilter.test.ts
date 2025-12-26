import { describe, it, expect } from 'vitest';
import { sanitizeText } from './textFilter';

describe('sanitizeText', () => {
    describe('Basic sanitization', () => {
        it('should remove HTML tags', () => {
            expect(sanitizeText('<script>alert("xss")</script>hello')).toBe('alert("xss")hello');
            expect(sanitizeText('<div>test</div>')).toBe('test');
        });

        it('should remove javascript: patterns', () => {
            expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)');
        });

        it('should trim whitespace', () => {
            expect(sanitizeText('  hello world  ')).toBe('hello world');
        });

        it('should normalize multiple spaces', () => {
            expect(sanitizeText('hello    world')).toBe('hello world');
        });
    });

    describe('Special character removal', () => {
        it('should remove weird special characters', () => {
            expect(sanitizeText('hello%^&*world')).toBe('helloworld');
            expect(sanitizeText('test@#$%money')).toBe('testmoney');
            expect(sanitizeText('symbols~`+={}[]|\\')).toBe('symbols');
        });

        it('should keep basic punctuation', () => {
            expect(sanitizeText('hello, world!')).toBe('hello, world!');
            expect(sanitizeText("it's okay.")).toBe("it's okay.");
            expect(sanitizeText('what? really...')).toBe('what? really.');
        });

        it('should keep letters and numbers', () => {
            expect(sanitizeText('test123abc')).toBe('test123abc');
        });

        it('should keep allowed punctuation: . , ! ? \' " - ( )', () => {
            expect(sanitizeText('hello, world! how are you?')).toBe('hello, world! how are you?');
            expect(sanitizeText("it's a test.")).toBe("it's a test.");
            expect(sanitizeText('(hello) "world" - test')).toBe('(hello) "world" - test');
        });
    });

    describe('Repeated character collapsing', () => {
        it('should collapse repeated punctuation', () => {
            expect(sanitizeText('hello!!!!')).toBe('hello!');
            expect(sanitizeText('what....')).toBe('what.');
            expect(sanitizeText('really???')).toBe('really?');
            expect(sanitizeText("wow'''")).toBe("wow'");
        });

        it('should collapse repeated characters (3+ to 2)', () => {
            expect(sanitizeText('helllllo')).toBe('hello');
            expect(sanitizeText('woooow')).toBe('woow');
            expect(sanitizeText('yessss')).toBe('yess');
            expect(sanitizeText('aaaaamazing')).toBe('aamazing');
        });

        it('should not affect double characters', () => {
            expect(sanitizeText('hello')).toBe('hello'); // double 'l' is fine
            expect(sanitizeText('book')).toBe('book'); // double 'o' is fine
            expect(sanitizeText('running')).toBe('running'); // double 'n' is fine
        });

        it('should handle mixed repeated patterns', () => {
            expect(sanitizeText('OMG!!!!!! this is soooo cool....')).toBe('OMG! this is soo cool.');
        });
    });

    describe('Combined sanitization', () => {
        it('should handle multiple sanitization steps together', () => {
            expect(sanitizeText('hello!!!!%^& world....')).toBe('hello! world.');
        });

        it('should sanitize exploitation attempts', () => {
            expect(sanitizeText('test!!!!!...!!!')).toBe('test!.!');
            expect(sanitizeText('!!!!!!!')).toBe('!');
        });

        it('should handle realistic user input with excess', () => {
            expect(sanitizeText('OMG this is sooooo amazing!!!!')).toBe('OMG this is soo amazing!');
        });

        it('should clean up messy input', () => {
            expect(sanitizeText('  hello   world!!!!!   ')).toBe('hello world!');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty string', () => {
            expect(sanitizeText('')).toBe('');
        });

        it('should handle only special characters', () => {
            expect(sanitizeText('%^&*@#$')).toBe('');
        });

        it('should handle only repeated punctuation', () => {
            expect(sanitizeText('!!!!....')).toBe('!.');
        });

        it('should preserve normal contractions', () => {
            expect(sanitizeText("don't won't can't")).toBe("don't won't can't");
        });

        it('should preserve possessives', () => {
            expect(sanitizeText("John's car")).toBe("John's car");
        });
    });
});

