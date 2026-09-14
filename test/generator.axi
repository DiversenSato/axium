import self::ast::ast::{NodeType};

struct Options {
    verbose: boolean,
}

export fn generator(Node node, Options options, u32 indent, u32 scope): string {
    if (node.nodeType == NodeType.Program) {
        let mut compiled = "function Error(msg) { throw msg; }\nconst None = null;\n";
        let mut i = 0;
        while (i < node.statements.length) {
            let child = node.statements[i];
            compiled = compiled + generator(child, options, indent, scope);
            i = i + 1;
        }
        return compiled + "\n";
    }

    let indentString = " ".repeat(indent);

    if (node.nodeType == NodeType.ImportDeclaration) {
        if (node.module.length == 0) return "import " + node.items[0].value + " from \"" + node.items[0].value + "\";\n";
        return "import { " + node.items.map((i) => i.value).join(", ") + " } from \"" + node.module.map((m) => (m.value == "super" ? ".." : m.value == "self" ? "." : m.value)).join("/") + "\";\n";
    }

    if (node.nodeType == NodeType.BlockStatement) {
        return genBlockStatement(node, options, indent, scope);
    }

    if (node.nodeType == NodeType.FunctionDeclaration) {
        return node.modifiers.map((m) => m.value + " ").join("") + "function " + generator(node.name, options) + "(" + node.parameters.map((p) => generator(p, options)).join(", ") + ") " + generator(node.block, options, indent, scope);
    }

    if (node.nodeType == NodeType.IfStatement) {
        return genIf(node, options, indent, scope);
    }

    if (node.nodeType == NodeType.WhileStatement) {
        return indentString + "while (" + generator(node.condition, options) + ") " + generator(node.block, options, indent, scope);
    }

    if (node.nodeType == NodeType.LoopStatement) {
        return indentString + "while (true) " + generator(node.block, options, indent, scope);
    }

    if (node.nodeType == NodeType.Parameter) {
        return node.name.value;
    }

    if (node.nodeType == NodeType.AssignmentNode) {
        return indentString + generator(node.name, options) + " = " + generator(node.right, options, indent, scope) + ";\n";
    }

    if (node.nodeType == NodeType.VariableDeclaration) {
        return indentString + (node.isMutable ? "let" : "const") + " " + generator(node.name, options) + " = " + generator(node.init, options, 0, scope) + ";";
    }

    if (node.nodeType == NodeType.NumberLiteral) {
        return node.value.toString();
    }

    if (node.nodeType == NodeType.StringLiteral) {
        return node.value;
    }

    if (node.nodeType == NodeType.ArrayLiteral) {
        return "[" + node.values.map((v) => generator(v, options, 0, scope)).join(", ") + "]";
    }

    if (node.nodeType == NodeType.CallExpression) {
        return generator(node.caller, options) + "(" + node.args.map((a) => generator(a, options, 0, scope)).join(", ") + ")";
    }

    if (node.nodeType == NodeType.ExpressionStatement) {
        return generator(node.expression, options, 0, scope + 1) + ";\n";
    }

    if (node.nodeType == NodeType.MemberExpression) {
        if (node.computed) return generator(node.parent, options, indent, scope) + "[" + generator(node.property, options, 0, scope) + "]";
        return generator(node.parent, options) + "." + generator(node.property, options);
    }

    if (node.nodeType == NodeType.Identifier) {
        return node.value;
    }

    if (node.nodeType == NodeType.BinaryExpression) {
        return generator(node.left, options) + " " + node.operator + " " + generator(node.right, options);
    }

    if (node.nodeType == NodeType.UnaryExpression) {
        return node.operator + generator(node.operand, options);
    }

    if (node.nodeType == NodeType.ContinueStatement) {
        return indentString + "continue;\n";
    }

    if (node.nodeType == NodeType.ReturnStatement) {
        if (node.expression == undefined) return indentString + "return;";
        return indentString + "return " + generator(node.expression, options, indent) + ";\n";
    }

    if (node.nodeType == NodeType.ThrowStatement) {
        return indentString + "throw " + generator(node.expression, options) + ";\n";
    }

    if (node.nodeType == NodeType.MatchExpression) {
        return "(() => {\n" +
            node.branches.map((b) => (indentString + "    " + (b.left.value != "_" ? "if (" + generator(node.expression, options) + " == " + generator(b.left, options) + ") " : "")) + "return " + generator(b.right, options) + ";").join("\n") +
            "\n" +
            indentString + "})()";
    }

    if (node.nodeType == NodeType.EnumDeclaration) {
        return "const " + generator(node.name, options) + " = {\n" + node.symbols.map((s, i) => "    " + generator(s, options) + ": " + i + ",").join("\n") + "\n};\n";
    }

    if (node.nodeType == NodeType.StructDeclaration) return genStructDeclaration(node, options);

    if (node.nodeType == NodeType.StructInstantiationExpression) return genStructInstantiation(node, options, indent, scope + 1);

    if (node.nodeType == NodeType.Ternary) {
        return "(" + generator(node.condition, options) + " ? " + generator(node.success, options) + " : " + generator(node.failure, options) + ")";
    }

    if (node.nodeType == NodeType.Lambda) {
        return "(" + node.parameters.map((p) => p.value).join(", ") + ") => " + generator(node.expression, options);
    }

    return Error("Unknown node " + node.nodeType);
}

fn indentString(i32 indent): string {
    return " ".repeat(Math.max(indent, 0));
}

fn genStructInstantiation(StructInstantiationExpression node, Options options, i32 indent, u32 scope): string {
    return "new " + node.struct.value + "({\n" +
    node.values.values.map((v) => indentString(scope * 4) + v.property.value + ": " + generator(v.value, options, indent, scope) + ",").join("\n") + "\n" +
    indentString((scope - 1) * 4) + "})";
}

fn genStructDeclaration(StructDeclaration node, Options options): string {
    return "class " + node.name.value + " {\n    constructor(options) {\n" +
    node.members.map((m) => "        this." + m.name.value + " = options." + m.name.value + ";").join("\n") + "\n    }\n}\n";
}

fn genBlockStatement(BlockStatement node, Options options, i32 indent, u32 scope): string {
    let indentString = " ".repeat(indent);
    if (node.statements.length == 0) return "{}\n";
    return "{\n" + node.statements.map((n) => generator(n, options, indent + 4, scope + 1)).join("\n") + indentString + "}\n";
}

fn genElse(Node node, Options options, i32 indent, u32 scope): string {
    return " ".repeat(indent) + "else " + generator(node, options, indent, scope).trimStart();
}

fn genIf(IfStatement node, Options options, i32 indent, u32 scope): string {
    let indentString = " ".repeat(indent);

    if (node.alternate != undefined) {
        return (
            indentString +
            "if (" + generator(node.condition, options, 0, scope) + ") " + generator(node.block, options, indent, scope + 1) +
            genElse(node.alternate, options, indent, scope + 1)
        );
    }

    return indentString + "if (" + generator(node.condition, options, indent, scope) + ") " + generator(node.block, options, indent, scope);
}
