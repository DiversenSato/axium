import {
    CallExpression,
    EnumDeclaration,
    FunctionDeclaration,
    Identifier,
    Span,
    StructDeclaration,
    StructInstantiationExpression,
    type Program,
    type StructMember,
} from '../ast/ast.js';
import { SyntaxError } from '../errors/SyntaxError.js';
import { Walker } from '../walker/walker.js';

export class TypeChecker {
    private enums = new Map<string, EnumDeclaration>();
    private structs = new Map<string, StructMember[]>();
    private functionSignatures = new Map<string, FunctionDeclaration>([
        [
            'Error',
            {
                block: { id: 0, nodeType: '', span: new Span(0, 0, 0), statements: [] },
                id: 0,
                modifiers: [],
                name: { id: 0, nodeType: '', span: new Span(0, 0, 0), value: 'Error' },
                nodeType: '',
                parameters: [],
                span: new Span(0, 0, 0),
                type: {
                    id: 0,
                    nodeType: '',
                    span: new Span(0, 0, 0),
                    value: 'void',
                },
            },
        ],
    ]);

    public constructor(private readonly ast: Program) {}

    public check(): void {
        this.analyseTypes();
        this.analyzeFunctionBodies();
    }

    private analyseTypes() {
        for (const node of this.ast.statements) {
            if (node instanceof EnumDeclaration) {
                this.analyzeEnum(node);
            } else if (node instanceof FunctionDeclaration) {
                this.analyzeFunction(node);
            } else if (node instanceof StructDeclaration) {
                this.analyzeStruct(node);
            }
        }
    }

    private analyzeEnum(node: EnumDeclaration): void {
        if (this.enums.has(node.name.value)) throw new SyntaxError(`${node.name.value} is already defined!`);

        this.enums.set(node.name.value, node);
    }

    private analyzeStruct(node: StructDeclaration): void {
        if (this.structs.has(node.name.value)) throw new SyntaxError(`${node.name.value} is already defined!`);

        this.structs.set(node.name.value, node.members);
    }

    private analyzeFunction(node: FunctionDeclaration) {
        if (this.functionSignatures.has(node.name.value))
            throw new SyntaxError(`${node.name.value} is already defined!`);

        this.functionSignatures.set(node.name.value, node);
    }

    private analyzeFunctionBodies() {
        for (const fn of this.functionSignatures.values()) {
            new Walker((node) => {
                if (node instanceof CallExpression) {
                    if (node.caller instanceof Identifier) {
                        const calledFn = this.functionSignatures.get(node.caller.value);
                        if (calledFn === undefined)
                            throw new SyntaxError('Undefined function ' + node.caller.value, node.caller.span);
                    }
                } else if (node instanceof StructInstantiationExpression) {
                    const structDef = this.structs.get(node.struct.value);
                    if (structDef === undefined) throw new SyntaxError('struct does not exist', node.struct.span);

                    for (const propDef of structDef) {
                        const property = node.values.values.find((p) => p.property.value === propDef.name.value);
                        if (property === undefined)
                            throw new SyntaxError(
                                `missing property \`${propDef.name.value}\` in initializer of \`${node.struct.value}\``,
                                node.struct.span,
                            );
                    }
                }
            }).walk(fn.block);
        }
    }
}
