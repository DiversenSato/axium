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
    ImportDeclaration,
    LoopStatement,
    MatchExpression,
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
    StructDeclaration,
    StructInstantiationExpression,
    ContinueStatement,
    ArrayLiteral,
    Ternary,
    Lambda,
    StructField,
    StructMethod,
    StaticVariableDeclaration,
    CharLiteral,
} from './ast/ast.js';

interface Options {
    verbose: boolean;
}

const INDENT_INCREMENT = 4;

export function generator(node: Node, options: Options, indent = 0, scope = 0): string {
    if (node instanceof Program) {
        let compiled = 'function Error(msg) { throw msg; }\n';
        for (const child of node.statements) {
            compiled += generator(child, options);
        }
        return compiled + '\n';
    }

    const indentString = ' '.repeat(indent);

    if (node instanceof ImportDeclaration) {
        if (node.items.length === 0)
            return `import * as ${node.module.at(-1)!.value} from '${node.module.map((m) => (m.value === 'super' ? '..' : m.value === 'self' ? '.' : m.value)).join('/')}';\n`;

        return `import { ${node.items.map((i) => i.value).join(', ')} } from '${node.module.map((m) => (m.value === 'super' ? '..' : m.value === 'self' ? '.' : m.value)).join('/')}';\n`;
    }

    if (node instanceof BlockStatement) {
        return genBlockStatement(node, options, indent, scope);
    }

    if (node instanceof FunctionDeclaration) {
        return (
            genItemModifers(node.modifiers) +
            `function ${generator(node.name, options)}(${node.parameters.map((p) => generator(p, options)).join(', ')}) ${generator(node.block, options, indent, scope)}`
        );
    }

    if (node instanceof IfStatement) {
        return genIf(node, options, indent, scope);
    }

    if (node instanceof WhileStatement) {
        return `${indentString}while (${generator(node.condition, options)}) ${generator(node.block, options, indent, scope)}`;
    }

    if (node instanceof LoopStatement) {
        return `${indentString}while (true) ${generator(node.block, options, indent, scope)}`;
    }

    if (node instanceof Parameter) {
        return node.name.value;
    }

    if (node instanceof AssignmentNode) {
        return indentString + `${generator(node.name, options)} = ${generator(node.right, options)};\n`;
    }

    if (node instanceof VariableDeclaration) {
        return `${indentString}${node.isMutable ? 'let' : 'const'} ${generator(node.name, options)} = ${generator(node.init, options, 0, scope)};`;
    }

    if (node instanceof StaticVariableDeclaration) {
        return `${node.isMutable ? 'let' : 'const'} ${node.name.value} = ${generator(node.init, options, 0, 0)};\n`;
    }

    if (node instanceof NumberLiteral) {
        return node.value.toString();
    }

    if (node instanceof CharLiteral) return node.value;
    if (node instanceof StringLiteral) return node.value;

    if (node instanceof ArrayLiteral) {
        return `[${node.values.map((v) => generator(v, options)).join(', ')}]`;
    }

    if (node instanceof CallExpression) {
        return (
            indentString +
            `${generator(node.caller, options)}(${node.args.map((a) => generator(a, options, 0, scope)).join(', ')})`
        );
    }

    if (node instanceof ExpressionStatement) {
        return indentString + generator(node.expression, options, 0, scope + 1) + ';\n';
    }

    if (node instanceof MemberExpression) {
        if (node.computed) return `${generator(node.parent, options)}[${generator(node.property, options)}]`;
        return `${generator(node.parent, options)}.${generator(node.property, options)}`;
    }

    if (node instanceof Identifier) {
        return node.value;
    }

    if (node instanceof BinaryExpression) {
        return `${generator(node.left, options)} ${node.operator} ${generator(node.right, options)}`;
    }

    if (node instanceof UnaryExpression) {
        return `${node.operator}${generator(node.operand, options)}`;
    }

    if (node instanceof ContinueStatement) {
        return `${indentString}continue;\n`;
    }

    if (node instanceof ReturnStatement) {
        if (node.expression === undefined) return `${indentString}return;`;
        return `${indentString}return ${generator(node.expression, options, 0, scope)};\n`;
    }

    if (node instanceof ThrowStatement) {
        return `${indentString}throw ${generator(node.expression, options)};\n`;
    }

    if (node instanceof MatchExpression) {
        return `(() => {
${node.branches.map((b) => `${indentString}    ${b.left.value !== '_' ? `if (${generator(node.expression, options)} === ${generator(b.left, options)}) ` : ''}return ${generator(b.right, options)};`).join('\n')}
${indentString}})()`;
    }

    if (node instanceof EnumDeclaration) {
        return `${genItemModifers(node.modifiers)}const ${generator(node.name, options)} = {
${node.symbols.map((s, i) => `    ${generator(s, options)}: ${i},`).join('\n')}
};\n`;
    }

    if (node instanceof StructDeclaration) return genStructDeclaration(node, options);

    if (node instanceof StructInstantiationExpression) return genStructInstantiation(node, options, scope + 1);

    if (node instanceof Ternary) {
        return (
            '(' +
            generator(node.condition, options) +
            ' ? ' +
            generator(node.success, options) +
            ' : ' +
            generator(node.failure, options) +
            ')'
        );
    }

    if (node instanceof Lambda) {
        return '(' + node.parameters.map((p) => p.value).join(', ') + ') => ' + generator(node.expression, options);
    }

    throw new Error('Unknown node ' + node.nodeType);
}

function indentString(indent: number): string {
    return ' '.repeat(indent);
}

function genStructInstantiation(node: StructInstantiationExpression, options: Options, scope: number): string {
    return `new ${node.struct.value}({
${node.values.values.map((v) => `${indentString(scope * INDENT_INCREMENT) + v.property.value}: ${generator(v.value, options)},`).join('\n')}
${indentString((scope - 1) * INDENT_INCREMENT)}})`;
}

function genItemModifers(modifiers: Identifier[]) {
    return modifiers.map((m) => m.value + ' ').join('');
}

function genStructDeclaration(node: StructDeclaration, options: Options): string {
    return `${genItemModifers(node.modifiers)}class ${generator(node.name, options)} {
    constructor(options) {
${node.members
    .filter((m) => m instanceof StructField)
    .map((m) => `        this.${m.name.value} = options.${m.name.value};`)
    .join('\n')}
    }
${node.members
    .filter((m) => m instanceof StructMethod)
    .map((m) => genStructMethod(m, options))
    .join('\n')}}\n`;
}

function genStructMethod(node: StructMethod, options: Options): string {
    return `\n    ${node.isStatic ? 'static ' : ''}${node.method.name.value}(${node.method.parameters.map((p) => p.name.value).join(', ')}) ${generator(node.method.block, options, INDENT_INCREMENT, 1)}`;
}

function genBlockStatement(node: BlockStatement, options: Options, indent: number, scope: number): string {
    const indentString = ' '.repeat(indent);
    if (node.statements.length === 0) return `{}\n`;
    return `{\n${node.statements.map((n) => generator(n, options, indent + INDENT_INCREMENT, scope + 1)).join('\n')}${indentString}}\n`;
}

function genElse(node: Node, options: Options, indent: number): string {
    return ' '.repeat(indent) + 'else ' + generator(node, options, indent).trimStart();
}

function genIf(node: IfStatement, options: Options, indent: number, scope: number): string {
    const indentString = ' '.repeat(indent);

    if (node.alternate !== undefined) {
        return (
            indentString +
            `if (${generator(node.condition, options)}) ${generator(node.block, options, indent, scope + 1)}` +
            genElse(node.alternate, options, indent)
        );
    }

    return `${indentString}if (${generator(node.condition, options)}) ${generator(node.block, options, indent, scope)}`;
}
