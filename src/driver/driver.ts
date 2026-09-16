import { nanoseconds } from 'bun';
import chalk from 'chalk';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

import { generator } from '../generator.js';
import { Parser } from '../parsing/parser.js';
import { TypeChecker } from '../typeChecker/typeChecker.js';
import { SyntaxError } from '../errors/SyntaxError.js';
import { printCodeView } from '../commands/printCodeView.js';
import type { ParseSession } from '../parsing/parseSession.js';
import { ImportDeclaration, NodeType } from '../ast/ast.js';

interface CommandOptions {
    checkTypes: boolean;
    outDir: string;
    run: boolean;
    verbose: boolean;
}

export function main(argv: string[]) {
    const args = argv.slice(2);

    const options: CommandOptions = {
        checkTypes: true,
        outDir: './target/dev',
        run: false,
        verbose: false,
    };

    let inputPath: string | null = null;

    let errorCount = 0;
    try {
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]!;
            if (!arg) continue; // ignore empty args

            if (arg.startsWith('--')) {
                // Option
                const option = arg.slice(2);
                if (option === 'verbose') {
                    options.verbose = true;
                } else if (option === 'run') {
                    options.run = true;
                } else if (option === 'out-dir') {
                    const outDir = args[++i];
                    if (outDir === undefined) throw new Error('out-dir option was passed but no path was specified');
                    options.outDir = outDir;
                } else if (option === 'no-check') {
                    options.checkTypes = false;
                } else if (option === 'help') {
                    printHelp();
                    return;
                } else {
                    throw new Error('Unknown option `' + option + '`');
                }
            } else if (arg.startsWith('-')) {
                const alias = arg.slice(1);
                if (alias === 'h') {
                    printHelp();
                    return;
                } else {
                    throw new Error('Unknown alias `' + alias + '`');
                }
            } else {
                // Argument
                if (inputPath !== null) throw new Error('you can only specify one entry-point');
                inputPath = arg;
            }
        }

        if (inputPath === null) throw new Error('no entry-points specified');
        inputPath = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);

        compile(
            {
                cwd: process.cwd(),
                mainDir: path.join(inputPath, '../'),
                modules: [],
            },
            inputPath,
            options,
        );
    } catch (error) {
        errorCount++;
        if (error instanceof SyntaxError) {
            if (error.span) {
                console.log(chalk.bold(chalk.red('error: ') + chalk.whiteBright(error.message)));
                printCodeView(error.span);
                if (options.verbose) console.log(error.stack);
            } else {
                console.log(error.stack);
            }
        } else if (error instanceof Error) {
            console.log(chalk.bold(chalk.redBright('error: ') + error.message));
            if (options.verbose) console.log(error.stack);
        } else throw error;
    }

    console.log();
    if (errorCount === 0) console.log('Files emitted to ' + options.outDir);
    else console.log(chalk.bold(chalk.redBright('error: ') + `aborting due to ${errorCount} previous errors`));
    console.log();

    if (errorCount === 0 && options.run && inputPath !== null) {
        console.log('Running program');
        const outputFileName = path.basename(inputPath, path.extname(inputPath));
        const { status } = spawnSync('bun', [outputFileName], {
            stdio: 'inherit',
            cwd: options.outDir,
        });
        console.log(`\nProgram exited with code ${status}`);
    }
}

function compile(session: ParseSession, inputPath: string, options: CommandOptions) {
    const startTime = nanoseconds();
    compileFile(session, inputPath, options, true);
    const endTime = nanoseconds();

    const outputFileName = path.basename(inputPath, path.extname(inputPath));
    console.log(chalk.greenBright.bold(outputFileName + ' built succesfully!'));
    console.log(`  in ${((endTime - startTime) / 1_000_000).toFixed(2)}ms`);
}

function compileFile(session: ParseSession, inputPath: string, options: CommandOptions, isMain = false) {
    if (!fs.existsSync(inputPath)) {
        throw new Error('could not find file ' + inputPath);
    }

    // Return early if file is already emitted
    for (let i = 0; i < session.modules.length; i++) {
        if (session.modules[i]!.path === inputPath) return;
    }

    const inputDirectory = path.join(inputPath, '../');
    const sourceCode = fs.readFileSync(inputPath, 'utf8');
    const parser = new Parser({
        name: inputPath,
        content: sourceCode,
    });
    const ast = parser.parseProgram(inputPath);

    if (options.checkTypes) new TypeChecker(ast).check();
    let output = generator(ast, { verbose: options.verbose }, 0, 0);
    if (isMain) output += 'main(process.argv);\n';
    const outputFileName = path.basename(inputPath, path.extname(inputPath));
    const outputDirectory = path.relative(session.mainDir, inputDirectory);

    try {
        fs.mkdirSync(path.join(session.cwd, options.outDir, outputDirectory));
    } catch (error) {
        if (options.verbose && error instanceof Error) console.log(error.message);
    }
    fs.writeFileSync(path.join(options.outDir, outputDirectory, outputFileName + '.js'), output);

    session.modules.push({
        code: ast,
        path: inputPath,
    });

    // Compile imports
    for (let i = 0; i < ast.statements.length; i++) {
        const node = ast.statements[i]!;
        if (node.nodeType !== NodeType.ImportDeclaration) continue;
        if (!(node instanceof ImportDeclaration)) continue;

        // Skip libs
        if (node.module.length === 0) continue;
        if (!['self', 'super'].includes(node.module.at(0)!.value)) continue;

        const relativeImportPath =
            node.module
                .map((d) => d.value)
                .map((s) => (s === 'super' ? '..' : s === 'self' ? '.' : s))
                .join('/') + '.axi';
        const pathToDependency = path.join(inputDirectory, relativeImportPath);

        compileFile(session, pathToDependency, options);
    }
}

function printHelp() {
    console.log('Usage: axiumc [options] input');
}
