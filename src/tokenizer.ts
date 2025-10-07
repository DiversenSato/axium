export abstract class Token {
    public abstract toString(): string;

    constructor(
        public readonly line: number,
        public readonly column: number,
    ) {}
}

class WhitespaceToken extends Token {
    constructor(
        line: number,
        column: number,
        private readonly whitespace: string,
    ) {
        super(line, column);
    }

    public toString(): string {
        return this.whitespace;
    }
}

class NewlineToken extends Token {
    constructor(line: number, column: number) {
        super(line, column);
    }
    public toString(): string {
        return '\n';
    }
}

class NameToken extends Token {
    constructor(
        line: number,
        column: number,
        private readonly name: string,
    ) {
        super(line, column);
    }

    public toString(): string {
        return this.name;
    }
}

class NumberToken extends Token {
    constructor(
        line: number,
        column: number,
        private readonly number: string,
    ) {
        super(line, column);
    }

    public toString(): string {
        return this.number;
    }
}

class InlineCommentToken extends Token {
    constructor(
        line: number,
        column: number,
        private readonly comment: string,
    ) {
        super(line, column);
    }

    public toString() {
        return '//' + this.comment;
    }
}

class PeriodToken extends Token {
    constructor(line: number, column: number) {
        super(line, column);
    }

    public toString(): string {
        return '.';
    }
}

const NAME_REGEX = /[a-zA-Z]/;
const WHITESPACE_REGEX = /\s/;

export function tokenize(source: string) {
    const tokens: Token[] = [];
    const lines = source.split('\n');

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        let column = 0;
        let currentCharacter = lines[lineNumber]!.charAt(column);
        const line = lines[lineNumber]!;

        while (column < line.length) {
            if (WHITESPACE_REGEX.test(currentCharacter)) {
                let whitespace = '';
                const columnNumber = column;
                do {
                    whitespace += currentCharacter;
                    currentCharacter = line.charAt(++column);
                } while (WHITESPACE_REGEX.test(currentCharacter));
                tokens.push(
                    new WhitespaceToken(lineNumber, columnNumber, whitespace),
                );
                continue;
            }

            if (NAME_REGEX.test(currentCharacter)) {
                let name = '';
                const columnNumber = column;
                do {
                    name += currentCharacter;
                    currentCharacter = line.charAt(++column);
                } while (NAME_REGEX.test(currentCharacter));
                tokens.push(new NameToken(lineNumber, columnNumber, name));
                continue;
            }

            if (/\d/.test(currentCharacter)) {
                let number = '';
                const columnNumber = column;
                do {
                    number += currentCharacter;
                    currentCharacter = line.charAt(++column);
                } while (/\d/.test(currentCharacter));
                tokens.push(new NumberToken(lineNumber, columnNumber, number));
                continue;
            }

            if (currentCharacter === '/') {
                const columnNumber = column;
                if (line.charAt(column + 1) === '/') {
                    column++;
                    currentCharacter = line.charAt(++column);
                    let comment = '';
                    while (currentCharacter) {
                        comment += currentCharacter;
                        currentCharacter = source.charAt(++column);
                    }
                    tokens.push(
                        new InlineCommentToken(
                            lineNumber,
                            columnNumber,
                            comment,
                        ),
                    );
                    continue;
                }
            }

            if (currentCharacter === '.') {
                tokens.push(new PeriodToken(lineNumber, column));
                currentCharacter = line.charAt(++column);
                continue;
            }

            throw new SyntaxError(
                `Unexpected character "${currentCharacter}" at ${lineNumber + 1}:${column + 1}`,
            );
        }

        tokens.push(new NewlineToken(lineNumber, line.length));
    }

    return tokens;
}
