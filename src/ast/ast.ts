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
    BreakStatement = 'break',
    ContinueStatement = 'continue',
}

export interface BlockStatement {
    kind: 'block';
    statements: Statement[];
    span: Span;
}

export type Statement =
    | { kind: 'loop'; block: BlockStatement; span: Span }
    | { kind: 'expression'; expression: ExpressionNode; span: Span }
    | { kind: 'if'; condition: ExpressionNode; then: BlockStatement; else?: BlockStatement; span: Span }
    | { kind: 'while'; condition: ExpressionNode; block: BlockStatement; span: Span }
    | { kind: 'break'; span: Span }
    | { kind: 'continue'; span: Span }
    | { kind: 'return'; expression?: ExpressionNode; span: Span }
    | {
          kind: 'let';
          name: string;
          mutable: boolean;
          type: TypeAnnotation | undefined;
          init: ExpressionNode;
          span: Span;
      };

export class Span {
    public readonly len: number;

    constructor(
        public readonly start: number,
        public readonly end: number,
        public readonly parent: number,
    ) {
        this.len = end - start;
    }

    public static from(start: Span, end: Span): Span {
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

export interface Program {
    main: FunctionDeclaration;
}

export interface ImportDeclaration {
    kind: 'import';
    module: Identifier[];
    items: Identifier[];
    span: Span;
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
        super(Span.from(type.span, name.span), NodeType.Parameter);
    }
}

export interface FunctionDeclaration {
    kind: 'function';
    name: string;
    type: TypeAnnotation | null;
    parameters: Parameter[];
    block: BlockStatement;
    modifiers: string[];
    span: Span;
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

export class BreakStatement extends Node {
    public constructor(span: Span) {
        super(span, NodeType.BreakStatement);
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
        public readonly type: TypeAnnotation | undefined,
        public readonly isMutable: boolean,
        public init: ExpressionNode,
    ) {
        super(span, NodeType.VariableDeclaration);
    }
}

export interface StaticVariableDeclaration {
    kind: 'staticVar';
    name: Identifier;
    type: TypeAnnotation;
    isMutable: boolean;
    init: ExpressionNode;
    modifiers: string[];
    span: Span;
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
        super(Span.from(left.span, right.span), NodeType.BinaryExpression);
    }
}

export class CallExpression extends Node {
    public constructor(
        public readonly caller: ExpressionNode,
        public readonly args: ExpressionNode[],
    ) {
        super(Span.from(caller.span, (args.at(-1) ?? caller).span), NodeType.CallExpression);
    }
}

export class MemberExpression extends Node {
    public constructor(
        public readonly parent: ExpressionNode,
        public readonly property: ExpressionNode,
        public readonly computed = false,
    ) {
        super(Span.from(parent.span, property.span), NodeType.MemberExpression);
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

type TypeKind =
    | { kind: 'slice'; payload: [TypeKind] }
    | { kind: 'array'; payload: [TypeKind, number] }
    | { kind: 'tuple'; payload: [TypeKind[]] };

export class Type {
    public readonly id: number;

    constructor(
        public readonly span: Span,
        public readonly kind: TypeKind,
    ) {
        this.id = Node.counter++;
    }
}

type VariantPayload = { kind: 'struct'; payload: Identifier[] } | { kind: 'tuple'; payload: Identifier[] };

export class EnumVariant {
    constructor(
        public readonly span: Span,
        public readonly name: Identifier,
        public readonly data: VariantPayload | undefined,
    ) {}
}

export interface EnumDeclaration {
    kind: 'enum';
    name: Identifier;
    variants: EnumVariant[];
    modifiers: string[];
    span: Span;
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

export interface StructDeclaration {
    kind: 'struct';
    name: Identifier;
    members: StructMember[];
    modifiers: string[];
    span: Span;
}

export type StructDeclarationAlt = {
    kind: 'Struct';
    name: string;
    fields: StructField[];
    methods: StructMethod[];
    span: Span;
};

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
        super(Span.from(struct.span, values.span), NodeType.StructInstantiationExpression);
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
    | AssignmentNode
    | CallExpression
    | MemberExpression
    | MatchExpression
    | StructInstantiationExpression;

export type Item =
    FunctionDeclaration | ImportDeclaration | EnumDeclaration | StaticVariableDeclaration | StructDeclaration;
