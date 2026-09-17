import {
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
    type StructMember,
    StructMemberBlock,
    Ternary,
    ThrowStatement,
    TypeAnnotation,
    UnaryExpression,
    VariableDeclaration,
    WhileStatement,
    type ExpressionNode,
    type Node,
    StructMethod,
    StructField,
    CharLiteral,
    ObjectLiteral,
} from '../ast/ast.js';
import { SyntaxError } from '../errors/SyntaxError.js';
import { Lexer, Token, TokenKind } from '../lexer/lexer.js';
import { getSourceId, type SourceFile } from '../span/sourceMap.js';

const MODIFIERS = new Set(['export']);
const PRECEDENCE: Partial<Record<TokenKind, number>> = {
    [TokenKind.OpenBrace]: 50,

    // [TokenKind.Comma]: 1,

    // Assignment and misc
    [TokenKind.Equals]: 2,
    [TokenKind.Increment]: 2,
    [TokenKind.Arrow]: 2,
    [TokenKind.Question]: 2,

    // Logical OR
    [TokenKind.DoublePipe]: 3,

    // Logical AND
    [TokenKind.And]: 4,

    // Bitwise OR
    [TokenKind.Pipe]: 5,

    // Bitwise AND
    [TokenKind.Ampersand]: 6,

    // Equality
    [TokenKind.NotEquals]: 7,
    [TokenKind.DoubleEquals]: 7,

    // Relational
    [TokenKind.LessThan]: 8,
    [TokenKind.LessThanEquals]: 8,
    [TokenKind.GreaterThan]: 8,
    [TokenKind.GreaterThanEquals]: 8,

    // Addition
    [TokenKind.Plus]: 9,
    [TokenKind.Dash]: 9,

    // Scalar
    [TokenKind.Star]: 10,
    [TokenKind.ForwardSlash]: 10,

    // Access
    [TokenKind.OpenBracket]: 11,
    [TokenKind.Dot]: 11,

    // Grouping
    [TokenKind.OpenParen]: 12,
};

export class Parser {
    private index = 0;
    private position = 0;
    private readonly tokens: Token[];
    // The internal ID of the source file this parser is working on
    private readonly sourceId: number;

    public constructor(source: SourceFile) {
        const lexer = new Lexer(source);
        this.sourceId = getSourceId(source.name);

        const tokens: Token[] = [];
        while (lexer.hasNext()) {
            const token = lexer.nextToken();
            if (token.kind === TokenKind.Eof) break;
            if (token.kind === TokenKind.Whitespace) continue;
            if (token.kind === TokenKind.LineComment) continue;
            if (token.kind === TokenKind.BlockComment) continue;
            // if (token.kind === TokenKind.Unknown) continue;
            tokens.push(token);
        }
        this.tokens = tokens;
    }

    protected peek(offset?: number) {
        return this.tokens.at(this.index + (offset ?? 0));
    }

    private advance(): Token {
        const token = this.tokens[this.index++];
        if (token === undefined) throw new SyntaxError('Unexpected end of input');
        this.position += token.span.len;
        return token;
    }

    private expect(type: TokenKind, expectedValue?: string): Token {
        const token = this.advance();
        if (token.kind !== type) {
            throw new SyntaxError(`Expected ${TokenKind[type]}`, token.span);
        }
        if (expectedValue !== undefined && token.value !== expectedValue)
            throw new SyntaxError(`Expected: '${expectedValue}', found: '${token.value}'`, token.span);
        return token;
    }

    private match(type: TokenKind, expectedValue?: string): boolean {
        const token = this.peek();
        if (token === undefined) return false;
        if (token.kind !== type) return false;
        if (expectedValue !== undefined && token.value !== expectedValue) return false;
        return true;
    }

    public parseProgram(name: string): Program {
        const statements = [];
        while (this.peek() !== undefined) {
            statements.push(this.topLevelStatement());
        }

        return new Program(new Span(0, name.length, this.sourceId), name, statements);
    }

    private topLevelStatement(): Node {
        //console.log('topLevelStatement');
        if (this.match(TokenKind.Identifier, 'import')) return this.importStatement();
        if (this.match(TokenKind.Identifier, 'fn')) return this.functionDeclaration();
        if (this.match(TokenKind.Identifier, 'enum')) return this.enumDeclaration();
        if (this.match(TokenKind.Identifier, 'struct')) return this.structDeclaration();

        // Functions/variables
        const modifiers = this.modifiers();
        if (this.match(TokenKind.Identifier, 'fn')) return this.functionDeclaration(modifiers);
        if (this.match(TokenKind.Identifier, 'enum')) return this.enumDeclaration(modifiers);
        if (this.match(TokenKind.Identifier, 'struct')) return this.structDeclaration(modifiers);
        if (this.match(TokenKind.Identifier, 'static')) return this.staticItem(modifiers);

        const token = this.advance();
        throw new SyntaxError('unknown token', token.span);
    }

    private staticItem(modifiers: Identifier[]): StaticVariableDeclaration {
        const start = this.expect(TokenKind.Identifier, 'static').span;

        let isMutable = false;
        if (this.match(TokenKind.Identifier, 'mut')) {
            this.advance();
            isMutable = true;
        }

        const name = Identifier.fromToken(this.expect(TokenKind.Identifier));

        this.expect(TokenKind.Colon);
        const type = this.typeAnnotation();

        this.expect(TokenKind.Equals);
        const expr = this.expression();
        const end = this.expect(TokenKind.Semi).span;
        return new StaticVariableDeclaration(Span.fromEnclosing(start, end), name, type, isMutable, expr, modifiers);
    }

    private functionStatement(): Node {
        //console.log('functionStatement');
        if (this.match(TokenKind.Identifier, 'let')) return this.variableDeclaration();
        if (this.match(TokenKind.Identifier, 'if')) return this.ifStatement();
        if (this.match(TokenKind.Identifier, 'while')) return this.whileStatement();
        if (this.match(TokenKind.Identifier, 'loop')) return this.loopStatement();
        if (this.match(TokenKind.Identifier, 'return')) return this.returnStatement();
        if (this.match(TokenKind.Identifier, 'throw')) return this.throwStatement();
        if (this.match(TokenKind.Identifier, 'continue')) return this.continueStatement();
        if (this.match(TokenKind.Identifier, 'match')) return this.matchExpression();
        if (this.match(TokenKind.Identifier) && this.peek(1)?.kind === TokenKind.Equals) return this.assignment();

        return this.expressionStatement();
    }

    private structDeclaration(modifiers: Identifier[] = []): StructDeclaration {
        //console.log('structDeclaration');
        const startSpan = this.expect(TokenKind.Identifier, 'struct').span;
        const name = Identifier.fromToken(this.expect(TokenKind.Identifier));

        this.expect(TokenKind.OpenBrace);
        const members: StructMember[] = [];
        while (true) {
            if (this.match(TokenKind.Identifier, 'static')) {
                this.advance();
                members.push(new StructMethod(this.functionDeclaration(), true));
            } else if (this.match(TokenKind.Identifier, 'fn')) {
                members.push(new StructMethod(this.functionDeclaration()));
            } else {
                const name = Identifier.fromToken(this.expect(TokenKind.Identifier));
                this.expect(TokenKind.Colon);

                const type = this.typeAnnotation();
                members.push(new StructField(Span.fromEnclosing(name.span, type.span), name, type));
            }

            this.expect(TokenKind.Comma);
            if (this.match(TokenKind.CloseBrace)) break;
        }
        const endSpan = this.expect(TokenKind.CloseBrace).span;

        return new StructDeclaration(Span.fromEnclosing(startSpan, endSpan), name, members, modifiers);
    }

    private enumDeclaration(modifiers: Identifier[] = []): EnumDeclaration {
        //console.log('enumDeclaration');
        const startSpan = this.expect(TokenKind.Identifier, 'enum').span;
        const name = Identifier.fromToken(this.expect(TokenKind.Identifier));

        this.expect(TokenKind.OpenBrace);
        const symbols: Identifier[] = [];
        while (true) {
            symbols.push(Identifier.fromToken(this.expect(TokenKind.Identifier)));
            this.expect(TokenKind.Comma);
            if (this.match(TokenKind.CloseBrace)) break;
        }
        const endSpan = this.expect(TokenKind.CloseBrace).span;

        return new EnumDeclaration(Span.fromEnclosing(startSpan, endSpan), name, symbols, modifiers);
    }

    private matchExpression(): MatchExpression {
        //console.log('matchExpression');
        const startSpan = this.expect(TokenKind.Identifier, 'match').span;

        this.expect(TokenKind.OpenParen);
        const expression = this.expression();
        this.expect(TokenKind.CloseParen);

        this.expect(TokenKind.OpenBrace);
        const branches: MatchExpressionBranch[] = [];
        do {
            branches.push(this.matchExpressionBranch());
        } while (!this.match(TokenKind.CloseBrace));
        const endSpan = this.expect(TokenKind.CloseBrace).span;

        return new MatchExpression(Span.fromEnclosing(startSpan, endSpan), expression, branches);
    }

    private matchExpressionBranch(): MatchExpressionBranch {
        //console.log('matchExpressionBranch');
        const token = this.advance();

        let match: Identifier | NumberLiteral | StringLiteral;
        if (token.kind === TokenKind.Identifier) {
            match = Identifier.fromToken(token);
        } else if (token.kind === TokenKind.NumberLiteral) {
            match = NumberLiteral.fromToken(token);
        } else if (token.kind === TokenKind.StringLiteral) {
            match = StringLiteral.fromToken(token);
        } else {
            throw new SyntaxError('Unknown token in match branch', token.span);
        }

        this.expect(TokenKind.Equals);
        this.expect(TokenKind.GreaterThan);

        const expression = this.expression();
        const endSpan = this.expect(TokenKind.Comma).span;

        return new MatchExpressionBranch(Span.fromEnclosing(token.span, endSpan), match, expression);
    }

    private expressionStatement(): ExpressionStatement {
        //console.log('expressionStatement');
        const expression = this.expression();
        const endSpan = this.expect(TokenKind.Semi).span;
        return new ExpressionStatement(Span.fromEnclosing(expression.span, endSpan), expression);
    }

    private blockStatement(): BlockStatement {
        //console.log('blockStatement');
        if (!this.match(TokenKind.OpenBrace)) {
            const stmt = this.functionStatement();
            return new BlockStatement(stmt.span, [stmt]);
        }

        const startSpan = this.expect(TokenKind.OpenBrace).span;
        const statements = [];
        while (!this.match(TokenKind.CloseBrace)) {
            statements.push(this.functionStatement());
        }
        const endSpan = this.expect(TokenKind.CloseBrace).span;
        return new BlockStatement(Span.fromEnclosing(startSpan, endSpan), statements);
    }

    private importStatement(): Node {
        const startSpan = this.expect(TokenKind.Identifier, 'import').span;
        const identifiers = [Identifier.fromToken(this.expect(TokenKind.Identifier))];

        const items: Identifier[] = [];
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
        const endSpan = this.expect(TokenKind.Semi).span;

        return new ImportDeclaration(Span.fromEnclosing(startSpan, endSpan), identifiers, items);
    }

    private typeAnnotation(): TypeAnnotation {
        const isArray = this.match(TokenKind.OpenBracket);
        if (isArray) this.advance();
        const type = this.expect(TokenKind.Identifier);

        const parameters: TypeAnnotation[] = [];
        if (this.match(TokenKind.LessThan)) {
            this.advance();
            while (true) {
                parameters.push(this.typeAnnotation());
                if (this.match(TokenKind.GreaterThan)) break;
                this.expect(TokenKind.Comma);
            }
            this.expect(TokenKind.GreaterThan);
        }

        if (isArray) this.expect(TokenKind.CloseBracket);

        return new TypeAnnotation(type.span, Identifier.fromToken(type), parameters, isArray);
    }

    private functionDeclaration(modifiers: Identifier[] = []): FunctionDeclaration {
        //console.log('functionDeclaration');
        const startSpan = this.expect(TokenKind.Identifier, 'fn').span;
        const functionName = this.expect(TokenKind.Identifier);
        this.expect(TokenKind.OpenParen);

        const parameters: Parameter[] = [];
        if (this.match(TokenKind.Identifier) || this.match(TokenKind.OpenBracket)) {
            // Arguments
            while (true) {
                const type = this.typeAnnotation();
                const name = this.expect(TokenKind.Identifier);
                parameters.push(new Parameter(type, Identifier.fromToken(name)));
                if (this.match(TokenKind.CloseParen)) break;
                this.expect(TokenKind.Comma);
            }
        }

        this.expect(TokenKind.CloseParen);

        let type: Identifier | null = null;
        if (this.match(TokenKind.Colon)) {
            this.expect(TokenKind.Colon);
            type = Identifier.fromToken(this.expect(TokenKind.Identifier));
        }

        const node = new FunctionDeclaration(
            startSpan,
            Identifier.fromToken(functionName),
            type,
            parameters,
            this.blockStatement(),
            modifiers,
        );
        return node;
    }

    private variableDeclaration(): VariableDeclaration {
        //console.log('variableDeclaration');
        const startSpan = this.expect(TokenKind.Identifier, 'let').span;

        let isMutable = false;
        if (this.match(TokenKind.Identifier, 'mut')) {
            isMutable = true;
            this.expect(TokenKind.Identifier, 'mut');
        }

        const functionName = this.expect(TokenKind.Identifier);
        let type: TypeAnnotation | null = null;
        if (this.match(TokenKind.Colon)) {
            this.expect(TokenKind.Colon);
            type = this.typeAnnotation();
        }

        this.expect(TokenKind.Equals);

        // Parse initialiser
        const expression = this.expression();

        const endSpan = this.expect(TokenKind.Semi).span;
        return new VariableDeclaration(
            Span.fromEnclosing(startSpan, endSpan),
            Identifier.fromToken(functionName),
            type,
            isMutable,
            expression,
        );
    }

    private assignment(): AssignmentNode {
        //console.log('assignment');
        const name = this.expect(TokenKind.Identifier);

        this.expect(TokenKind.Equals);

        const expression = this.expression();
        const endSpan = this.expect(TokenKind.Semi).span;
        return new AssignmentNode(Span.fromEnclosing(name.span, endSpan), Identifier.fromToken(name), expression);
    }

    private expression(minBp?: number): ExpressionNode {
        //console.log('expression');
        let left = this.prefix();
        if (left.nodeType === NodeType.Lambda) return left;

        while (true) {
            const operator = this.peek();
            if (operator === undefined) break;
            const bp = PRECEDENCE[operator.kind] ?? -1;
            if (bp <= (minBp ?? 0)) break;

            this.advance(); // Consume operator

            if (operator.kind === TokenKind.Dot) {
                const property = this.expect(TokenKind.Identifier);
                left = new MemberExpression(left, Identifier.fromToken(property));
            } else if (operator.kind === TokenKind.OpenParen) {
                // Call expression
                const args = this.args();
                left = new CallExpression(left, args);
            } else if (operator.kind === TokenKind.OpenBracket) {
                // member index like car.wheels[2]
                const index = this.expression(0);
                this.expect(TokenKind.CloseBracket);
                left = new MemberExpression(left, index, true);
            } else if (operator.kind === TokenKind.Question) {
                const y = this.expression();
                this.expect(TokenKind.Colon);
                const z = this.expression();
                left = new Ternary(Span.fromEnclosing(left.span, z.span), left, y, z);
            } else {
                const right = this.expression(bp);
                left = new BinaryExpression(operator.value, left, right);
            }
        }

        return left;
    }

    private prefix(): ExpressionNode {
        //console.log('prefix');
        if (this.match(TokenKind.Identifier, 'match')) return this.matchExpression();

        const token = this.advance();

        switch (token.kind) {
            case TokenKind.NumberLiteral:
                return NumberLiteral.fromToken(token);
            case TokenKind.CharLiteral:
                return CharLiteral.fromToken(token);
            case TokenKind.StringLiteral:
                return StringLiteral.fromToken(token);
            case TokenKind.Identifier: {
                if (this.match(TokenKind.OpenParen)) return this.callExpression(Identifier.fromToken(token));
                if (this.match(TokenKind.OpenBrace)) return this.structMemberBlock(Identifier.fromToken(token));
                return Identifier.fromToken(token);
            }
            case TokenKind.Dash:
                return new UnaryExpression('-', this.expression(25));
            case TokenKind.Exclamation:
                return new UnaryExpression('!', this.expression(25));
            case TokenKind.Plus: {
                if (this.match(TokenKind.Plus)) {
                    this.advance();
                    return new UnaryExpression('++', this.expression(25));
                }
                break;
            }
            case TokenKind.OpenParen: {
                // Grouping
                const inner = this.expression(0);

                if (this.match(TokenKind.Comma)) {
                    // Lambda with many parameters
                    this.advance();

                    if (!(inner instanceof Identifier))
                        throw new SyntaxError('parameter must be an identifier', inner.span);
                    const parameters = [inner];
                    while (true) {
                        parameters.push(Identifier.fromToken(this.expect(TokenKind.Identifier)));
                        if (this.match(TokenKind.CloseParen)) break;
                        this.expect(TokenKind.Comma);
                    }
                    this.expect(TokenKind.CloseParen);
                    this.expect(TokenKind.Arrow);
                    const expr = this.expression();
                    return new Lambda(Span.fromEnclosing(token.span, expr.span), parameters, expr);
                }

                this.expect(TokenKind.CloseParen);

                if (this.match(TokenKind.Arrow)) {
                    // Lambda with 1 parameter
                    this.advance();
                    if (!(inner instanceof Identifier))
                        throw new SyntaxError('parameter must be an identifier', inner.span);
                    const expr = this.expression();
                    return new Lambda(Span.fromEnclosing(token.span, expr.span), [inner], expr);
                }

                return inner;
            }
            case TokenKind.OpenBracket: {
                if (this.match(TokenKind.CloseBracket)) {
                    const end = this.advance().span;
                    return new ArrayLiteral(Span.fromEnclosing(token.span, end), []);
                }

                const values = [];
                while (true) {
                    values.push(this.expression());
                    if (this.match(TokenKind.CloseBracket)) break;
                    this.expect(TokenKind.Comma);
                }
                const end = this.advance().span;
                return new ArrayLiteral(Span.fromEnclosing(token.span, end), values);
            }
            case TokenKind.OpenBrace: {
                const values: Record<string, ExpressionNode | null> = {};
                while (true) {
                    if (this.match(TokenKind.CloseBrace)) break;
                    const key = this.expect(TokenKind.Identifier);
                    let val: ExpressionNode | null = null;
                    if (this.match(TokenKind.Colon)) {
                        this.advance();
                        val = this.expression();
                    }
                    values[key.value] = val;

                    if (!this.match(TokenKind.Comma)) break;
                    this.advance(); // Consume comma
                }
                const end = this.expect(TokenKind.CloseBrace).span;
                return new ObjectLiteral(Span.fromEnclosing(token.span, end), values);
            }
        }

        throw new SyntaxError(`unexpected token: ${TokenKind[token.kind]}`, token.span);
    }

    private args(): ExpressionNode[] {
        //console.log('args');
        const args: ExpressionNode[] = [];
        if (this.match(TokenKind.CloseParen)) {
            this.advance();
            return args;
        }

        do {
            args.push(this.expression());
        } while (this.match(TokenKind.Comma) && this.advance());

        this.expect(TokenKind.CloseParen);
        return args;
    }

    private structMemberBlock(structName: Identifier): StructInstantiationExpression {
        //console.log('structMemberBlock');
        const start = this.expect(TokenKind.OpenBrace).span;
        const values: StructKeyValuePair[] = [];
        while (!this.match(TokenKind.CloseBrace)) {
            const property = Identifier.fromToken(this.expect(TokenKind.Identifier));

            let expr: ExpressionNode = property;
            if (this.match(TokenKind.Colon)) {
                this.expect(TokenKind.Colon);
                expr = this.expression();
            }

            const end = this.expect(TokenKind.Comma).span;

            values.push(new StructKeyValuePair(Span.fromEnclosing(property.span, end), property, expr));
        }
        const end = this.expect(TokenKind.CloseBrace).span;
        const block = new StructMemberBlock(Span.fromEnclosing(start, end), values);
        return new StructInstantiationExpression(structName, block);
    }

    private callExpression(name: Identifier): CallExpression {
        //console.log('callExpression');
        this.expect(TokenKind.OpenParen);
        const expressions = [];
        if (!this.match(TokenKind.CloseParen)) {
            while (true) {
                expressions.push(this.expression());
                if (this.match(TokenKind.CloseParen)) break;
                this.expect(TokenKind.Comma);
            }
        }
        this.expect(TokenKind.CloseParen);
        return new CallExpression(name, expressions);
    }

    private modifiers(): Identifier[] {
        //console.log('modifiers');
        const modifiers: Identifier[] = [];

        while (this.match(TokenKind.Identifier) && MODIFIERS.has(this.peek()!.value)) {
            modifiers.push(Identifier.fromToken(this.advance()));
        }

        return modifiers;
    }

    private ifStatement(): IfStatement {
        //console.log('ifStatement');
        const startSpan = this.expect(TokenKind.Identifier, 'if').span;
        this.expect(TokenKind.OpenParen);
        const condition = this.expression();
        this.expect(TokenKind.CloseParen);

        const block = this.blockStatement();
        if (this.match(TokenKind.Identifier, 'else')) {
            this.advance(); // Consume "else"
            if (this.match(TokenKind.Identifier, 'if'))
                return new IfStatement(startSpan, condition, block, this.ifStatement());
            if (this.match(TokenKind.OpenBrace))
                return new IfStatement(startSpan, condition, block, this.blockStatement());
            return new IfStatement(startSpan, condition, block, this.functionStatement());
        }
        return new IfStatement(Span.fromEnclosing(startSpan, block.span), condition, block);
    }

    private whileStatement(): WhileStatement {
        //console.log('whileStatement');
        const startSpan = this.expect(TokenKind.Identifier, 'while').span;
        this.expect(TokenKind.OpenParen);
        const condition = this.expression();
        this.expect(TokenKind.CloseParen);

        const block = this.blockStatement();
        return new WhileStatement(Span.fromEnclosing(startSpan, block.span), condition, block);
    }

    private loopStatement(): LoopStatement {
        //console.log('loopStatement');
        const span = this.expect(TokenKind.Identifier, 'loop').span;
        const block = this.blockStatement();
        return new LoopStatement(Span.fromEnclosing(span, block.span), block);
    }

    private returnStatement(): ReturnStatement {
        //console.log('returnStatement');
        const span = this.expect(TokenKind.Identifier, 'return').span;
        if (this.match(TokenKind.Semi)) {
            this.advance();
            return new ReturnStatement(span);
        }

        const node = new ReturnStatement(span, this.expression());
        this.expect(TokenKind.Semi);
        return node;
    }

    private throwStatement(): ThrowStatement {
        //console.log('throwStatement');
        const startSpan = this.expect(TokenKind.Identifier, 'throw').span;
        const expression = this.expression();
        const endSpan = this.expect(TokenKind.Semi).span;
        return new ThrowStatement(Span.fromEnclosing(startSpan, endSpan), expression);
    }

    private continueStatement(): ContinueStatement {
        //console.log('continueStatement');
        const start = this.expect(TokenKind.Identifier, 'continue').span;
        this.expect(TokenKind.Semi);
        return new ContinueStatement(start);
    }
}
