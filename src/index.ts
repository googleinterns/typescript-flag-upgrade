#!/usr/bin/env node

/*
    Copyright 2020 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import yargs from 'yargs';
import {Runner} from './runner';
import {DEFAULT_ARGS} from './types';

const args = yargs
  .options({
    p: {
      alias: 'project',
      demandOption: true,
      default: DEFAULT_ARGS.p,
      description:
        'Relative path to TypeScript config file (eg. "./dir/tsconfig.json")',
      normalize: true,
      type: 'string',
    },
    m: {
      alias: 'mode',
      demandOption: true,
      default: DEFAULT_ARGS.m,
      description:
        "Option between only leaving comments ('comment') or both comments and mutative fixes ('all')",
      type: 'string',
      choices: ['all', 'comment'],
    },
    i: {
      alias: 'input_directory',
      demandOption: false,
      description: 'Override config and specify input directory',
      normalize: true,
      type: 'string',
    },
    l: {
      alias: 'log_location',
      demandOption: false,
      description: 'Specify file for logging',
      normalize: true,
      type: 'string',
    },
  })
  .usage(
    'typescript-flag-upgrade -p <path-to-config> [-m <all|comment>] [-i <path-to-input-dir>] [-l <path-to-log>]'
  )
  .epilogue('Copyright 2020 Google LLC').argv;

new Runner(args).run();
