import type { Span } from '../ast/ast.js';

export class SyntaxError extends Error {
    constructor(
        message: string,
        public readonly span?: Span,
    ) {
        super(message);
    }
}
