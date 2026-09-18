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
    start: u32;
    end: u32;
    len: u32;
    parent: i32;

    static fn from(u32 start, u32 end, i32 parent) {
        return Span {
            start,
            end,
            len: end - start,
            parent,
        };
    }

    static fn fromEnclosing(Span start, Span end) {
        return Span.from(start.start, end.end, start.parent);
    }
}

static mut counter: u32 = 0;

export struct Node {
    id: u32;
    span: Span;
    nodeType: NodeType;

    static fn from(Span span, NodeType nodeType) {
        let id = counter;
        counter += 1;
        return Node {
            id,
            span,
            nodeType,
        };
    }
}

export struct Identifier {
    id: u32;
    span: Span;
    nodeType: NodeType;

    value: string;

    static fn from(
        Span span,
        string value,
    ) {
        counter += 1;
        return Identifier {
            id: counter,
            span,
            nodeType: NodeType.Identifier,
            value,
        };
    }

    static fn fromToken(Token token): Identifier {
        return Identifier.from(token.span, token.value);
    }
}

export struct Program {
    id: u32;
    span: Span;
    nodeType: NodeType;
    name: string;
    statements: [Node];

    static fn from(
        Span span,
        string name,
        [Node] statements,
    ) {
        counter += 1;
        return Program {
            id: counter,
            span,
            nodeType: NodeType.Program,
            name,
            statements,
        };
    }
}

export struct ImportDeclaration {
    id: u32;
    span: Span;
    nodeType: NodeType;
    module: [Identifier];
    items: [Identifier];

    static fn from(
        Span span,
        [Identifier] module,
        [Identifier] items,
    ) {
        counter += 1;
        return ImportDeclaration {
            id: counter,
            span,
            nodeType: NodeType.ImportDeclaration,
            module,
            items,
        };
    }
}

export struct TypeAnnotation {
    id: u32;
    span: Span;
    nodeType: NodeType;
    type: Identifier;
    parameters: [TypeAnnotation];
    isArray: bool;

    static fn from(
        Span span,
        Identifier type,
        [TypeAnnotation] parameters,
        bool isArray,
    ) {
        super(span, NodeType.TypeAnnotation);
        counter += 1;
        return TypeAnnotation {
            id: counter,
            span,
            nodeType: NodeType.TypeAnnotation,
            type,
            parameters,
            isArray,
        };
    }
}

export struct Parameter {
    id: u32;
    span: Span;
    nodeType: NodeType;
    type: TypeAnnotation;
    name: Identifier;

    static fn from(
        TypeAnnotation type,
        Identifier name,
    ) {
        counter += 1;
        return Parameter {
            id: counter,
            span: Span.fromEnclosing(type.span, name.span),
            nodeType: NodeType.Parameter,
            type,
            name,
        };
    }
}

export struct BlockStatement {
    id: u32;
    span: Span;
    nodeType: NodeType;

    static fn from(
        Span span,
        [Node] statements,
    ) {
        super(span, NodeType.BlockStatement);
    }
}

enum FunctionReturnType {
    Default(Span),
    Type(TypeAnnotation),
}

export struct FunctionSignature {
    inputs: [Param];
    output: FunctionReturnType;
}

export struct FunctionDeclaration {
    static fn from(
        startSpan span,
        Identifier name,
        Identifier type,
        [Parameter] parameters,
        BlockStatement block,
        [Identifier] modifiers,
    ) {
        super(Span.fromEnclosing(startSpan, block.span), NodeType.FunctionDeclaration);
    }
}

export struct IfStatement {
    static fn from(
        Span span,
        ExpressionNode condition,
        BlockStatement block,
        Node alternate,
    ) {
        super(span, NodeType.IfStatement);
    }
}

export struct WhileStatement {
    static fn from(
        Span span,
        ExpressionNode condition,
        BlockStatement block,
    ) {
        super(span, NodeType.WhileStatement);
    }
}

export struct LoopStatement {
    static fn from(
        Span span,
        BlockStatement block,
    ) {
        super(span, NodeType.LoopStatement);
    }
}

export struct ReturnStatement {
    static fn from(
        Span span,
        ExpressionNode expression,
    ) {
        super(span, NodeType.ReturnStatement);
    }
}

export struct ThrowStatement {
    static fn from(
        Span span,
        ExpressionNode expression,
    ) {
        super(span, NodeType.ThrowStatement);
    }
}

export struct ContinueStatement {
    static fn from(Span span) {
        super(span, NodeType.ContinueStatement);
    }
}

export struct VariableDeclaration {
    static fn from(
        Span span,
        Identifier name,
        TypeAnnotation type,
        boolean isMutable,
        ExpressionNode init,
    ) {
        super(span, NodeType.VariableDeclaration);
    }
}

export struct StaticVariableDeclaration {
    static fn from(
        Span span,
        Identifier name,
        TypeAnnotation type,
        boolean isMutable,
        ExpressionNode init,
        [Identifier] modifiers,
    ) {
        super(span, NodeType.StaticVariableDeclaration);
    }
}

export struct AssignmentNode {
    static fn from(
        Span span,
        Identifier name,
        ExpressionNode right,
    ) {
        super(span, NodeType.AssignmentNode);
    }
}

export struct ExpressionStatement {
    static fn from(
        Span span,
        ExpressionNode expression,
    ) {
        super(span, NodeType.ExpressionStatement);
    }
}

export struct NumberLiteral {
    static fn from(
        Span span,
        number value,
    ) {
        super(span, NodeType.NumberLiteral);
        Node.counter += 1;
    }

    static fn fromToken(Token token): NumberLiteral {
        return NumberLiteral.from(token.span, parseFloat(token.value));
    }
}

export struct CharLiteral {
    static fn from(
        Span span,
        string value,
    ) {
        super(span, NodeType.CharLiteral);
        Node.counter += 1;
    }

    static fn fromToken(Token token): CharLiteral {
        return CharLiteral.from(token.span, token.value);
    }
}

export struct StringLiteral {
    static fn from(
        Span span,
        string value,
    ) {
        super(span, NodeType.StringLiteral);
        Node.counter += 1;
    }

    static fn fromToken(Token token): StringLiteral {
        return StringLiteral.from(token.span, token.value);
    }
}

export struct ArrayLiteral {
    static fn from(
        Span span,
        [ExpressionNode] values,
    ) {
        super(span, NodeType.ArrayLiteral);
    }
}

export struct ObjectLiteral {
    static fn from(
        Span span,
        Record values, // values: Record<string, ExpressionNode | null>
    ) {
        super(span, NodeType.ArrayLiteral);
    }
}

export struct Ternary {
    static fn from(
        Span span,
        ExpressionNode condition,
        ExpressionNode success,
        ExpressionNode failure,
    ) {
        super(span, NodeType.Ternary);
    }
}

export struct Lambda {
    static fn from(
        Span span,
        [Identifier] parameters,
        ExpressionNode expression,
    ) {
        super(span, NodeType.Lambda);
    }
}

export struct UnaryExpression {
    static fn from(
        string operator,
        ExpressionNode operand,
    ) {
        super(operand.span, NodeType.UnaryExpression);
    }
}

export struct BinaryExpression {
    static fn from(
        string operator,
        ExpressionNode left,
        ExpressionNode right,
    ) {
        super(Span.fromEnclosing(left.span, right.span), NodeType.BinaryExpression);
    }
}

export struct CallExpression {
    static fn from(
        ExpressionNode caller,
        [ExpressionNode] args,
    ) {
        super(Span.fromEnclosing(caller.span, (args.at(-1) ? args.at(-1) : caller).span), NodeType.CallExpression);
    }
}

export struct MemberExpression {
    static fn from(
        ExpressionNode parent,
        ExpressionNode property,
        bool computed,
    ) {
        super(Span.fromEnclosing(parent.span, property.span), NodeType.MemberExpression);
    }
}

export struct MatchExpressionBranch {
    static fn from(
        Span span,
        Literal left, // left: NumberLiteral | StringLiteral | Identifier,
        ExpressionNode right,
    ) {
        super(span, NodeType.MatchExpressionBranch);
    }
}

export struct MatchExpression {
    static fn from(
        Span span,
        ExpressionNode expression,
        [MatchExpressionBranch] branches,
    ) {
        super(span, NodeType.MatchExpression);
    }
}

export struct EnumDeclaration {
    static fn from(
        Span span,
        Identifier name,
        [Identifier] symbols,
        [Identifier] modifiers,
    ) {
        super(span, NodeType.EnumDeclaration);
    }
}

export struct StructField {
    static fn from(
        Span span,
        Identifier name,
        TypeAnnotation type,
    ) {
        super(span, NodeType.StructMember);
    }
}

export struct StructMethod {
    static fn from(
        FunctionDeclaration method,
        bool isStatic,
    ) {
        super(method.span, NodeType.StructMethod);
    }
}

// export type StructMember = StructField | StructMethod;
export enum StructMemberKind {
    Field,
    Method,
}

export struct StructDeclaration {
    static fn from(
        Span span,
        Identifier name,
        [StructMember] members,
        [Identifier] modifiers,
    ) {
        super(span, NodeType.StructDeclaration);
    }
}

export struct StructKeyValuePair {
    static fn from(
        Span span,
        Identifier property,
        ExpressionNode value,
    ) {
        super(span, NodeType.StructKeyValuePair);
    }
}

export struct StructMemberBlock {
    static fn from(
        Span span,
        [StructKeyValuePair] values,
    ) {
        super(span, NodeType.StructMemberBlock);
    }
}

export struct StructInstantiationExpression {
    static fn from(
        Identifier struct,
        StructMemberBlock values,
    ) {
        super(Span.fromEnclosing(struct.span, values.span), NodeType.StructInstantiationExpression);
    }
}
