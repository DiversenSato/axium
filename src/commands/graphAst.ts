import { Argument, Command, Option } from 'commander';
import { Parser } from '../parsing/parser.js';
import { MermaidGenerator } from '../generator/mermaid.js';
import { TypeChecker } from '../typeChecker/typeChecker.js';

export const graphAstCommand = new Command('graph-ast')
    .description('Create a mermaid graph of the given source file')
    .addArgument(
        new Argument('[input-file]', 'The source to compile and run').default('src/main.axium', '/src/main.axium'),
    )
    .addOption(new Option('-v, --verbose', 'Enable verbose output').default(false, 'false'))
    .addOption(
        new Option('-o, --output <folder>', 'Output to the given folder instead of stdout').default(
            'target/dev',
            '/target/dev',
        ),
    )
    .action(async (pathToMain, options) => {
        if (options.verbose) {
            console.log('\n[Verbose Mode]');
            console.log('Using options:');
            console.log(`  Path to main: ${pathToMain}`);
            console.log(`  Output directory: ${options.output}\n`);
        }

        const sourceCode = await Bun.file(pathToMain).text();
        const parser = new Parser({
            name: pathToMain,
            content: sourceCode,
        });
        const ast = parser.parseProgram('main');
        new TypeChecker(ast).check();
        const graphCode = new MermaidGenerator().generate(ast);
        await Bun.write('ast.mmd', graphCode);
    });
