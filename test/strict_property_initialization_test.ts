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
import {StrictPropertyInitializationManipulator} from '@/src/manipulators/strict_property_initialization_manipulator';
import {StrictNullChecksManipulator} from '@/src/manipulators/strict_null_checks_manipulator';
import {ErrorDetector} from '@/src/error_detectors/error_detector';
import {Emitter} from '@/src/emitters/emitter';
import {Manipulator} from '@/src/manipulators/manipulator';

describe('StrictPropertyInitializationManipulator', () => {
  let project: Project;
  let errorDetector: ErrorDetector;
  let emitter: Emitter;
  let manipulators: Manipulator[];

  beforeEach(() => {
    jasmine.addMatchers(SourceFileComparer);

    const relativeOutputPath = './ts_upgrade';
    const inputConfigPath = './test/test_files/tsconfig.json';

    project = new Project({
      tsConfigFilePath: inputConfigPath,
      addFilesFromTsConfig: false,
      compilerOptions: {
        strictPropertyInitialization: true,
        strictNullChecks: true,
      },
    });
    errorDetector = new ProdErrorDetector();
    emitter = new OutOfPlaceEmitter(relativeOutputPath);
    manipulators = [
      new StrictPropertyInitializationManipulator(errorDetector),
      new StrictNullChecksManipulator(errorDetector),
    ];
  });

  const testFiles = [
    {
      description: 'fixes when property is not initialized',
      inputFilePath:
        './test/test_files/strict_property_initialization/no_initialization.ts',
      actualOutputFilePath:
        './test/test_files/strict_property_initialization/ts_upgrade/no_initialization.ts',
      expectedOutputFilePath:
        './test/test_files/golden/strict_property_initialization/no_initialization.ts',
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
        manipulators,
        emitter
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
