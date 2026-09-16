import type { Token } from '../lexer/lexer.js';

export enum NodeType {
    Program,
    Identifier,
    ImportDeclaration,
    TypeAnnotation,
    Parameter,
    BlockStatement,
    FunctionDeclaration,
    IfStatement,
    WhileStatement,
    LoopStatement,
    ReturnStatement,
    ThrowStatement,
    ContinueStatement,
    VariableDeclaration,
    StaticVariableDeclaration,
    AssignmentNode,
    ExpressionStatement,
    NumberLiteral,
    CharLiteral,
    StringLiteral,
    ArrayLiteral,
    Lambda,
    Ternary,
    UnaryExpression,
    BinaryExpression,
    CallExpression,
    MemberExpression,
    MatchExpressionBranch,
    MatchExpression,
    EnumDeclaration,
    StructMember,
    StructMethod,
    StructDeclaration,
    StructKeyValuePair,
    StructMemberBlock,
    StructInstantiationExpression,
}

export class Span {
    public readonly len: number;

    constructor(
        public readonly start: number,
        public readonly end: number,
        public readonly parent: number,
    ) {
        this.len = end - start;
    }

    public static fromEnclosing(start: Span, end: Span): Span {
        return new Span(start.start, end.end, start.parent);
    }
}

export class Node {
    public static counter = 0;
    public id = Node.counter++;

    public constructor(
        public readonly span: Span,
        public readonly nodeType: NodeType,
    ) {}
}

export class Identifier extends Node {
    public constructor(
        span: Span,
        public readonly value: string,
    ) {
        super(span, NodeType.Identifier);
        Node.counter++;
    }

    public static fromToken(token: Token): Identifier {
        return new Identifier(token.span, token.value);
    }
}

export class Program extends Node {
    public constructor(
        span: Span,
        public readonly name: string,
        public statements: Node[],
    ) {
        super(span, NodeType.Program);
    }
}

export class ImportDeclaration extends Node {
    public constructor(
        span: Span,
        public readonly module: Identifier[],
        public readonly items: Identifier[],
    ) {
        super(span, NodeType.ImportDeclaration);
    }
}

export class TypeAnnotation extends Node {
    public constructor(
        span: Span,
        public readonly type: Identifier,
        public readonly parameters: TypeAnnotation[],
        public readonly isArray: boolean,
    ) {
        super(span, NodeType.TypeAnnotation);
    }
}

export class Parameter extends Node {
    public constructor(
        public readonly type: TypeAnnotation,
        public readonly name: Identifier,
    ) {
        super(Span.fromEnclosing(type.span, name.span), NodeType.Parameter);
    }
}

export class BlockStatement extends Node {
    constructor(
        span: Span,
        public readonly statements: Node[],
    ) {
        super(span, NodeType.BlockStatement);
    }
}

export class FunctionDeclaration extends Node {
    public constructor(
        startSpan: Span,
        public readonly name: Identifier,
        public readonly type: Identifier | null,
        public readonly parameters: Parameter[] = [],
        public readonly block: BlockStatement,
        public readonly modifiers: Identifier[] = [],
    ) {
        super(Span.fromEnclosing(startSpan, block.span), NodeType.FunctionDeclaration);
    }
}

export class IfStatement extends Node {
    public constructor(
        span: Span,
        public readonly condition: ExpressionNode,
        public readonly block: BlockStatement,
        public readonly alternate?: Node,
    ) {
        super(span, NodeType.IfStatement);
    }
}

export class WhileStatement extends Node {
    public constructor(
        span: Span,
        public readonly condition: ExpressionNode,
        public readonly block: BlockStatement,
    ) {
        super(span, NodeType.WhileStatement);
    }
}

export class LoopStatement extends Node {
    public constructor(
        span: Span,
        public readonly block: BlockStatement,
    ) {
        super(span, NodeType.LoopStatement);
    }
}

export class ReturnStatement extends Node {
    public constructor(
        span: Span,
        public readonly expression?: ExpressionNode,
    ) {
        super(span, NodeType.ReturnStatement);
    }
}

export class ThrowStatement extends Node {
    public constructor(
        span: Span,
        public readonly expression: ExpressionNode,
    ) {
        super(span, NodeType.ThrowStatement);
    }
}

export class ContinueStatement extends Node {
    public constructor(span: Span) {
        super(span, NodeType.ContinueStatement);
    }
}

export class VariableDeclaration extends Node {
    public constructor(
        span: Span,
        public readonly name: Identifier,
        public readonly type: TypeAnnotation | null,
        public readonly isMutable: boolean,
        public readonly init: ExpressionNode,
    ) {
        super(span, NodeType.VariableDeclaration);
    }
}

export class StaticVariableDeclaration extends Node {
    public constructor(
        span: Span,
        public readonly name: Identifier,
        public readonly type: TypeAnnotation,
        public readonly isMutable: boolean,
        public readonly init: ExpressionNode,
        public readonly modifiers: Identifier[],
    ) {
        super(span, NodeType.StaticVariableDeclaration);
    }
}

export class AssignmentNode extends Node {
    public constructor(
        span: Span,
        public readonly name: Identifier,
        public readonly right: ExpressionNode,
    ) {
        super(span, NodeType.AssignmentNode);
    }
}

export class ExpressionStatement extends Node {
    public constructor(
        span: Span,
        public readonly expression: ExpressionNode,
    ) {
        super(span, NodeType.ExpressionStatement);
    }
}

export class NumberLiteral extends Node {
    public constructor(
        span: Span,
        public readonly value: number,
    ) {
        super(span, NodeType.NumberLiteral);
        Node.counter++;
    }

    public static fromToken(token: Token): NumberLiteral {
        return new NumberLiteral(token.span, parseFloat(token.value));
    }
}

export class CharLiteral extends Node {
    public constructor(
        span: Span,
        public readonly value: string,
    ) {
        super(span, NodeType.CharLiteral);
        Node.counter++;
    }

    public static fromToken(token: Token): CharLiteral {
        return new CharLiteral(token.span, token.value);
    }
}

export class StringLiteral extends Node {
    public constructor(
        span: Span,
        public readonly value: string,
    ) {
        super(span, NodeType.StringLiteral);
        Node.counter++;
    }

    public static fromToken(token: Token): StringLiteral {
        return new StringLiteral(token.span, token.value);
    }
}

export class ArrayLiteral extends Node {
    public constructor(
        span: Span,
        public readonly values: ExpressionNode[],
    ) {
        super(span, NodeType.ArrayLiteral);
    }
}

export class ObjectLiteral extends Node {
    public constructor(
        span: Span,
        public readonly values: Record<string, ExpressionNode | null>,
    ) {
        super(span, NodeType.ArrayLiteral);
    }
}

export class Ternary extends Node {
    public constructor(
        span: Span,
        public readonly condition: ExpressionNode,
        public readonly success: ExpressionNode,
        public readonly failure: ExpressionNode,
    ) {
        super(span, NodeType.Ternary);
    }
}

export class Lambda extends Node {
    public constructor(
        span: Span,
        public readonly parameters: Identifier[],
        public readonly expression: ExpressionNode,
    ) {
        super(span, NodeType.Lambda);
    }
}

export class UnaryExpression extends Node {
    public constructor(
        public readonly operator: string,
        public readonly operand: ExpressionNode,
    ) {
        super(operand.span, NodeType.UnaryExpression);
    }
}

export class BinaryExpression extends Node {
    public constructor(
        public readonly operator: string,
        public readonly left: ExpressionNode,
        public readonly right: ExpressionNode,
    ) {
        super(Span.fromEnclosing(left.span, right.span), NodeType.BinaryExpression);
    }
}

export class CallExpression extends Node {
    public constructor(
        public readonly caller: ExpressionNode,
        public readonly args: ExpressionNode[],
    ) {
        super(Span.fromEnclosing(caller.span, (args.at(-1) ?? caller).span), NodeType.CallExpression);
    }
}

export class MemberExpression extends Node {
    public constructor(
        public readonly parent: ExpressionNode,
        public readonly property: ExpressionNode,
        public readonly computed = false,
    ) {
        super(Span.fromEnclosing(parent.span, property.span), NodeType.MemberExpression);
    }
}

export class MatchExpressionBranch extends Node {
    public constructor(
        span: Span,
        public readonly left: NumberLiteral | StringLiteral | Identifier,
        public readonly right: ExpressionNode,
    ) {
        super(span, NodeType.MatchExpressionBranch);
    }
}

export class MatchExpression extends Node {
    public constructor(
        span: Span,
        public readonly expression: ExpressionNode,
        public readonly branches: MatchExpressionBranch[],
    ) {
        super(span, NodeType.MatchExpression);
    }
}

export class EnumDeclaration extends Node {
    public constructor(
        span: Span,
        public readonly name: Identifier,
        public readonly symbols: Identifier[],
        public readonly modifiers: Identifier[],
    ) {
        super(span, NodeType.EnumDeclaration);
    }
}

export class StructField extends Node {
    public constructor(
        span: Span,
        public readonly name: Identifier,
        public readonly type: TypeAnnotation,
    ) {
        super(span, NodeType.StructMember);
    }
}

export class StructMethod extends Node {
    public constructor(
        public readonly method: FunctionDeclaration,
        public readonly isStatic = false,
    ) {
        super(method.span, NodeType.StructMethod);
    }
}

export type StructMember = StructField | StructMethod;

export class StructDeclaration extends Node {
    public constructor(
        span: Span,
        public readonly name: Identifier,
        public readonly members: StructMember[],
        public readonly modifiers: Identifier[],
    ) {
        super(span, NodeType.StructDeclaration);
    }
}

export class StructKeyValuePair extends Node {
    public constructor(
        span: Span,
        public readonly property: Identifier,
        public readonly value: ExpressionNode,
    ) {
        super(span, NodeType.StructKeyValuePair);
    }
}

export class StructMemberBlock extends Node {
    public constructor(
        span: Span,
        public readonly values: StructKeyValuePair[],
    ) {
        super(span, NodeType.StructMemberBlock);
    }
}

export class StructInstantiationExpression extends Node {
    public constructor(
        public readonly struct: Identifier,
        public readonly values: StructMemberBlock,
    ) {
        super(Span.fromEnclosing(struct.span, values.span), NodeType.StructInstantiationExpression);
    }
}

export type ExpressionNode =
    | Identifier
    | NumberLiteral
    | CharLiteral
    | StringLiteral
    | ArrayLiteral
    | ObjectLiteral
    | Ternary
    | Lambda
    | UnaryExpression
    | BinaryExpression
    | CallExpression
    | MemberExpression
    | MatchExpression
    | StructInstantiationExpression;
