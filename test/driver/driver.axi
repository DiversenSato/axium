import bun::{nanoseconds}; // import { nanoseconds } from "bun";
import chalk; // import chalk from "chalk";
import child_process::{spawnSync}; // import { spawnSync } from "child_process";
import fs;
import path; // import path from "path";

import super::generator::{generator}; // import { generator } from "./generator.js";
import super::parsing::parser::{createParser,parseProgram}; // import { Parser } from "../../parsing/parser.js";
import super::parsing::parseSession::{ParseSession}; // import { Parser } from "../../parsing/parser.js";
import super::typeChecker::typeChecker::{TypeChecker}; // import { TypeChecker } from "./typeChecker/typeChecker.js";
// import self::errors::syntaxError::SyntaxError; // import { SyntaxError } from "../errors/SyntaxError.js";
// import self::commands::printCodeView::printCodeView; // import { printCodeView } from "../commands/printCodeView.js";

struct CommandOptions {
    checkTypes: bool,
    outDir: string,
    run: bool,
    verbose: bool,
}

export fn main([string] argv) {
    let args = argv.slice(2);

    let options = CommandOptions {
        checkTypes: true,
        outDir: "./target/dev",
        run: false,
        verbose: false,
    };

    let mut inputPath: Option<string> = None;

    let mut errorCount = 0;
    let mut i = -1;
    while (i < args.length) {
        i = i + 1;
        let arg = args[i];
        if (!arg) continue;

        if (arg.startsWith("-")) {
            // Option
            let option = arg.slice(1);
            if (option == "-verbose") {
                options.verbose = true;
            } else if (option == "-run" || option == "R") {
                options.run = true;
            } else if (option == "-out-dir" || option == "O") {
                let outDir = args[++i];
                if (outDir == undefined) return Error("out-dir option was passed but no path was specified");
                options.outDir = outDir;
            } else if (option == "-no-check") {
                options.checkTypes = false;
            } else {
                return Error("Unknown option `" + option + "`");
            }
        } else {
            // Argument
            if (inputPath != None) return Error("you can only specify one entry-point");
            inputPath = arg;
        }
    }

    if (inputPath == null) Error("no entry-points specified");

    compile(ParseSession {
        cwd: process.cwd(),
        mainDir: path.join(inputPath, "../"),
        modules: [],
    }, inputPath, options);
    /*{
        errorCount++;
        if (error instanceof SyntaxError) {
            if (error.span) {
                console.log(chalk.bold(chalk.red("error: ") + chalk.whiteBright(error.message)));
                printCodeView(error.span);
            } else {
                console.log(error.stack);
            }
        } else if (error instanceof Error) {
            console.log(chalk.bold(chalk.redBright("error: ") + error.message));
        } else throw error;
    }*/

    console.log();
    if (errorCount == 0) console.log("Files emitted to " + options.outDir);
    else console.log(chalk.bold(chalk.redBright("error: ") + "aborting due to " + errorCount + " previous errors"));
    console.log();

    if (errorCount == 0 && options.run && inputPath != null) {
        console.log("Running program");
        let outputFileName = path.basename(inputPath, path.extname(inputPath));
        let process = spawnSync("bun", [outputFileName], SpawnSyncOptions {
            stdio: "inherit",
            cwd: options.outDir,
        });
        console.log("\nProgram exited with code " + process.status);
    }
}


fn toFixed(f32 num, u32 decimals) {
    return num.toFixed(decimals);
}

fn compile(ParseSession session, string inputPath, CommandOptions options) {
    let startTime = nanoseconds();
    compileFile(session, inputPath, options);
    let endTime = nanoseconds();
    
    let outputFileName = path.basename(inputPath, path.extname(inputPath));
    console.log(chalk.greenBright.bold(outputFileName + " built succesfully!"));
    console.log("  in " + toFixed((endTime - startTime) / 1_000_000, 2) + "ms");
}

fn compileFile(ParseSession session, string inputPath, CommandOptions options) {
    if (!(fs.existsSync(inputPath))) {
        return Error("could not find file " + inputPath);
    }

    let mut i = 0;
    while (i < session.modules.length) {
        if (session.modules[i].path == inputPath) return;
        i = i + 1;
    }

    let inputDirectory = path.join(inputPath, "../");
    let sourceCode = fs.readFileSync(inputPath, "utf8");
    let parser = createParser(
        SourceFile {
            name: inputPath,
            content: sourceCode,
        }
    );
    let ast = parseProgram(parser, "main");

    if (options.checkTypes) TypeChecker.new(ast).check();
    let output = generator(ast, GeneratorOptions { verbose: options.verbose, });
    let outputFileName = path.basename(inputPath, path.extname(inputPath));
    let outputDirectory = path.relative(session.mainDir, inputDirectory);

    fs.mkdirSync(path.join(session.cwd, options.outDir, outputDirectory));
    fs.writeFileSync(path.join(options.outDir, outputDirectory, outputFileName + ".js"), output);

    session.modules.push(Module {
        code: ast,
        path: inputPath,
    });

    // Compile imports
    i = 0;
    while (i < ast.statements.length) {
        let node = ast.statements[i];
        i = i + 1;
        if (node.nodeType != NodeType.ImportDeclaration) continue;

        // Skip libs
        if (node.module.length == 0) continue;
        if (!["self", "super"].includes(node.module.at(0).value)) continue;

        let relativeImportPath =
            node.module
                .map((d) => d.value)
                .map((s) => (s == "super" ? ".." : s == "self" ? "." : s))
                .join("/") + ".axi";
        let pathToDependency = path.join(inputDirectory, relativeImportPath);

        compileFile(session, pathToDependency, options);
    }
}
