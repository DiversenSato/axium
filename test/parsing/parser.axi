import super::ast::ast::{
    ArrayLiteral,
    AssignmentNode,
    BinaryExpression,
    BlockStatement,
    CallExpression,
    ContinueStatement,
    EnumDeclaration,
    ExpressionStatement,
    FunctionDeclaration,
    Identifier,
    IfStatement,
    ImportDeclaration,
    Lambda,
    LoopStatement,
    MatchExpression,
    MatchExpressionBranch,
    MemberExpression,
    NodeType,
    NumberLiteral,
    ReturnStatement,
    Parameter,
    Program,
    Span,
    StaticVariableDeclaration,
    StringLiteral,
    StructDeclaration,
    StructInstantiationExpression,
    StructKeyValuePair,
    StructMember,
    StructMemberBlock,
    Ternary,
    ThrowStatement,
    TypeAnnotation,
    UnaryExpression,
    VariableDeclaration,
    WhileStatement,
    ExpressionNode,
    Node,
    StructMethod,
    StructField,
    CharLiteral,
    ObjectLiteral
};
import super::lexer::lexer::{Lexer,TokenKind};
import super::span::sourceMap::{getSourceId};

fn SyntaxError(string message) {
    return Error(message);
}

export struct Parser {
    index: u32,
    position: u32,
    sourceId: i32,
    tokens: [Token],

    static fn from(SourceFile source) {
        let lexer = Lexer.from(source);

        let tokens = [];
        while (lexer.hasNext()) {
            let token = lexer.nextToken();
            if (token.kind == TokenKind.Eof) break;
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
    },

    fn peek(i32 offset) {
        if (!offset) offset = 0;
        return this.tokens.at(this.index + offset);
    },

    fn advance(): Token {
        this.index = this.index + 1;
        let token = this.tokens[this.index];
        if (!token) return SyntaxError("Unexpected end of input");
        this.position = this.position + token.span.len;
        return token;
    },

    fn expect(TokenKind type, string expectedValue): Token {
        let token = this.advance();
        if (token.kind != type) {
            return SyntaxError("Expected " + TokenKind[type], token.span);
        }
        if (expectedValue && token.value != expectedValue)
            return SyntaxError("Expected: '" + expectedValue + "', found: '" + token.value + "'", token.span);
        return token;
    },

    fn match(TokenKind type, string expectedValue): boolean {
        let token = this.peek();
        if (!token) return false;
        if (token.kind != type) return false;
        if (token.value != expectedValue) return false;
        return true;
    },

    fn parseProgram(string name) {
        let statements = [];
        while (this.peek() != None) {
            statements.push(this.topLevelStatement());
        }

        return Program {
            span: Span {
                start: 0,
                end: name.length,
                parent: this.sourceId,
            },
            name: name,
            statements: statements,
        };
    },

    fn topLevelStatement(): Node {
        //console.log('topLevelStatement');
        if (this.match(TokenKind.Identifier, "import")) return this.importStatement();
        if (this.match(TokenKind.Identifier, "fn")) return this.functionDeclaration();
        if (this.match(TokenKind.Identifier, "enum")) return this.enumDeclaration();
        if (this.match(TokenKind.Identifier, "struct")) return this.structDeclaration();

        // Functions/variables
        let modifiers = this.modifiers();
        if (this.match(TokenKind.Identifier, "fn")) return this.functionDeclaration(modifiers);
        if (this.match(TokenKind.Identifier, "enum")) return this.enumDeclaration(modifiers);
        if (this.match(TokenKind.Identifier, "struct")) return this.structDeclaration(modifiers);
        if (this.match(TokenKind.Identifier, "static")) return this.staticItem(modifiers);

        let token = this.advance();
        return Error("unknown token", token.span);
    },

    fn importStatement(): Node {
        let startSpan = this.expect(TokenKind.Identifier, "import").span;
        let identifiers = [Identifier.fromToken(this.expect(TokenKind.Identifier))];

        let items = [];
        while (this.match(TokenKind.DoubleColon)) {
            this.advance();

            if (this.match(TokenKind.OpenBrace)) {
                this.advance();
                items.push(Identifier.fromToken(this.expect(TokenKind.Identifier)));

                while (this.match(TokenKind.Comma)) {
                    this.advance();
                    items.push(Identifier.fromToken(this.expect(TokenKind.Identifier)));
                }

                this.expect(TokenKind.CloseBrace);
                break;
            }

            identifiers.push(Identifier.fromToken(this.expect(TokenKind.Identifier)));
        }
        let endSpan = this.expect(TokenKind.Semi).span;

        return ImportDeclaration.from(Span.fromEnclosing(startSpan, endSpan), identifiers, items);
    },
}
