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
import _ from 'lodash';
import {OutOfPlaceEmitter} from '@/src/emitters/out_of_place_emitter';
import {SourceFileComparer} from '@/testing/source_file_matcher';
import {ProdErrorDetector} from '@/src/error_detectors/prod_error_detector';
import {ErrorDetector} from '@/src/error_detectors/error_detector';
import {Emitter} from '@/src/emitters/emitter';
import {NoImplicitAnyManipulator} from '@/src/manipulators/no_implicit_any_manipulator';

describe('NoImplicitAnyManipulator', () => {
  let project: Project;
  let errorDetector: ErrorDetector;
  let emitter: Emitter;
  let manipulator: NoImplicitAnyManipulator;

  beforeAll(() => {
    jasmine.addMatchers(SourceFileComparer);

    const relativeOutputPath = './ts_upgrade';
    const inputConfigPath = './test/test_files/tsconfig.json';

    project = new Project({
      tsConfigFilePath: inputConfigPath,
      addFilesFromTsConfig: false,
      compilerOptions: {
        noImplicitAny: true,
      },
    });
    errorDetector = new ProdErrorDetector();
    emitter = new OutOfPlaceEmitter(relativeOutputPath);
    manipulator = new NoImplicitAnyManipulator(errorDetector);
  });

  const testFiles = [
    {
      description: 'fixes basic cases of assignment and function calls',
      inputFilePath:
        './test/test_files/no_implicit_any/basic_assignment_and_functions.ts',
      actualOutputFilePath:
        './test/test_files/no_implicit_any/ts_upgrade/basic_assignment_and_functions.ts',
      expectedOutputFilePath:
        './test/test_files/golden/no_implicit_any/basic_assignment_and_functions.ts',
    },
    {
      description:
        'fixes declarations that require resolving in specific order',
      inputFilePath:
        './test/test_files/no_implicit_any/topologically_dependent.ts',
      actualOutputFilePath:
        './test/test_files/no_implicit_any/ts_upgrade/topologically_dependent.ts',
      expectedOutputFilePath:
        './test/test_files/golden/no_implicit_any/topologically_dependent.ts',
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

  it('topologically sorts graph', () => {
    const basicGraph = {
      vertices: new Set(['x', 'y', 'z', 'w']),
      edges: new Map([
        ['x', new Set(['y', 'z'])],
        ['y', new Set(['z', 'w'])],
      ]),
      sorted: [
        ['x', 'y', 'z', 'w'],
        ['x', 'y', 'w', 'z'],
      ],
    };

    expect(
      basicGraph.sorted.some(expectedOut =>
        _.isEqual(
          expectedOut,
          manipulator.topoSort(basicGraph.vertices, basicGraph.edges)
        )
      )
    ).toBeTrue();

    const cycleGraph = {
      vertices: new Set(['x', 'y', 'z', 'w']),
      edges: new Map([
        ['x', new Set(['y'])],
        ['y', new Set(['z'])],
        ['z', new Set(['w'])],
        ['w', new Set(['y'])],
      ]),
      sorted: ['x', 'y', 'z', 'w'],
    };

    expect(
      _.isEqual(
        cycleGraph.sorted,
        manipulator.topoSort(cycleGraph.vertices, cycleGraph.edges)
      )
    ).toBeTrue();
  });
});
