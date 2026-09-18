import chalk from 'chalk';
import type { Span } from '../ast/ast.js';
import { getSnippet, getSource } from '../span/sourceMap.js';

export function printCodeView(span: Span) {
    const location = getSnippet(span);
    const source = getSource(span);

    const lineNumber = (location.line + 1).toString();

    const gutterSize = lineNumber.length + 1;
    const gutterSpacing = ' '.repeat(gutterSize);
    const gutter = chalk.blue(gutterSpacing + '│');

    console.log(
        gutterSpacing +
            chalk.blue('╭─[') +
            chalk.greenBright(source.name) +
            `:${location.line + 1}:${location.column + 1}` +
            chalk.blue(']'),
    );
    console.log(gutter);
    console.log(
        gutter.replace(' '.repeat(lineNumber.length), lineNumber) + ' ' + source.content.split('\n').at(location.line),
    );
    console.log(gutter + ' '.repeat(location.column + 1) + chalk.redBright('^'.repeat(span.len)));
    console.log();
}
