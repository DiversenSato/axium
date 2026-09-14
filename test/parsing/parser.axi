import super::lexer::lexer::{Lexer};

export struct Parser {
    index: u32,
    position: u32,
    sourceId: i32,
    tokens: [Token],
}

export fn createParser(SourceFile source) {
    let lexer = Lexer {
        source,
    };

    let tokens = [];
    while (lexer.hasNext()) {
        let token = lexer.nextToken();
        if (token.kind == TokenKind.Whitespace) continue;
        if (token.kind == TokenKind.LineComment) continue;
        if (token.kind == TokenKind.BlockComment) continue;
        tokens.push(token);
    }

    return Parser {
        index: 0,
        position: 0,
        tokens,
        sourceId: getSourceId(source.name),
    };
}

export fn parseProgram(Parser self, string name) {
    let statements = [];
    while (peek(self) != None) {
        statements.push(topLevelStatement(self));
    }

    return Program {
        span: Span {
            start: 0,
            end: name.length,
            parent: self.sourceId,
        },
        name: name,
        statements: statements,
    };
}

fn peek(Parser self, i32 offset) {
    return self.tokens.at(self.index + offset);
}
