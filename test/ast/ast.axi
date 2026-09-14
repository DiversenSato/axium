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

    static fn new(Span span, NodeType nodeType) {
        let id = counter;
        counter = counter + 1;
        return Node {
            id,
            span,
            nodeType,
        };
    },
}
