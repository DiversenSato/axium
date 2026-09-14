import type { Span } from '../ast/ast.js';

export interface SourceFile {
    name: string;
    content: string;
}

const ids = new Map<string, number>();
const files = new Map<number, SourceFile>();

function addFile(name: string, content: string): number {
    const id = ids.get(name);
    if (id) return id;

    files.set(ids.size, { name, content });
    return ids.getOrInsert(name, ids.size);
}

function getSnippet(span: Span) {
    const content = files.get(span.parent)?.content;
    if (content === undefined) throw new Error("the file the span refers to doesn't exist");

    let column = 0;
    let line = 0;
    for (let i = 0; i < span.start; i++) {
        const c = content.at(i);
        if (c === '\n') {
            line++;
            column = 0;
        } else {
            column++;
        }
    }

    return {
        column,
        line,
        value: content.slice(span.start, span.end),
    };
}

function getSource(span: Span) {
    const source = files.get(span.parent);
    if (source === undefined) throw new Error('source does not exist');
    return source;
}

function getSourceId(name: string) {
    const id = ids.get(name);
    if (id === undefined) throw new Error('source does not exist');
    return id;
}

export const sourceMap = {
    addFile,
    getSnippet,
    getSource,
    getSourceId,
};
