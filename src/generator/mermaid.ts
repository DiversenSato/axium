import {
    AssignmentNode,
    BinaryExpression,
    BlockStatement,
    CallExpression,
    EnumDeclaration,
    ExpressionStatement,
    FunctionDeclaration,
    Identifier,
    IfStatement,
    LoopStatement,
    MatchExpression,
    MatchExpressionBranch,
    MemberExpression,
    NumberLiteral,
    Parameter,
    ReturnStatement,
    Program,
    StringLiteral,
    ThrowStatement,
    UnaryExpression,
    VariableDeclaration,
    WhileStatement,
    type Node,
    StructMemberBlock,
    StructInstantiationExpression,
    StructKeyValuePair,
} from '../ast/ast.js';

export class MermaidGenerator {
    private readonly lines: string[] = [
        '---',
        'config:',
        '  flowchart:',
        '    defaultRenderer: elk',
        '---',
        'graph TD',
    ];

    private declareNode(node: Node, label?: string): void {
        this.lines.push(`  ${node.id}[${label ?? node.nodeType}]`);
    }

    private edge(parent: Node, child: Node) {
        this.lines.push(`  ${parent.id} --> ${child.id}`);
        this.walk(child);
    }

    walk(node: Node) {
        this.declareNode(node);

        if (node instanceof Program) {
            for (const child of node.statements) {
                this.edge(node, child);
            }
        } else if (node instanceof Parameter) {
            this.edge(node, node.type);
            this.edge(node, node.name);
        } else if (node instanceof BlockStatement) {
            for (const child of node.statements) {
                this.edge(node, child);
            }
        } else if (node instanceof FunctionDeclaration) {
            for (const child of node.modifiers) {
                this.edge(node, child);
            }
            this.edge(node, node.name);
            for (const child of node.parameters) {
                this.edge(node, child);
            }
            if (node.type !== null) this.edge(node, node.type);
            this.edge(node, node.block);
        } else if (node instanceof IfStatement) {
            this.edge(node, node.condition);
            this.edge(node, node.block);
        } else if (node instanceof WhileStatement) {
            this.edge(node, node.condition);
            this.edge(node, node.block);
        } else if (node instanceof LoopStatement) {
            this.edge(node, node.block);
        } else if (node instanceof ReturnStatement) {
            if (node.expression !== undefined) {
                this.edge(node, node.expression);
            }
        } else if (node instanceof ThrowStatement) {
            this.edge(node, node.expression);
        } else if (node instanceof VariableDeclaration) {
            this.edge(node, node.name);
            if (node.type !== null) {
                this.edge(node, node.type);
            }
            this.edge(node, node.init);
        } else if (node instanceof AssignmentNode) {
            this.edge(node, node.name);
            this.edge(node, node.right);
        } else if (node instanceof ExpressionStatement) {
            this.edge(node, node.expression);
        } else if (node instanceof UnaryExpression) {
            this.edge(node, node.operand);
        } else if (node instanceof BinaryExpression) {
            this.edge(node, node.left);
            this.edge(node, node.right);
        } else if (node instanceof CallExpression) {
            this.edge(node, node.caller);
            for (const arg of node.args) {
                this.edge(node, arg);
            }
        } else if (node instanceof MemberExpression) {
            this.edge(node, node.parent);
            this.edge(node, node.property);
        } else if (node instanceof Identifier) {
            this.lines.push(`  ${node.id + 1}[${node.value}]`);
            this.lines.push(`  ${node.id} --> ${node.id + 1}`);
        } else if (node instanceof StringLiteral) {
            this.lines.push(`  ${node.id + 1}[${node.value}]`);
            this.lines.push(`  ${node.id} --> ${node.id + 1}`);
        } else if (node instanceof NumberLiteral) {
            this.lines.push(`  ${node.id + 1}[${node.value}]`);
            this.lines.push(`  ${node.id} --> ${node.id + 1}`);
        } else if (node instanceof MatchExpression) {
            this.edge(node, node.expression);
            for (const branch of node.branches) {
                this.edge(node, branch);
            }
        } else if (node instanceof MatchExpressionBranch) {
            this.edge(node, node.left);
            this.edge(node, node.right);
        } else if (node instanceof EnumDeclaration) {
            this.edge(node, node.name);
        } else if (node instanceof StructInstantiationExpression) {
            this.edge(node, node.struct);
            this.edge(node, node.values);
        } else if (node instanceof StructMemberBlock) {
            for (const keyPair of node.values) {
                this.edge(node, keyPair);
            }
        } else if (node instanceof StructKeyValuePair) {
            this.edge(node, node.property);
            this.edge(node, node.value);
        }
    }

    public generate(root: Node) {
        this.walk(root);
        return this.lines.join('\n') + '\n';
    }
}
