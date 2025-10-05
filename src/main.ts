#!/usr/bin/env node
import { program } from 'commander';
import { tokenize } from './tokenizer.js';

program.argument('<string>', 'The source to compile');

program.parse();

console.log(tokenize(program.args[0] ?? ''));
