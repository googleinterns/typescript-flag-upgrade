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

import {Project} from 'ts-morph';
import {Runner} from '@/src/runner';
import {OutOfPlaceEmitter} from '@/src/emitters/out_of_place_emitter';
import {SourceFileComparer} from '@/testing/source_file_matcher';
import {ProdErrorDetector} from '@/src/error_detectors/prod_error_detector';
import {StrictNullChecksManipulator} from '@/src/manipulators/strict_null_checks_manipulator';
import {ErrorDetector} from '@/src/error_detectors/error_detector';
import {Emitter} from '@/src/emitters/emitter';
import {Logger} from '@/src/loggers/logger';
import {StubLogger} from '@/src/loggers/stub_logger';

describe('StrictNullChecksManipulator', () => {
  let project: Project;
  let errorDetector: ErrorDetector;
  let emitter: Emitter;
  let logger: Logger;
  let manipulator: StrictNullChecksManipulator;

  beforeEach(() => {
    jasmine.addMatchers(SourceFileComparer);

    const relativeOutputPath = './ts_upgrade';
    const inputConfigPath = './test/test_files/tsconfig.json';

    project = new Project({
      tsConfigFilePath: inputConfigPath,
      addFilesFromTsConfig: false,
      compilerOptions: {
        strictNullChecks: true,
      },
    });
    errorDetector = new ProdErrorDetector();
    emitter = new OutOfPlaceEmitter(relativeOutputPath);
    logger = new StubLogger();
    manipulator = new StrictNullChecksManipulator(errorDetector, logger);
  });

  const testFiles = [
    {
      description: 'fixes when object is possibly null or undefined',
      inputFilePath:
        './test/test_files/strict_null_checks/object_possibly_null.ts',
      actualOutputFilePath:
        './test/test_files/strict_null_checks/ts_upgrade/object_possibly_null.ts',
      expectedOutputFilePath:
        './test/test_files/golden/strict_null_checks/object_possibly_null.ts',
    },
    {
      description: 'fixes when argument with unassignable type is passed',
      inputFilePath:
        './test/test_files/strict_null_checks/unassignable_argument_type.ts',
      actualOutputFilePath:
        './test/test_files/strict_null_checks/ts_upgrade/unassignable_argument_type.ts',
      expectedOutputFilePath:
        './test/test_files/golden/strict_null_checks/unassignable_argument_type.ts',
    },
    {
      description: 'fixes when a variable is assigned an unassignable types',
      inputFilePath:
        './test/test_files/strict_null_checks/unassignable_variable_type.ts',
      actualOutputFilePath:
        './test/test_files/strict_null_checks/ts_upgrade/unassignable_variable_type.ts',
      expectedOutputFilePath:
        './test/test_files/golden/strict_null_checks/unassignable_variable_type.ts',
    },
  ];

  for (let test of testFiles) {
    it(test.description, () => {
      const input = project.addSourceFileAtPath(test.inputFilePath);
      project.resolveSourceFileDependencies();

      new Runner(
        /* args*/ undefined,
        project,
        /* parser */ undefined,
        errorDetector,
        [manipulator],
        emitter,
        logger
      ).run();

      const expectedOutput = project.addSourceFileAtPath(
        test.expectedOutputFilePath
      );
      const actualOutput = project.addSourceFileAtPath(
        test.actualOutputFilePath
      );

      expect(actualOutput).toHaveSameASTAs(expectedOutput);

      project.removeSourceFile(input);
      project.removeSourceFile(actualOutput);
      project.removeSourceFile(expectedOutput);
    });
  }
});
