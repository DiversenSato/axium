import super::ast::ast::{Span};
import super::span::sourceMap::{addFile};

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

export struct Token {
    kind: TokenKind;
    span: Span;
    value: string;
}

fn isIdentifierStart(u8 c) {
    if (c >= 'a' && c <= 'z') return true;
    if (c >= 'A' && c <= 'Z') return true;
    if (c == '_') return true;

    return false;
}

fn isIdentifierContinue(u8 c) {
    if (c >= 'a' && c <= 'z') return true;
    if (c >= 'A' && c <= 'Z') return true;
    if (c >= '0' && c <= '9') return true;
    if (c == '_') return true;

    return false;
}

fn isWhitespace(u8 c) {
    if (c == ' ') return true;
    if (c == '\n') return true;
    if (c == '\r') return true;
    if (c == '\t') return true;

    return false;
}

fn isDigit(u8 c) {
    return c >= '0' && c <= '9';
}

export struct Lexer {
    position: u32;
    source: string;
    sourceId: i32;

    static fn from(SourceFile file) {
        return Lexer {
            position: 0,
            source: file.content,
            sourceId: addFile(file.name, file.content),
        };
    }

    fn peek(i32 offset) {
        if (!offset) offset = 0;
        return this.source.at(this.position + offset);
    }

    fn advance(): string {
        let next = this.source.at(this.position);
        this.position = this.position + 1;
        if (next == undefined) return Error("unexpected end of input");
        return next;
    }

    fn match(u8 c) {
        let char = this.peek();
        if (char == undefined) return false;
        return char == c;
    }

    fn hasNext() {
        return this.peek() != undefined;
    }

    fn nextToken() {
        if (this.peek() == undefined) {
            return Token {
                kind: TokenKind.Eof,
                span: Span.from(this.position, this.position, this.sourceId),
                value: "",
            };
        }

        let start = this.position;

        let nextChar = this.advance();
        let kind = this.getTokenKind(nextChar);

        let token = Token {
            kind,
            span: Span.from(start, this.position, this.sourceId),
            value: this.source.slice(start, this.position),
        };
        return token;
    }

    fn getTokenKind(u8 char) {
        if (char == '/' && this.peek() == '/') return this.lineComment();
        if (char == '/' && this.peek() == '*') return this.blockComment();
        if (isWhitespace(char)) return this.whitespace();
        if (isIdentifierStart(char)) return this.identifier(char);

        if (char == ';') return TokenKind.Semi;
        if (char == ',') return TokenKind.Comma;
        if (char == ':') {
            if (this.peek() == ':') {
                this.advance();
                return TokenKind.DoubleColon;
            }
            return TokenKind.Colon;
        }
        if (char == '.') return TokenKind.Dot;
        if (char == '(') return TokenKind.OpenParen;
        if (char == ')') return TokenKind.CloseParen;
        if (char == '{') return TokenKind.OpenBrace;
        if (char == '}') return TokenKind.CloseBrace;
        if (char == '[') return TokenKind.OpenBracket;
        if (char == ']') return TokenKind.CloseBracket;

        if (char == '+') {
            if (this.peek() == '=') {
                this.advance();
                return TokenKind.Increment;
            }
            return TokenKind.Plus;
        }
        if (char == '-') return TokenKind.Dash;
        if (char == '*') return TokenKind.Star;
        if (char == '/') return TokenKind.ForwardSlash;
        if (char == '=') {
            if (this.peek() == '=') {
                this.advance();
                return TokenKind.DoubleEquals;
            }
            if (this.peek() == '>') {
                this.advance();
                return TokenKind.Arrow;
            }
            return TokenKind.Equals;
        }
        if (char == '?') return TokenKind.Question;
        if (char == '<') {
            if (this.peek() == '=') {
                this.advance();
                return TokenKind.LessThanEquals;
            }
            return TokenKind.LessThan;
        }
        if (char == '>') {
            if (this.peek() == '=') {
                this.advance();
                return TokenKind.GreaterThanEquals;
            }
            return TokenKind.GreaterThan;
        }
        if (char == '!') {
            if (this.peek() == '=') {
                this.advance();
                return TokenKind.NotEquals;
            }
            return TokenKind.Exclamation;
        }
        if (char == '&') {
            if (this.peek() == '&') {
                this.advance();
                return TokenKind.And;
            }
            return TokenKind.Ampersand;
        }
        if (char == '|') {
            if (this.peek() == '|') {
                this.advance();
                return TokenKind.DoublePipe;
            }
            return TokenKind.Pipe;
        }

        if (char == '"') return this.stringLiteral();
        if (char == '\'') return this.charLiteral();
        if (isDigit(char)) return this.numberLiteral();

        return TokenKind.Unknown;
    }

    fn lineComment(): TokenKind {
        while (this.peek() != '\n') this.advance();
        return TokenKind.LineComment;
    }

    fn blockComment(): TokenKind {
        this.advance();
        while (!(this.match('*') && this.peek(1) == '/')) {
            this.advance();
        }
        this.advance();
        this.advance();
        return TokenKind.BlockComment;
    }

    fn whitespace(): TokenKind {
        while (this.peek() != undefined && isWhitespace(this.peek())) {
            this.advance();
        }
        return TokenKind.Whitespace;
    }

    fn identifier(u8 firstChar): TokenKind {
        let chars = [firstChar];
        while (this.peek() != undefined && isIdentifierContinue(this.peek())) {
            chars.push(this.advance());
        }
        return TokenKind.Identifier;
    }

    fn stringLiteral(): TokenKind {
        while (this.peek() != '\n') {
            let c = this.advance();
            if (c == '"') return TokenKind.StringLiteral;
            if (c == '\\') {
                if (this.peek() == '\\') this.advance();
                if (this.peek() == '"') this.advance();
            }
        }

        return Error("unterminated string literal");
    }

    fn charLiteral(): TokenKind {
        let c = this.advance();
        if (c == '\'') return Error("empty character literal");
        if (c == '\\') {
            this.advance();
        }

        let end = this.advance();
        if (end != '\'') return Error("unterminated character literal");

        return TokenKind.CharLiteral;
    }

    fn numberLiteral(): TokenKind {
        loop {
            let c = this.peek();
            if (c == undefined) break;
            else if (c == '_') this.advance();
            else if (isDigit(c)) this.advance();
            else break;
        }
        return TokenKind.NumberLiteral;
    }
}
