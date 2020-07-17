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
import {Runner} from 'src/runner';
import {OutOfPlaceEmitter} from 'src/emitters/out_of_place_emitter';
import {SourceFileComparer} from 'testing/source_file_matcher';
import {ProdErrorDetector} from 'src/error_detectors/prod_error_detector';
import {StrictPropertyInitializationManipulator} from '@/src/manipulators/strict_property_initialization_manipulator';
import {StrictNullChecksManipulator} from '@/src/manipulators/strict_null_checks_manipulator';

describe('Runner', () => {
  beforeAll(() => {
    jasmine.addMatchers(SourceFileComparer);
  });

  it('should fix strictPropertyInitialization', () => {
    const relativeOutputPath = './ts_upgrade';
    const inputConfigPath = './test/test_files/tsconfig.json';

    const inputFilePaths = [
      './test/test_files/strict_property_initialization/no_initialization.ts',
    ];
    const actualOutputFilePaths = [
      './test/test_files/strict_property_initialization/ts_upgrade/no_initialization.ts',
    ];
    const expectedOutputFilePaths = [
      './test/test_files/golden/strict_property_initialization/no_initialization.ts',
    ];

    const project = new Project({
      tsConfigFilePath: inputConfigPath,
      addFilesFromTsConfig: false,
      compilerOptions: {
        strictNullChecks: true,
        strictPropertyInitialization: true,
      },
    });

    project.addSourceFilesAtPaths(inputFilePaths);
    project.resolveSourceFileDependencies();

    const errorDetector = new ProdErrorDetector();

    new Runner(
      /* args*/ undefined,
      project,
      /* parser */ undefined,
      errorDetector,
      [
        new StrictPropertyInitializationManipulator(errorDetector),
        new StrictNullChecksManipulator(errorDetector),
      ],
      new OutOfPlaceEmitter(relativeOutputPath)
    ).run();

    const expectedOutputs = project.addSourceFilesAtPaths(
      expectedOutputFilePaths
    );
    const actualOutputs = project.addSourceFilesAtPaths(actualOutputFilePaths);

    expect(expectedOutputs.length).toEqual(actualOutputs.length);

    for (let i = 0; i < actualOutputs.length; i++) {
      expect(actualOutputs[i]).toHaveSameASTAs(expectedOutputs[i]);
    }
  });
});
