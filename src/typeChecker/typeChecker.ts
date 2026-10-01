import {
    CallExpression,
    type EnumDeclaration,
    type FunctionDeclaration,
    Identifier,
    MatchExpression,
    NodeType,
    Span,
    type StructDeclaration,
    StructInstantiationExpression,
    StructMethod,
    VariableDeclaration,
    type BlockStatement,
    type ExpressionNode,
    type Program,
    type Statement,
    type StructMember,
    type TypeAnnotation,
} from '../ast/ast.js';
import { SyntaxError } from '../errors/SyntaxError.js';
import type { Module } from '../parsing/parseSession.js';

const INT_PRIMITIVES = new Set(['u8', 'u16', 'u32', 'u64', 'i8', 'i16', 'i32', 'i64', 'isize', 'usize']);

type Type =
    | { kind: 'int'; name: string }
    | { kind: 'bool' }
    | { kind: 'string' }
    | { kind: 'void' }
    | { kind: 'never' }
    | { kind: 'array'; element: Type }
    | { kind: 'struct'; name: string }
    | { kind: 'enum'; name: string };

const T = {
    int: (name: string): Type => ({ kind: 'int', name }),
    bool: { kind: 'bool' } as Type,
    string: (): Type => ({ kind: 'string' }),
    void: { kind: 'void' } as Type,
    never: { kind: 'never' } as Type,
    array: (element: Type): Type => ({ kind: 'array', element }),
    struct: (name: string): Type => ({ kind: 'struct', name }),
    enum: (name: string): Type => ({ kind: 'enum', name }),
};

interface Variable {
    name: string;
    type: Type;
    mutable: boolean;
}

interface FunctionContext {
    scopes: Map<string, Variable>[];
    loopDepth: number;
}

// interface Program {
//     fns: FunctionDeclaration[];
// }

export class TypeChecker {
    private readonly enums = new Map<string, EnumDeclaration>();
    private readonly structs = new Map<string, StructMember[]>();
    private readonly functions: FunctionDeclaration[] = [];
    private functionSignatures = new Map<string, FunctionDeclaration>([
        [
            'Error',
            {
                block: { kind: 'block', span: new Span(0, 0, 0), statements: [] },
                modifiers: [],
                name: 'Error',
                kind: 'function',
                parameters: [],
                span: new Span(0, 0, 0),
                type: {
                    id: 0,
                    nodeType: NodeType.Identifier,
                    span: new Span(0, 0, 0),
                    isArray: false,
                    parameters: [],
                    type: { id: 0, nodeType: NodeType.TypeAnnotation, span: new Span(0, 0, 0), value: '' },
                },
            },
        ],
    ]);

    private context: FunctionContext = this.createContext();

    public check(modules: Module[]): Program {
        this.collect(modules);
        for (const fn of this.functions) this.checkFunction(fn);

        return {
            main: this.functionSignatures.get('main')!,
        };
    }

    private collect(modules: Module[]) {
        for (const module of modules) {
            for (const node of module.items) {
                switch (node.kind) {
                    case 'function': {
                        this.collectFunction(node);
                        break;
                    }
                    case 'enum': {
                        this.collectEnum(node);
                        break;
                    }
                    case 'struct': {
                        this.collectStruct(node);
                        break;
                    }
                }
            }
        }
    }

    private collectEnum(node: EnumDeclaration): void {
        if (this.enums.has(node.name.value)) throw new SyntaxError(`${node.name.value} is already defined!`);
        if (node.variants.length > 256)
            throw new SyntaxError('enums can have a maximum 256 variants', node.variants[256]!.name.span);

        this.enums.set(node.name.value, node);
    }

    private collectStruct(node: StructDeclaration): void {
        if (this.structs.has(node.name.value)) throw new SyntaxError(`${node.name.value} is already defined!`);

        this.structs.set(node.name.value, node.members);
    }

    private collectFunction(fn: FunctionDeclaration) {
        if (this.functionSignatures.has(fn.name)) throw new SyntaxError(`${fn.name} is already defined!`, fn.span);

        this.functionSignatures.set(fn.name, fn);
        this.functions.push(fn);
    }

    private resolveType(node: TypeAnnotation): Type {
        let type: Type;
        if (INT_PRIMITIVES.has(node.type.value)) type = T.int(node.type.value);
        else if (node.type.value === 'string') type = T.string();
        else if (this.enums.has(node.type.value)) type = T.enum(node.type.value);
        else throw new SyntaxError(`cannot find type \`${node.type.value}\``, node.span);

        return type;
    }

    private createContext(): FunctionContext {
        return { scopes: [new Map()], loopDepth: 0 };
    }

    private checkFunction(fn: FunctionDeclaration) {
        const outer = this.context;
        this.context = this.createContext();

        // Check for duplicate arg names
        fn.parameters.forEach((p) => {
            if (this.context.scopes[0]!.has(p.name.value))
                throw new SyntaxError(`parameter \`${p.name}\` is already defined`, p.span);
            this.context.scopes[0]!.set(p.name.value, {
                mutable: true,
                name: p.name.value,
                type: this.resolveType(p.type), // Throws if type doesn't exist
            });
        });

        this.checkBlock(fn.block);
        this.context = outer;
    }

    private checkBlock(body: BlockStatement) {
        for (const node of body.statements) this.checkStatement(node);
    }

    private checkStatement(stmt: Statement): void {
        switch (stmt.kind) {
            case 'loop': {
                this.context.loopDepth++;
                this.checkBlock(stmt.block);
                this.context.loopDepth--;
                return;
            }
            case 'break':
            case 'continue': {
                if (this.context.loopDepth === 0)
                    throw new SyntaxError(`${stmt.kind} must be placed inside a loop`, stmt.span);
                return;
            }
            case 'expression': {
                return this.checkExpression(stmt.expression);
            }
        }
    }

    private checkExpression(stmt: ExpressionNode) {
        if (stmt instanceof CallExpression) {
            if (stmt.caller instanceof Identifier) {
                const calledFn = this.functionSignatures.get(stmt.caller.value);
                if (!calledFn) throw new SyntaxError('Undefined function ' + stmt.caller.value, stmt.caller.span);
            }
        } else if (stmt instanceof StructInstantiationExpression) {
            const structDef = this.structs.get(stmt.struct.value);
            if (!structDef) throw new SyntaxError('struct does not exist', stmt.struct.span);

            for (const propDef of structDef) {
                if (propDef instanceof StructMethod) continue;

                const property = stmt.values.values.find((p) => p.property.value === propDef.name.value);
                if (!property)
                    throw new SyntaxError(
                        `missing property \`${propDef.name.value}\` in initializer of \`${stmt.struct.value}\``,
                        stmt.struct.span,
                    );
            }
        } else if (stmt instanceof VariableDeclaration) {
            if (!stmt.type) return;

            if (this.enums.has(stmt.type.type.value)) {
                const e = this.enums.get(stmt.type.type.value)!;
                const type = expressionType(stmt.init);
                switch (type) {
                    case ExpressionType.Identifier: {
                        const init = stmt.init as Identifier;
                        if (!e.variants.some((variant) => variant.name.value === init.value)) {
                            throw new SyntaxError(init.value + ' does not exist in enum ' + e.name.value, init.span);
                        }
                        init.value = e.name.value + '.' + init.value;
                    }
                }
            }
        } else if (stmt instanceof MatchExpression) {
            const type = expressionType(stmt.expression);
            switch (type) {
                case ExpressionType.Identifier: {
                    scope.getSymbol(type);
                }
            }
        }
    }
}

enum ExpressionType {
    Identifier,
    None,
}

function expressionType(node: ExpressionNode) {
    switch (node.nodeType) {
        case NodeType.Identifier:
            return ExpressionType.Identifier;
        default:
            return ExpressionType.None;
    }
}
