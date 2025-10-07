import type { Token } from './tokenizer.js';

export function generator(tokens: Token[]) {
    return tokens.map((t) => t.toString()).join('');
}
