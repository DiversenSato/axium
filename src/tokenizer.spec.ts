import { tokenize } from './tokenizer.js';
import { expect } from 'chai';
import { context, describe, it } from '@gddl/testing';

describe('Tokenizer', () => {
    describe('WhitespaceToken', () => {
        it('should create one token for a space only string', () => {
            const source = '         ';
            const tokens = tokenize(source);

            expect(tokens.length).to.equal(2);
            expect(tokens[0]!.toString()).to.equal(source);
        });

        it('should separate newlines into different tokens', () => {
            const source = '     \n    ';
            const tokens = tokenize(source);

            expect(tokens.length).to.equal(4);
            expect(tokens[0]!.toString()).to.equal('     ');
            expect(tokens[1]!.toString()).to.equal('\n');
            expect(tokens[2]!.toString()).to.equal('    ');
        });
    });

    describe('NameToken', () => {
        it('should match "myVar"', () => {
            const source = 'myVar';
            const tokens = tokenize(source);

            expect(tokens.length).to.equal(2);
            expect(tokens[0]!.toString()).to.equal(source);
        });
    });

    describe('InlineCommentToken', () => {
        context('When given only an inline comment', () => {
            it('should create a single token', () => {
                const source = '// my comment';
                const tokens = tokenize(source);

                expect(tokens.length).to.equal(2);
                expect(tokens[0]!.toString()).to.equal(source);
            });
        });

        context('When after a name', () => {
            it('should create two tokens', () => {
                const source = 'hi// my comment';
                const tokens = tokenize(source);

                expect(tokens.length).to.equal(3);
                expect(tokens[0]!.toString()).to.equal('hi');
                expect(tokens[1]!.toString()).to.equal('// my comment');
            });
        });
    });
});
