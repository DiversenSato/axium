abstract class Token {
    public abstract toString(): string;
}

class WhitespaceToken extends Token {
    constructor(private readonly whitespace: string) {
        super();
    }

    public toString(): string {
        return this.whitespace;
    }
}

class NameToken extends Token {
    constructor(private readonly name: string) {
        super();
    }

    public toString(): string {
        return this.name;
    }
}

class NumberToken extends Token {
    constructor(private readonly number: string) {
        super();
    }

    public toString(): string {
        return this.number;
    }
}

class InlineCommentToken extends Token {
    constructor(private readonly comment: string) {
        super();
    }

    public toString() {
        return '//' + this.comment;
    }
}

const NAME_REGEX = /[a-zA-Z]/;

export function tokenize(source: string) {
    let cursor = 0;

    const tokens: Token[] = [];

    while (cursor < source.length) {
        let currentCharacter = source.charAt(cursor);

        if (/\s/.test(currentCharacter)) {
            let whitespace = '';
            while (/\s/.test(currentCharacter)) {
                whitespace += currentCharacter;
                currentCharacter = source.charAt(++cursor);
            }
            tokens.push(new WhitespaceToken(whitespace));
            continue;
        }

        if (NAME_REGEX.test(currentCharacter)) {
            let name = '';
            while (NAME_REGEX.test(currentCharacter)) {
                name += currentCharacter;
                currentCharacter = source.charAt(++cursor);
            }
            tokens.push(new NameToken(name));
            continue;
        }

        if (/\d/.test(currentCharacter)) {
            let number = '';
            while (/\d/.test(currentCharacter)) {
                number += currentCharacter;
                currentCharacter = source.charAt(++cursor);
            }
            tokens.push(new NumberToken(number));
            continue;
        }

        if (currentCharacter === '/') {
            if (source.charAt(cursor + 1) === '/') {
                cursor++;
                currentCharacter = source.charAt(++cursor);
                let comment = '';
                while (currentCharacter && currentCharacter !== '\n') {
                    comment += currentCharacter;
                    currentCharacter = source.charAt(++cursor);
                }
                tokens.push(new InlineCommentToken(comment));
                continue;
            }
        }

        throw new SyntaxError('Unknown character:' + currentCharacter);
    }

    return tokens;
}
