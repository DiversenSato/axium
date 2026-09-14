import type { Node } from '../ast/ast.js';

interface Module {
    code: Node;
    path: string;
}

export interface ParseSession {
    cwd: string;
    mainDir: string;
    modules: Module[];
}
