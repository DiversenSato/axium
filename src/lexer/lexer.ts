import { Span } from '../ast/ast.js';
import { SyntaxError } from '../errors/SyntaxError.js';
import { addFile, type SourceFile } from '../span/sourceMap.js';

export enum TokenKind {
    LineComment,
    BlockComment,
    Whitespace,
    Identifier,
    NumberLiteral,
    StringLiteral,
    CharLiteral,

    Semi,
    Comma,
    Colon,
    DoubleColon,
    Dot,
    OpenParen,
    CloseParen,
    OpenBrace,
    CloseBrace,
    OpenBracket,
    CloseBracket,
    Arrow,
    Question,

    Plus, // +
    Dash, // -
    Star, // *
    ForwardSlash, // /
    Equals, // =
    DoubleEquals, // ==
    NotEquals, // !=
    Increment, // +=
    LessThan, // <
    LessThanEquals, // <=
    GreaterThan, // >
    GreaterThanEquals, // >=
    Exclamation, // !
    Pipe, // |
    DoublePipe, // |

    Ampersand,
    And,

    Unknown,
    Eof,
}

export class Token {
    public constructor(
        public readonly kind: TokenKind,
        public readonly span: Span,
        public readonly value: string,
    ) {}
}

function isIdentifierStart(c: string) {
    return /[a-zA-Z_]/.test(c);
}

function isIdentifierContinue(c: string) {
    return /[a-zA-Z0-9_]/.test(c);
}

function isWhitespace(c: string) {
    return /[\s]/.test(c);
}

function isDigit(c: string) {
    return /[0-9]/.test(c);
}

export class Lexer {
    private position = 0;
    private readonly source: string;
    private readonly sourceId: number;

    constructor(file: SourceFile) {
        this.source = file.content;
        this.sourceId = addFile(file.name, file.content);
    }

    private peek(offset?: number): string | undefined {
        return this.source.at(this.position + (offset ?? 0));
    }

    private advance(): string {
        const next = this.source.at(this.position++);
        if (next === undefined) throw new SyntaxError('unexpected end of input');
        return next;
    }

    private match(c: string): boolean {
        const char = this.peek();
        if (char === undefined) return false;
        return char === c;
    }

    public hasNext(): boolean {
        return this.position < this.source.length;
    }

    public nextToken(): Token {
        if (this.peek() === undefined)
            return new Token(TokenKind.Eof, new Span(this.position, this.position, this.sourceId), '');
        const start = this.position;

        const nextChar = this.advance();
        const kind = this.getTokenKind(nextChar);

        const token = new Token(
            kind,
            new Span(start, this.position, this.sourceId),
            this.source.slice(start, this.position),
        );
        return token;
    }

    private getTokenKind(char: string): TokenKind {
        if (char === '/' && this.peek() === '/') return this.lineComment();
        if (char === '/' && this.peek() === '*') return this.blockComment();
        if (isWhitespace(char)) return this.whitespace();
        if (isIdentifierStart(char)) return this.identifier(char);

        if (char === ';') return TokenKind.Semi;
        if (char === ',') return TokenKind.Comma;
        if (char === ':') {
            if (this.peek() === ':') {
                this.advance();
                return TokenKind.DoubleColon;
            }
            return TokenKind.Colon;
        }
        if (char === '.') return TokenKind.Dot;
        if (char === '(') return TokenKind.OpenParen;
        if (char === ')') return TokenKind.CloseParen;
        if (char === '{') return TokenKind.OpenBrace;
        if (char === '}') return TokenKind.CloseBrace;
        if (char === '[') return TokenKind.OpenBracket;
        if (char === ']') return TokenKind.CloseBracket;

        if (char === '+') {
            if (this.peek() === '=') {
                this.advance();
                return TokenKind.Increment;
            }
            return TokenKind.Plus;
        }
        if (char === '-') return TokenKind.Dash;
        if (char === '*') return TokenKind.Star;
        if (char === '/') return TokenKind.ForwardSlash;
        if (char === '=') {
            if (this.peek() === '=') {
                this.advance();
                return TokenKind.DoubleEquals;
            }
            if (this.peek() === '>') {
                this.advance();
                return TokenKind.Arrow;
            }
            return TokenKind.Equals;
        }
        if (char === '?') return TokenKind.Question;
        if (char === '<') {
            if (this.peek() === '=') {
                this.advance();
                return TokenKind.LessThanEquals;
            }
            return TokenKind.LessThan;
        }
        if (char === '>') {
            if (this.peek() === '=') {
                this.advance();
                return TokenKind.GreaterThanEquals;
            }
            return TokenKind.GreaterThan;
        }
        if (char === '!') {
            if (this.peek() === '=') {
                this.advance();
                return TokenKind.NotEquals;
            }
            return TokenKind.Exclamation;
        }
        if (char === '&') {
            if (this.peek() === '&') {
                this.advance();
                return TokenKind.And;
            }
            return TokenKind.Ampersand;
        }
        if (char === '|') {
            if (this.peek() === '|') {
                this.advance();
                return TokenKind.DoublePipe;
            }
            return TokenKind.Pipe;
        }

        if (char === '"') return this.stringLiteral();
        if (char === "'") return this.charLiteral();
        if (isDigit(char)) return this.numberLiteral();

        return TokenKind.Unknown;
    }

    private lineComment(): TokenKind {
        while (this.peek() !== '\n') this.advance();
        return TokenKind.LineComment;
    }

    private blockComment(): TokenKind {
        this.advance();
        while (!(this.match('*') && this.peek(1) === '/')) {
            this.advance();
        }
        this.advance();
        this.advance();
        return TokenKind.BlockComment;
    }

    private whitespace(): TokenKind {
        while (this.peek() !== undefined && isWhitespace(this.peek()!)) {
            this.advance();
        }
        return TokenKind.Whitespace;
    }

    private identifier(firstChar: string): TokenKind {
        const chars = [firstChar];
        while (this.peek() !== undefined && isIdentifierContinue(this.peek()!)) {
            chars.push(this.advance());
        }
        return TokenKind.Identifier;
    }

    private stringLiteral(): TokenKind {
        while (this.peek() !== '\n') {
            const c = this.advance();
            if (c === '"') return TokenKind.StringLiteral;
            if (c === '\\') {
                if (this.peek() === '\\') this.advance();
                if (this.peek() === '"') this.advance();
            }
        }

        throw new SyntaxError('unterminated string literal');
    }

    private charLiteral(): TokenKind {
        const c = this.advance(); // Consume character (start tick already consumed)
        if (c === "'") throw new SyntaxError('empty character literal');
        if (c === '\\') {
            this.advance(); // Consume escaped character
        }

        const end = this.advance(); // Consume end tick
        if (end !== "'") {
            console.log({
                end,
                position: this.position,
                slice: this.source.slice(this.position - 3, this.position + 3),
            });
            throw new SyntaxError('unterminated character literal');
        }

        return TokenKind.CharLiteral;
    }

    private numberLiteral(): TokenKind {
        while (true) {
            const c = this.peek();
            if (c === undefined) break;
            else if (c === '_') this.advance();
            else if (isDigit(c)) this.advance();
            else break;
        }
        return TokenKind.NumberLiteral;
    }
}
