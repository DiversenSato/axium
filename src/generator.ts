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
    ObjectLiteral,
    type EnumVariant,
} from './ast/ast.js';

interface Options {
    verbose: boolean;
}

export function generator(node: Node, options: Options): string {
    if (node instanceof Program) {
        let compiled = 'function Error(msg){throw msg};';
        for (const child of node.items) {
            compiled += generator(child, options) + ';';
        }
        return compiled;
    }

    if (node instanceof ImportDeclaration) {
        if (node.items.length === 0)
            return `import*as ${node.module.at(-1)!.value} from'${node.module.map((m) => (m.value === 'super' ? '..' : m.value === 'self' ? '.' : m.value)).join('/')}'`;

        return `import{${node.items.map((i) => i.value).join(',')}}from'${node.module.map((m) => (m.value === 'super' ? '..' : m.value === 'self' ? '.' : m.value)).join('/')}'`;
    }

    if (node instanceof BlockStatement) {
        return genBlockStatement(node, options);
    }

    if (node instanceof FunctionDeclaration) {
        return (
            genItemModifers(node.modifiers) +
            `function ${generator(node.name, options)}(${node.parameters.map((p) => generator(p, options)).join(',')})${generator(node.block, options)}`
        );
    }

    if (node instanceof IfStatement) {
        return genIf(node, options);
    }

    if (node instanceof WhileStatement) {
        return `while(${generator(node.condition, options)})${generator(node.block, options)}`;
    }

    if (node instanceof LoopStatement) {
        return `while(true)${generator(node.block, options)}`;
    }

    if (node instanceof Parameter) {
        return node.name.value;
    }

    if (node instanceof AssignmentNode) {
        return `${generator(node.name, options)}=${generator(node.right, options)}`;
    }

    if (node instanceof VariableDeclaration) {
        return `${node.isMutable ? 'let' : 'const'} ${node.name.value}=${generator(node.init, options)}`;
    }

    if (node instanceof StaticVariableDeclaration) {
        return `${node.isMutable ? 'let' : 'const'} ${node.name.value}=${generator(node.init, options)}`;
    }

    if (node instanceof NumberLiteral) {
        return node.value.toString();
    }

    if (node instanceof CharLiteral) return node.value;
    if (node instanceof StringLiteral) return node.value;

    if (node instanceof ArrayLiteral) {
        return `[${node.values.map((v) => generator(v, options)).join(',')}]`;
    }

    if (node instanceof ObjectLiteral) {
        return genObjectLiteral(node, options);
    }

    if (node instanceof CallExpression) {
        return `${generator(node.caller, options)}(${node.args.map((a) => generator(a, options)).join(',')})`;
    }

    if (node instanceof ExpressionStatement) {
        return generator(node.expression, options);
    }

    if (node instanceof MemberExpression) {
        if (node.computed) return `${generator(node.parent, options)}[${generator(node.property, options)}]`;
        return `${generator(node.parent, options)}.${generator(node.property, options)}`;
    }

    if (node instanceof Identifier) {
        // if (node.value === 'None') return 'null';
        return node.value;
    }

    if (node instanceof BinaryExpression) {
        return `${generator(node.left, options)} ${node.operator} ${generator(node.right, options)}`;
    }

    if (node instanceof UnaryExpression) {
        return `${node.operator}${generator(node.operand, options)}`;
    }

    if (node instanceof ContinueStatement) {
        return `continue`;
    }

    if (node instanceof ReturnStatement) {
        if (node.expression === undefined) return `return`;
        return `return ${generator(node.expression, options)}`;
    }

    if (node instanceof ThrowStatement) {
        return `throw ${generator(node.expression, options)}`;
    }

    if (node instanceof MatchExpression) {
        return `(() => {
${node.branches.map((b) => `${b.left.value !== '_' ? `if (${generator(node.expression, options)} === ${generator(b.left, options)}) ` : ''}return ${generator(b.right, options)};`).join('\n')}})()`;
    }

    if (node instanceof EnumDeclaration) {
        return `${genItemModifers(node.modifiers)}const ${generator(node.name, options)}={${node.variants
            .map((s, i) => `${genEnumVariant(s)}:${i}`)
            .join(',')}}`;
    }

    if (node instanceof StructDeclaration) return genStructDeclaration(node, options);

    if (node instanceof StructInstantiationExpression) return genStructInstantiation(node, options);

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

function genEnumVariant(variant: EnumVariant) {
    return variant.name.value;
}

function genStructInstantiation(node: StructInstantiationExpression, options: Options): string {
    if (node.values.values.length === 0) return `new ${node.struct.value};`;
    return `new ${node.struct.value}({${node.values.values
        .map((v) => `${v.property.value}:${generator(v.value, options)}`)
        .join(',')}})`;
}

function genItemModifers(modifiers: Identifier[]) {
    return modifiers.map((m) => m.value + ' ').join('');
}

function genStructDeclaration(node: StructDeclaration, options: Options): string {
    return `${genItemModifers(node.modifiers)}class ${generator(node.name, options)}{constructor(options){${node.members
        .filter((m) => m instanceof StructField)
        .map((m) => `this.${m.name.value}=options.${m.name.value}`)
        .join(';')}}${node.members
        .filter((m) => m instanceof StructMethod)
        .map((m) => genStructMethod(m, options))
        .join('')}}`;
}

function genStructMethod(node: StructMethod, options: Options): string {
    return `${node.isStatic ? 'static ' : ''}${node.method.name.value}(${node.method.parameters.map((p) => p.name.value).join(',')})${generator(node.method.block, options)}`;
}

function genBlockStatement(node: BlockStatement, options: Options): string {
    if (node.statements.length === 0) return '{}';
    return `{${node.statements.map((n) => generator(n, options)).join(';')}}`;
}

function genIf(node: IfStatement, options: Options): string {
    if (node.alternate) {
        return `if(${generator(node.condition, options)})${generator(node.block, options)} else ${generator(node.alternate, options)}`;
    }

    return `if(${generator(node.condition, options)})${generator(node.block, options)}`;
}

function genObjectLiteral(node: ObjectLiteral, options: Options): string {
    return `{${Object.keys(node.values)
        .map((key) => key + (node.values[key] !== null ? `: ${generator(node.values[key]!, options)}` : ''))
        .join(',')}}`;
}
