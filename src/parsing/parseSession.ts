import type { Item } from '../ast/ast.js';

export interface Module {
    items: Item[];
}

export interface ParseSession {
    cwd: string;
    mainDir: string;
    modules: Map<string, Module>;
}
