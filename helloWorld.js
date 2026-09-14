const TokenKind = {
    Identifier: 0,
    Number: 1,
    String: 2,
    Keyword: 3,
};
class Token {
    constructor(kind, value) {
        this.kind = kind;
        this.value = value;
    }
}
function println(s) {
    console.log(s);
}
function main() {
    const token = {
        kind: TokenKind.Identifier,
        value: 'Hello, World!',
    };
}

main();
