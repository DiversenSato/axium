import { Span } from '../ast/ast.js';
import { SyntaxError } from '../errors/SyntaxError.js';

export interface TokenAlt {
    kind: TokenKind;
    span: Span;
    value: string;
}

function isIdentifierStart(c: string) {
    return /[a-zA-Z_]/.test(c);
}

function isIdentifierContinue(c: string) {
    return /[a-zA-Z0-9_]/.test(c);
}

export type TokenKind = 'ident' | 'int' | 'float' | 'str' | 'char' | 'punct' | 'eof';
export interface Token {
    kind: TokenKind;
    span: Span;
    value: string;
}

// Longest operators first so that e.g. `==` wins over `=`.
// prettier-ignore
const PUNCTUATION = [
    '::', '=>', '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '++', '--',
    ';', ',', ':', '.', '(', ')', '{', '}', '[', ']', '?',
    '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^',
];

export function tokenize(source: string, sourceId: number): Token[] {
    let position = 0;
    const tokens: TokenAlt[] = [];

    while (position < source.length) {
        const start = position;
        const c = source[position]!;

        if (/\s/.test(c)) {
            position++;
            continue;
        }

        if (source.startsWith('//', position)) {
            while (position < source.length && source[position] !== '\n') position++;
            continue;
        }

        if (source.startsWith('/*', position)) {
            const end = source.indexOf('*/', position + 2);
            if (end < 0) break;
            position = end + 2;
            continue;
        }

        if (isIdentifierStart(c)) {
            while (position < source.length && isIdentifierContinue(source[position]!)) position++;
            tokens.push({
                kind: 'ident',
                span: new Span(start, position, sourceId),
                value: source.slice(start, position),
            });
            continue;
        }

        if (c === '"') {
            while (source[position + 1] !== '\n') {
                const c = source[++position];
                if (c === undefined) throw new SyntaxError('unexpected end of file');
                if (c === '"') break;
                if (c === '\\') {
                    if (source[position + 1] === '\\') position++;
                    if (source[position + 1] === '"') position++;
                }
            }
            tokens.push({
                kind: 'str',
                span: new Span(start, ++position, sourceId),
                value: source.slice(start, position),
            });
            continue;
        }

        if (c === "'") {
            const c = source[++position];
            if (c === undefined) throw new SyntaxError('unexpected end of file');
            if (c === "'") throw new SyntaxError("character literal can't be empty");
            if (c === '\\') position++;

            if (source[++position] !== "'") throw new SyntaxError('character literal can only contain one character');
            position++;
            tokens.push({
                kind: 'char',
                span: new Span(start, position, sourceId),
                value: source.slice(start, position),
            });
            continue;
        }

        if (/\d/.test(c)) {
            while (position < source.length && /\d/.test(source[position]!)) position++;
            let isFloat = false;
            if (source[position] === '.') {
                isFloat = true;
                position++;
                while (position < source.length && /\d/.test(source[position]!)) position++;
            }
            tokens.push({
                kind: isFloat ? 'float' : 'int',
                span: new Span(start, position, sourceId),
                value: source.slice(start, position),
            });
            continue;
        }

        const p = PUNCTUATION.find((p) => source.startsWith(p, position));
        if (p === undefined)
            throw new SyntaxError(`unexpected character \`${c}\``, new Span(position, position + 1, sourceId));
        position += p.length;
        tokens.push({
            kind: 'punct',
            span: new Span(start, position, sourceId),
            value: source.slice(start, position),
        });
    }

    tokens.push({
        kind: 'eof',
        span: new Span(position, position, sourceId),
        value: '',
    });
    return tokens;
}
