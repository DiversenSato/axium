import {
    AssignmentNode,
    BinaryExpression,
    BlockStatement,
    CallExpression,
    EnumDeclaration,
    ExpressionStatement,
    FunctionDeclaration,
    IfStatement,
    LoopStatement,
    MatchExpression,
    MatchExpressionBranch,
    MemberExpression,
    Parameter,
    ReturnStatement,
    Program,
    ThrowStatement,
    UnaryExpression,
    VariableDeclaration,
    WhileStatement,
    type Node,
} from '../ast/ast.js';

export class Walker {
    public constructor(private readonly onVisit: (node: Node) => void) {}

    public walk(node: Node): void {
        this.onVisit(node);

        if (node instanceof Program) {
            for (const child of node.statements) {
                this.walk(child);
            }
        } else if (node instanceof Parameter) {
            this.walk(node.type);
            this.walk(node.name);
        } else if (node instanceof BlockStatement) {
            for (const child of node.statements) {
                this.walk(child);
            }
        } else if (node instanceof FunctionDeclaration) {
            for (const child of node.modifiers) {
                this.walk(child);
            }
            this.walk(node.name);
            for (const child of node.parameters) {
                this.walk(child);
            }
            if (node.type !== null) this.walk(node.type);
            this.walk(node.block);
        } else if (node instanceof IfStatement) {
            this.walk(node.condition);
            this.walk(node.block);
        } else if (node instanceof WhileStatement) {
            this.walk(node.condition);
            this.walk(node.block);
        } else if (node instanceof LoopStatement) {
            this.walk(node.block);
        } else if (node instanceof ReturnStatement) {
            if (node.expression !== undefined) {
                this.walk(node.expression);
            }
        } else if (node instanceof ThrowStatement) {
            this.walk(node.expression);
        } else if (node instanceof VariableDeclaration) {
            this.walk(node.name);
            if (node.type !== null) {
                this.walk(node.type);
            }
            this.walk(node.init);
        } else if (node instanceof AssignmentNode) {
            this.walk(node.name);
            this.walk(node.right);
        } else if (node instanceof ExpressionStatement) {
            this.walk(node.expression);
        } else if (node instanceof UnaryExpression) {
            this.walk(node.operand);
        } else if (node instanceof BinaryExpression) {
            this.walk(node.left);
            this.walk(node.right);
        } else if (node instanceof CallExpression) {
            this.walk(node.caller);
            for (const arg of node.args) {
                this.walk(arg);
            }
        } else if (node instanceof MemberExpression) {
            this.walk(node.parent);
            this.walk(node.property);
        } else if (node instanceof MatchExpression) {
            this.walk(node.expression);
            for (const branch of node.branches) {
                this.walk(branch);
            }
        } else if (node instanceof MatchExpressionBranch) {
            this.walk(node.left);
            this.walk(node.right);
        } else if (node instanceof EnumDeclaration) {
            this.walk(node.name);
        }
    }
}
