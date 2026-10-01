import {
    ArrayLiteral,
    AssignmentNode,
    BinaryExpression,
    type BlockStatement,
    CallExpression,
    type EnumDeclaration,
    EnumVariant,
    type FunctionDeclaration,
    Identifier,
    type ImportDeclaration,
    Lambda,
    MatchExpression,
    MatchExpressionBranch,
    MemberExpression,
    NodeType,
    NumberLiteral,
    Parameter,
    Span,
    type StaticVariableDeclaration,
    StringLiteral,
    type StructDeclaration,
    StructInstantiationExpression,
    StructKeyValuePair,
    type StructMember,
    StructMemberBlock,
    Ternary,
    TypeAnnotation,
    UnaryExpression,
    type ExpressionNode,
    StructMethod,
    StructField,
    CharLiteral,
    ObjectLiteral,
    type Item,
    type Statement,
} from '../ast/ast.js';
import { SyntaxError } from '../errors/SyntaxError.js';
import type { Token, TokenKind } from '../lexer/lexer.js';

const MODIFIERS = new Set(['export']);
const PRECEDENCE: Partial<Record<string, number>> = {
    // Assignment and misc
    '=': 1,
    '+=': 1,
    '++': 1,
    '=>': 1,
    '?': 2,

    '||': 3,
    '&&': 4,

    '|': 5,
    '^': 6,
    '&': 7,

    // Equality
    '!=': 8,
    '==': 8,

    // Relational
    '<': 9,
    '<=': 9,
    '>': 9,
    '>=': 9,

    // Addition
    '+': 10,
    '-': 10,

    // Scalar
    '*': 11,
    '/': 11,
    '%': 11,

    '{': 50,
};
const RIGHT_ASSOC = new Set(['=', '+=', '-=', '*=', '/=', '?']);
const UNARY_BP = 13;
const POSTFIX_BP = 13;

export class Parser {
    private index = 0;

    public constructor(private readonly tokens: Token[]) {}

    protected peek(offset?: number) {
        return this.tokens.at(this.index + (offset ?? 0));
    }

    private advance(): Token {
        const token = this.tokens[this.index++];
        if (token === undefined) throw new SyntaxError('Unexpected end of input');
        return token;
    }

    private expect(type: TokenKind, expectedValue?: string): Token {
        const token = this.advance();
        if (token.kind !== type) {
            throw new SyntaxError(`Expected ${expectedValue ?? type}`, token.span);
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

    private eat(type: TokenKind, expectedValue?: string): boolean {
        const result = this.match(type, expectedValue);
        if (result) this.advance();
        return result;
    }

    public parse(): Item[] {
        const items = [];
        while (!this.match('eof')) items.push(this.item());
        if (items.length) return items;
        throw new SyntaxError('file is empty');
    }

    private item(): Item {
        if (this.match('ident', 'import')) return this.importDeclaration();
        if (this.match('ident', 'fn')) return this.functionDeclaration();
        if (this.match('ident', 'enum')) return this.enumDeclaration();
        if (this.match('ident', 'struct')) return this.structDeclaration();

        // Functions/variables
        const modifiers = this.modifiers();
        if (this.match('ident', 'fn')) return this.functionDeclaration(modifiers);
        if (this.match('ident', 'enum')) return this.enumDeclaration(modifiers);
        if (this.match('ident', 'struct')) return this.structDeclaration(modifiers);
        if (this.match('ident', 'static')) return this.staticItem(modifiers);

        const token = this.advance();
        throw new SyntaxError('unknown token', token.span);
    }

    private staticItem(modifiers: string[]): StaticVariableDeclaration {
        const start = this.expect('ident', 'static').span;

        let isMutable = false;
        if (this.match('ident', 'mut')) {
            this.advance();
            isMutable = true;
        }

        const name = Identifier.fromToken(this.expect('ident'));

        this.expect('punct', 'colon');
        const type = this.typeAnnotation();

        this.expect('punct', '=');
        const expr = this.expression();
        const end = this.expect('punct', ';').span;
        return {
            kind: 'staticVar',
            init: expr,
            isMutable,
            name,
            modifiers,
            type,
            span: Span.from(start, end),
        };
    }

    private statement(): Statement {
        const token = this.peek();
        if (token?.kind === 'ident') {
            switch (token.value) {
                case 'let': {
                    return this.variableDeclaration();
                }
                case 'if':
                    return this.ifStatement();
                case 'while':
                    return this.whileStatement();
                case 'loop': {
                    const start = this.expect('ident', 'loop').span;
                    const block = this.block();
                    return { kind: 'loop', block, span: Span.from(start, block.span) };
                }
                case 'return': {
                    const start = this.expect('ident', 'return').span;
                    if (this.eat('punct', ';')) return { kind: 'return', span: start };

                    const expression = this.expression();
                    this.expect('punct', ';');
                    return { kind: 'return', expression, span: start };
                }
                case 'break':
                case 'continue': {
                    this.advance();
                    const end = this.expect('punct', ';').span;
                    return { kind: token.value, span: Span.from(token.span, end) };
                }
            }
        }

        return this.expressionStatement();
    }

    private structDeclaration(modifiers: string[] = []): StructDeclaration {
        const startSpan = this.expect('ident', 'struct').span;
        const name = Identifier.fromToken(this.expect('ident'));

        this.expect('punct', '{');
        const members: StructMember[] = [];
        while (!this.match('punct', '}')) {
            if (this.match('ident', 'static')) {
                this.advance();
                members.push(new StructMethod(this.functionDeclaration(), true));
                continue;
            } else if (this.match('ident', 'fn')) {
                members.push(new StructMethod(this.functionDeclaration()));
                continue;
            } else {
                const name = Identifier.fromToken(this.expect('ident'));
                this.expect('punct', ':');

                const type = this.typeAnnotation();
                members.push(new StructField(Span.from(name.span, type.span), name, type));
            }

            if (this.match('punct', ';')) this.expect('punct', ';');
            else break;
        }
        const endSpan = this.expect('punct', '}').span;

        return {
            kind: 'struct',
            members,
            name,
            modifiers,
            span: Span.from(startSpan, endSpan),
        };
    }

    private enumDeclaration(modifiers: string[] = []): EnumDeclaration {
        const startSpan = this.expect('ident', 'enum').span;
        const name = Identifier.fromToken(this.expect('ident'));

        this.expect('punct', '{');
        const variants: EnumVariant[] = [];
        while (!this.match('punct', '}')) {
            const name = Identifier.fromToken(this.expect('ident'));

            if (this.match('punct', '(')) {
                this.advance();

                const tupleItems: Identifier[] = [];
                while (!this.match('punct', ')')) {
                    tupleItems.push(Identifier.fromToken(this.expect('ident')));
                    if (!this.match('punct', ',')) break;
                    this.advance();
                }

                variants.push(
                    new EnumVariant(name.span, name, {
                        kind: 'tuple',
                        payload: tupleItems,
                    }),
                );
                this.expect('punct', ')');
            } else {
                variants.push(new EnumVariant(name.span, name, undefined));
            }

            if (!this.match('punct', ',')) break;
            this.advance();
        }
        const endSpan = this.expect('punct', '}').span;

        return {
            kind: 'enum',
            modifiers,
            name,
            span: Span.from(startSpan, endSpan),
            variants,
        };
    }

    private matchExpression(): MatchExpression {
        const startSpan = this.expect('ident', 'match').span;

        this.expect('punct', '(');
        const expression = this.expression();
        this.expect('punct', ')');

        this.expect('punct', '{');
        const branches: MatchExpressionBranch[] = [];
        do {
            branches.push(this.matchExpressionBranch());
        } while (!this.match('punct', '}'));
        const endSpan = this.expect('punct', '}').span;

        return new MatchExpression(Span.from(startSpan, endSpan), expression, branches);
    }

    private matchExpressionBranch(): MatchExpressionBranch {
        //console.log('matchExpressionBranch');
        const token = this.advance();

        let match: Identifier | NumberLiteral | StringLiteral;
        if (token.kind === 'ident') {
            match = Identifier.fromToken(token);
        } else if (token.kind === 'int' || token.kind === 'float') {
            match = NumberLiteral.fromToken(token);
        } else if (token.kind === 'str') {
            match = StringLiteral.fromToken(token);
        } else {
            throw new SyntaxError('Unknown token in match branch', token.span);
        }

        this.expect('punct', '=>');

        const expression = this.expression();
        const endSpan = this.expect('punct', ',').span;

        return new MatchExpressionBranch(Span.from(token.span, endSpan), match, expression);
    }

    private expressionStatement(): Statement {
        const expression = this.expression();
        const end = this.expect('punct', ';').span;
        return { kind: 'expression', expression, span: Span.from(expression.span, end) };
    }

    private block(): BlockStatement {
        if (!this.match('punct', '{')) {
            const stmt = this.statement();
            return { kind: 'block', statements: [stmt], span: stmt.span };
        }

        const startSpan = this.expect('punct', '{').span;
        const statements = [];
        while (!this.match('punct', '}')) {
            statements.push(this.statement());
        }
        const endSpan = this.expect('punct', '}').span;
        return { kind: 'block', statements, span: Span.from(startSpan, endSpan) };
    }

    private importDeclaration(): ImportDeclaration {
        const startSpan = this.expect('ident', 'import').span;
        const identifiers = [Identifier.fromToken(this.expect('ident'))];

        const items: Identifier[] = [];
        while (this.match('punct', '::')) {
            this.advance();

            if (this.match('punct', '{')) {
                this.advance();
                items.push(Identifier.fromToken(this.expect('ident')));

                while (this.match('punct', ',')) {
                    this.advance();
                    items.push(Identifier.fromToken(this.expect('ident')));
                }

                this.expect('punct', '}');
                break;
            }

            identifiers.push(Identifier.fromToken(this.expect('ident')));
        }
        const endSpan = this.expect('punct', ';').span;

        return {
            kind: 'import',
            items,
            module: identifiers,
            span: Span.from(startSpan, endSpan),
        };
    }

    private typeAnnotation(): TypeAnnotation {
        const type = this.expect('ident');

        const parameters: TypeAnnotation[] = [];
        if (this.match('punct', '<')) {
            this.advance();
            while (true) {
                parameters.push(this.typeAnnotation());
                if (this.match('punct', '>')) break;
                this.expect('punct', ',');
            }
            this.expect('punct', '>');
        }

        const isArray = this.match('punct', '[');
        if (isArray) {
            this.advance();
            this.expect('punct', ']');
        }

        return new TypeAnnotation(type.span, Identifier.fromToken(type), parameters, isArray);
    }

    private functionDeclaration(modifiers: string[] = []): FunctionDeclaration {
        const startSpan = this.expect('ident', 'fn').span;
        const name = this.expect('ident').value;
        this.expect('punct', '(');

        const parameters: Parameter[] = [];
        while (!this.match('punct', ')')) {
            const type = this.typeAnnotation();
            const name = this.expect('ident');
            parameters.push(new Parameter(type, Identifier.fromToken(name)));

            if (this.match('punct', ',')) this.expect('punct', ',');
            else break;
        }
        this.expect('punct', ')');

        let type: TypeAnnotation | null = null;
        if (this.eat('punct', ':')) {
            type = this.typeAnnotation();
        }

        const block = this.block();
        return { kind: 'function', name, parameters, type, block, modifiers, span: Span.from(startSpan, block.span) };
    }

    private variableDeclaration(): Statement {
        const startSpan = this.expect('ident', 'let').span;

        const mutable = this.eat('ident', 'mut');
        const name = this.expect('ident').value;
        const type = this.eat('punct', ':') ? this.typeAnnotation() : undefined;

        this.expect('punct', '=');

        const init = this.expression();
        const endSpan = this.expect('punct', ';').span;
        return { kind: 'let', name, mutable, type, init, span: Span.from(startSpan, endSpan) };
    }

    private expression(minBp = 0): ExpressionNode {
        let left = this.prefix();
        if (left.nodeType === NodeType.Lambda) return left;

        while (true) {
            const operator = this.peek();
            if (operator?.kind !== 'punct') break;

            if (operator.value === '(' || operator.value === '.' || operator.value === '[') {
                if (POSTFIX_BP <= minBp) break;
                left = this.postfix(left);
                continue;
            }

            const bp = PRECEDENCE[operator.kind];
            if (bp === undefined || bp <= minBp) break;
            this.advance(); // Consume operator
            const rightBp = RIGHT_ASSOC.has(operator.value) ? bp - 1 : bp;

            if (operator.value === '?') {
                const y = this.expression();
                this.expect('punct', ':');
                const z = this.expression();
                left = new Ternary(Span.from(left.span, z.span), left, y, z);
            } else if (bp === PRECEDENCE['=']) {
                if (left.nodeType !== NodeType.Identifier && left.nodeType !== NodeType.MemberExpression)
                    throw new SyntaxError('invalid assignment target', left.span);

                const value = this.expression(rightBp);
                left = new AssignmentNode(left.span, left as Identifier, value);
            } else {
                const right = this.expression(rightBp);
                left = new BinaryExpression(operator.value, left, right);
            }
        }

        return left;
    }

    private prefix(): ExpressionNode {
        //console.log('prefix');
        if (this.match('ident', 'match')) return this.matchExpression();

        const token = this.advance();

        switch (token.kind) {
            case 'int':
            case 'float':
                return NumberLiteral.fromToken(token);
            case 'char':
                return CharLiteral.fromToken(token);
            case 'str':
                return StringLiteral.fromToken(token);
            case 'ident': {
                if (this.match('punct', '(')) return this.callExpression(Identifier.fromToken(token));
                if (this.match('punct', '{')) return this.structMemberBlock(Identifier.fromToken(token));
                return Identifier.fromToken(token);
            }
            case 'punct': {
                switch (token.value) {
                    case '-':
                    case '!':
                        return new UnaryExpression(token.value, this.expression(UNARY_BP - 1));
                    case '+': {
                        if (this.match('punct', '+')) {
                            this.advance();
                            return new UnaryExpression('++', this.expression(25));
                        }
                        break;
                    }
                    case '(': {
                        // Grouping
                        const inner = this.expression(0);

                        if (this.match('punct', ',')) {
                            // Lambda with many parameters
                            this.advance();

                            if (!(inner instanceof Identifier))
                                throw new SyntaxError('parameter must be an identifier', inner.span);
                            const parameters = [inner];
                            while (true) {
                                parameters.push(Identifier.fromToken(this.expect('ident')));
                                if (this.match('punct', ')')) break;
                                this.expect('punct', ',');
                            }
                            this.expect('punct', ')');
                            this.expect('punct', '=>');
                            const expr = this.expression();
                            return new Lambda(Span.from(token.span, expr.span), parameters, expr);
                        }

                        this.expect('punct', ')');

                        if (this.match('punct', '=>')) {
                            // Lambda with 1 parameter
                            this.advance();
                            if (!(inner instanceof Identifier))
                                throw new SyntaxError('parameter must be an identifier', inner.span);
                            const expr = this.expression();
                            return new Lambda(Span.from(token.span, expr.span), [inner], expr);
                        }

                        return inner;
                    }
                    case '[': {
                        if (this.match('punct', ']')) {
                            const end = this.advance().span;
                            return new ArrayLiteral(Span.from(token.span, end), []);
                        }

                        const values = [];
                        while (true) {
                            values.push(this.expression());
                            if (this.match('punct', ']')) break;
                            this.expect('punct', ',');
                        }
                        const end = this.advance().span;
                        return new ArrayLiteral(Span.from(token.span, end), values);
                    }
                    case '{': {
                        const values: Record<string, ExpressionNode | null> = {};
                        while (true) {
                            if (this.match('punct', '}')) break;
                            const key = this.expect('ident');
                            let val: ExpressionNode | null = null;
                            if (this.match('punct', ':')) {
                                this.advance();
                                val = this.expression();
                            }
                            values[key.value] = val;

                            if (!this.match('punct', ',')) break;
                            this.advance(); // Consume comma
                        }
                        const end = this.expect('punct', '}').span;
                        return new ObjectLiteral(Span.from(token.span, end), values);
                    }
                }
            }
        }

        throw new SyntaxError(`unexpected token: ${token.value}`, token.span);
    }

    private postfix(left: ExpressionNode): ExpressionNode {
        const operator = this.advance();
        if (operator.value === '(') {
            const args: ExpressionNode[] = [];
            while (!this.match('punct', ')')) {
                args.push(this.expression());
                if (!this.match('punct', ',')) break;
                this.advance();
            }
            this.expect('punct', ')');
            return new CallExpression(left, args);
        }

        if (operator.value === '.') {
            const name = Identifier.fromToken(this.expect('ident'));
            return new MemberExpression(left, name);
        }

        const index = this.expression();
        this.expect('punct', ']');
        return new MemberExpression(left, index, true);
    }

    private structMemberBlock(structName: Identifier): StructInstantiationExpression {
        //console.log('structMemberBlock');
        const start = this.expect('punct', '{').span;
        const values: StructKeyValuePair[] = [];
        while (!this.match('punct', '}')) {
            const property = Identifier.fromToken(this.expect('ident'));

            let expr: ExpressionNode = property;
            if (this.match('punct', ':')) {
                this.expect('punct', ':');
                expr = this.expression();
            }

            const end = this.expect('punct', ',').span;

            values.push(new StructKeyValuePair(Span.from(property.span, end), property, expr));
        }
        const end = this.expect('punct', '}').span;
        const block = new StructMemberBlock(Span.from(start, end), values);
        return new StructInstantiationExpression(structName, block);
    }

    private callExpression(name: Identifier): CallExpression {
        //console.log('callExpression');
        this.expect('punct', '(');
        const expressions = [];
        if (!this.match('punct', ')')) {
            while (true) {
                expressions.push(this.expression());
                if (this.match('punct', ')')) break;
                this.expect('punct', ',');
            }
        }
        this.expect('punct', ')');
        return new CallExpression(name, expressions);
    }

    private modifiers(): string[] {
        const modifiers: string[] = [];

        while (this.match('ident') && MODIFIERS.has(this.peek()!.value)) {
            modifiers.push(this.advance().value);
        }

        return modifiers;
    }

    private ifStatement(): Statement {
        const startSpan = this.expect('ident', 'if').span;
        this.expect('punct', '(');
        const condition = this.expression();
        this.expect('punct', ')');

        const block = this.block();
        if (this.eat('ident', 'else')) {
            const els = this.block();
            return { kind: 'if', condition, then: block, else: els, span: Span.from(startSpan, els.span) };
        }
        return { kind: 'if', condition, then: block, span: Span.from(startSpan, block.span) };
    }

    private whileStatement(): Statement {
        const startSpan = this.expect('ident', 'while').span;
        this.expect('punct', '(');
        const condition = this.expression();
        this.expect('punct', ')');

        const block = this.block();
        return { kind: 'while', condition, block, span: Span.from(startSpan, block.span) };
    }
}
