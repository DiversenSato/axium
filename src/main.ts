#!/usr/bin/env node
import { Argument, Option, program } from 'commander';
import { tokenize } from './tokenizer.js';
import fs from 'fs';
import { generator } from './generator.js';

program.addArgument(
    new Argument('<input-file>', 'The source to compile').argOptional(),
);
program.addOption(
    new Option(
        '-e, --evaluate <source>',
        'Evaluate the given string instead of a file',
    ).conflicts('inputFile'),
);
program.addOption(
    new Option('-v, --verbose', 'Enable verbose output').default(
        false,
        'false',
    ),
);
program.addOption(
    new Option(
        '-o, --output <file>',
        'Output to the given file instead of stdout',
    ),
);

program.version('0.1.0');

program.parse();
const options = program.opts();

let output = '';

if (options.evaluate) {
    output = generator(tokenize(options.evaluate));
} else if (program.args[0]) {
    const filePath = program.args[0]!;
    if (!fs.existsSync(filePath)) {
        console.error(`File "${filePath}" does not exist!`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    output = generator(tokenize(fileContent));
} else {
    console.error('No input specified to compile!');
    process.exit(1);
}

if (options.output) {
    fs.writeFileSync(options.output, output, 'utf-8');
} else {
    console.log(output);
}
