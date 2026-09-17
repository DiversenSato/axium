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
    StructDeclaration,
    StructKeyValuePair,
    StructMemberBlock,
    StructInstantiationExpression,
}

export struct Span {
    start: u32,
    end: u32,
    len: u32,
    parent: i32,

    static fn from(u32 start, u32 end, i32 parent) {
        return Span {
            start,
            end,
            len: end - start,
            parent,
        };
    },

    static fn fromEnclosing(Span start, Span end) {
        return Span.from(start.start, end.end, start.parent);
    },
}

static mut counter: u32 = 0;

export struct Node {
    id: u32,
    span: Span,
    nodeType: NodeType,

    static fn from(Span span, NodeType nodeType) {
        let id = counter;
        counter += 1;
        return Node {
            id,
            span,
            nodeType,
        };
    },
}

export struct Identifier extends Node {
    fn from(
        span: Span,
        public readonly value: string,
    ) {
        super(span, NodeType.Identifier);
        counter = counter + 1;
    },

    public static fromToken(token: Token): Identifier {
        return new Identifier(token.span, token.value);
    }
}

export struct Program extends Node {
    public constructor(
        span: Span,
        public readonly name: string,
        public statements: Node[],
    ) {
        super(span, NodeType.Program);
    }
}

export struct ImportDeclaration extends Node {
    public constructor(
        span: Span,
        public readonly module: Identifier[],
        public readonly items: Identifier[],
    ) {
        super(span, NodeType.ImportDeclaration);
    }
}

export struct TypeAnnotation extends Node {
    public constructor(
        span: Span,
        public readonly type: Identifier,
        public readonly parameters: TypeAnnotation[],
        public readonly isArray: boolean,
    ) {
        super(span, NodeType.TypeAnnotation);
    }
}

export struct Parameter extends Node {
    public constructor(
        public readonly type: TypeAnnotation,
        public readonly name: Identifier,
    ) {
        super(Span.fromEnclosing(type.span, name.span), NodeType.Parameter);
    }
}

export struct BlockStatement extends Node {
    constructor(
        span: Span,
        public readonly statements: Node[],
    ) {
        super(span, NodeType.BlockStatement);
    }
}

export struct FunctionDeclaration extends Node {
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

export struct IfStatement extends Node {
    public constructor(
        span: Span,
        public readonly condition: ExpressionNode,
        public readonly block: BlockStatement,
        public readonly alternate?: Node,
    ) {
        super(span, NodeType.IfStatement);
    }
}

export struct WhileStatement extends Node {
    public constructor(
        span: Span,
        public readonly condition: ExpressionNode,
        public readonly block: BlockStatement,
    ) {
        super(span, NodeType.WhileStatement);
    }
}

export struct LoopStatement extends Node {
    public constructor(
        span: Span,
        public readonly block: BlockStatement,
    ) {
        super(span, NodeType.LoopStatement);
    }
}

export struct ReturnStatement extends Node {
    public constructor(
        span: Span,
        public readonly expression?: ExpressionNode,
    ) {
        super(span, NodeType.ReturnStatement);
    }
}

export struct ThrowStatement extends Node {
    public constructor(
        span: Span,
        public readonly expression: ExpressionNode,
    ) {
        super(span, NodeType.ThrowStatement);
    }
}

export struct ContinueStatement extends Node {
    public constructor(span: Span) {
        super(span, NodeType.ContinueStatement);
    }
}

export struct VariableDeclaration extends Node {
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

export struct StaticVariableDeclaration extends Node {
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

export struct AssignmentNode extends Node {
    public constructor(
        span: Span,
        public readonly name: Identifier,
        public readonly right: ExpressionNode,
    ) {
        super(span, NodeType.AssignmentNode);
    }
}

export struct ExpressionStatement extends Node {
    public constructor(
        span: Span,
        public readonly expression: ExpressionNode,
    ) {
        super(span, NodeType.ExpressionStatement);
    }
}

export struct NumberLiteral extends Node {
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

export struct CharLiteral extends Node {
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

export struct StringLiteral extends Node {
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

export struct ArrayLiteral extends Node {
    public constructor(
        span: Span,
        public readonly values: ExpressionNode[],
    ) {
        super(span, NodeType.ArrayLiteral);
    }
}

export struct ObjectLiteral extends Node {
    public constructor(
        span: Span,
        public readonly values: Record<string, ExpressionNode | null>,
    ) {
        super(span, NodeType.ArrayLiteral);
    }
}

export struct Ternary extends Node {
    public constructor(
        span: Span,
        public readonly condition: ExpressionNode,
        public readonly success: ExpressionNode,
        public readonly failure: ExpressionNode,
    ) {
        super(span, NodeType.Ternary);
    }
}

export struct Lambda extends Node {
    public constructor(
        span: Span,
        public readonly parameters: Identifier[],
        public readonly expression: ExpressionNode,
    ) {
        super(span, NodeType.Lambda);
    }
}

export struct UnaryExpression extends Node {
    public constructor(
        public readonly operator: string,
        public readonly operand: ExpressionNode,
    ) {
        super(operand.span, NodeType.UnaryExpression);
    }
}

export struct BinaryExpression extends Node {
    public constructor(
        public readonly operator: string,
        public readonly left: ExpressionNode,
        public readonly right: ExpressionNode,
    ) {
        super(Span.fromEnclosing(left.span, right.span), NodeType.BinaryExpression);
    }
}

export struct CallExpression extends Node {
    public constructor(
        public readonly caller: ExpressionNode,
        public readonly args: ExpressionNode[],
    ) {
        super(Span.fromEnclosing(caller.span, (args.at(-1) ?? caller).span), NodeType.CallExpression);
    }
}

export struct MemberExpression extends Node {
    public constructor(
        public readonly parent: ExpressionNode,
        public readonly property: ExpressionNode,
        public readonly computed = false,
    ) {
        super(Span.fromEnclosing(parent.span, property.span), NodeType.MemberExpression);
    }
}

export struct MatchExpressionBranch extends Node {
    public constructor(
        span: Span,
        public readonly left: NumberLiteral | StringLiteral | Identifier,
        public readonly right: ExpressionNode,
    ) {
        super(span, NodeType.MatchExpressionBranch);
    }
}

export struct MatchExpression extends Node {
    public constructor(
        span: Span,
        public readonly expression: ExpressionNode,
        public readonly branches: MatchExpressionBranch[],
    ) {
        super(span, NodeType.MatchExpression);
    }
}

export struct EnumDeclaration extends Node {
    public constructor(
        span: Span,
        public readonly name: Identifier,
        public readonly symbols: Identifier[],
        public readonly modifiers: Identifier[],
    ) {
        super(span, NodeType.EnumDeclaration);
    }
}

export struct StructField extends Node {
    public constructor(
        span: Span,
        public readonly name: Identifier,
        public readonly type: TypeAnnotation,
    ) {
        super(span, NodeType.StructMember);
    }
}

export struct StructMethod extends Node {
    public constructor(
        public readonly method: FunctionDeclaration,
        public readonly isStatic = false,
    ) {
        super(method.span, NodeType.StructMethod);
    }
}

export type StructMember = StructField | StructMethod;

export struct StructDeclaration extends Node {
    public constructor(
        span: Span,
        public readonly name: Identifier,
        public readonly members: StructMember[],
        public readonly modifiers: Identifier[],
    ) {
        super(span, NodeType.StructDeclaration);
    }
}

export struct StructKeyValuePair extends Node {
    public constructor(
        span: Span,
        public readonly property: Identifier,
        public readonly value: ExpressionNode,
    ) {
        super(span, NodeType.StructKeyValuePair);
    }
}

export struct StructMemberBlock extends Node {
    public constructor(
        span: Span,
        public readonly values: StructKeyValuePair[],
    ) {
        super(span, NodeType.StructMemberBlock);
    }
}

export struct StructInstantiationExpression extends Node {
    public constructor(
        public readonly struct: Identifier,
        public readonly values: StructMemberBlock,
    ) {
        super(Span.fromEnclosing(struct.span, values.span), NodeType.StructInstantiationExpression);
    }
}
