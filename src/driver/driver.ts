import { nanoseconds, spawn } from 'bun';
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
import type { ImportDeclaration } from '../ast/ast.js';
import { addFile } from '../span/sourceMap.js';
import { tokenize } from '../lexer/lexer.js';

interface CommandOptions {
    checkTypes: boolean;
    minify: boolean;
    outDir: string;
    run: boolean;
    verbose: boolean;
}

export function main(argv: string[]) {
    const args = argv.slice(2);

    const options: CommandOptions = {
        checkTypes: true,
        minify: false,
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

            if (arg.startsWith('-')) {
                const flags = arg.startsWith('--') ? [arg.slice(1)] : arg.slice(1).split('');

                for (const option of flags) {
                    switch (option) {
                        case '-run':
                        case 'r': {
                            options.run = true;
                            break;
                        }
                        case '-no-check': {
                            options.checkTypes = false;
                            break;
                        }
                        case '-verbose':
                        case 'v': {
                            options.verbose = true;
                            break;
                        }
                        case '-help':
                        case 'h': {
                            printHelp();
                            return;
                        }
                        case '-out-dir':
                        case 'o': {
                            const outDir = args[++i];
                            if (outDir === undefined)
                                throw new Error('out-dir option was passed but no path was specified');
                            options.outDir = outDir;
                            break;
                        }
                        case '-minify':
                        case 'm': {
                            options.minify = true;
                            break;
                        }
                        default: {
                            throw new Error('Unknown option `' + option + '`');
                        }
                    }
                }
            } else {
                // Argument
                if (inputPath !== null) throw new Error('you can only specify one entry-point');
                inputPath = arg;
            }
        }

        if (inputPath === null) throw new Error('no entry-points specified');
        inputPath = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
        fs.mkdirSync(options.outDir, { recursive: true });

        compile(
            {
                cwd: process.cwd(),
                mainDir: path.join(inputPath, '../'),
                modules: new Map(),
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
    compileMain(session, inputPath, options);
    const endTime = nanoseconds();

    if (!options.minify) {
        spawn({
            cmd: ['bunx', 'prettier', '--write', options.outDir],
            stdout: 'ignore',
        });
    }

    const outputFileName = path.basename(inputPath, path.extname(inputPath));
    console.log();
    console.log(chalk.greenBright.bold(outputFileName + ' built succesfully!'));
    console.log(`  in ${((endTime - startTime) / 1_000_000).toFixed(2)}ms`);
}

function compileMain(session: ParseSession, inputPath: string, options: CommandOptions) {
    if (!fs.existsSync(inputPath)) {
        throw new Error('could not find file ' + inputPath);
    }

    const inputDirectory = path.join(inputPath, '../');
    const sourceCode = fs.readFileSync(inputPath, 'utf8');
    const fileId = addFile(inputPath, sourceCode);

    const parser = new Parser(tokenize(sourceCode, fileId));
    const items = parser.parse();
    session.modules.set(inputPath, { items });

    // Collect imported dependencies
    for (const item of items) {
        if (item.kind !== 'import') continue;

        const pathToDependency = resolveImportPath(item, inputDirectory);
        if (pathToDependency) collectImport(session, pathToDependency, options);
    }

    const program = new TypeChecker().check(session.modules.values().toArray());
    const output = generator(program, { verbose: options.verbose });
    const outputFileName = path.basename(inputPath, path.extname(inputPath));
    const outputDirectory = path.relative(session.mainDir, inputDirectory);

    try {
        fs.mkdirSync(path.join(session.cwd, options.outDir, outputDirectory));
    } catch (error) {
        if (options.verbose && error instanceof Error) console.log(error.message);
    }
    fs.writeFileSync(path.join(options.outDir, outputDirectory, outputFileName + '.js'), output);
}

function collectImport(session: ParseSession, inputPath: string, options: CommandOptions) {
    if (!fs.existsSync(inputPath)) {
        throw new Error('could not find file ' + inputPath);
    }

    // Return early if file is already emitted
    if (session.modules.has(inputPath)) return;

    const inputDirectory = path.join(inputPath, '../');
    const source = fs.readFileSync(inputPath, 'utf8');
    const fileId = addFile(inputPath, source);

    const parser = new Parser(tokenize(source, fileId));
    const items = parser.parse();
    session.modules.set(inputPath, { items });

    // Collect imported dependencies
    for (const item of items) {
        if (item.kind !== 'import') continue;

        const pathToDependency = resolveImportPath(item, inputDirectory);
        if (pathToDependency) collectImport(session, pathToDependency, options);
    }
}

function printHelp() {
    console.log('Usage: axiumc [options] input');
}

function resolveImportPath(node: ImportDeclaration, inputDirectory: string) {
    switch (node.module[0]?.value) {
        case 'self':
        case 'super': {
            const relativeImportPath =
                node.module
                    .map((d) => d.value)
                    .map((s) => (s === 'super' ? '..' : s === 'self' ? '.' : s))
                    .join('/')
                    .replaceAll(/\w+\/\.\.\//g, '') + '.axi';
            return path.join(inputDirectory, relativeImportPath);
        }
        case 'root': {
            const relativeImportPath =
                node.module
                    .slice(1)
                    .map((d) => d.value)
                    .map((s) => (s === 'super' ? '..' : s === 'self' ? '.' : s))
                    .join('/')
                    .replaceAll(/\w+\/\.\.\//g, '') + '.axi';
            return path.join(inputDirectory, relativeImportPath);
        }
    }
}
