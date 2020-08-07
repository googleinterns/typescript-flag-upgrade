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

  beforeEach(() => {
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
    const graphs = [
      // Basic graph
      {
        vertices: new Set(['x', 'y', 'z', 'w']),
        edges: new Map([
          ['x', new Set(['y', 'z'])],
          ['y', new Set(['z', 'w'])],
        ]),
        output: [
          ['x', 'y', 'z', 'w'],
          ['x', 'y', 'w', 'z'],
        ],
      },
      // Cyclical graph
      {
        vertices: new Set(['x', 'y', 'z', 'w']),
        edges: new Map([
          ['x', new Set(['y'])],
          ['y', new Set(['z'])],
          ['z', new Set(['w'])],
          ['w', new Set(['y'])],
        ]),
        output: [['x', 'y', 'z', 'w']],
      },
    ];

    for (const graph of graphs) {
      expect(
        graph.output.some(expectedOut =>
          _.isEqual(
            manipulator.topoSort(graph.vertices, graph.edges),
            expectedOut
          )
        )
      ).toBeTrue();
    }
  });

  it('constructs descendants map', () => {
    const graphs = [
      // Basic graph
      {
        vertices: new Set(['x', 'y', 'z', 'w']),
        edges: new Map([
          ['x', new Set(['y', 'z'])],
          ['y', new Set(['z', 'w'])],
        ]),
        output: new Map([
          ['x', new Set(['y', 'z', 'w'])],
          ['y', new Set(['z', 'w'])],
          ['z', new Set()],
          ['w', new Set()],
        ]),
      },
      // Cyclical graph
      {
        vertices: new Set(['x', 'y', 'z', 'w']),
        edges: new Map([
          ['x', new Set(['y'])],
          ['y', new Set(['z'])],
          ['z', new Set(['w'])],
          ['w', new Set(['y'])],
        ]),
        output: new Map([
          ['x', new Set(['y', 'z', 'w'])],
          ['y', new Set(['z', 'w'])],
          ['z', new Set(['y', 'w'])],
          ['w', new Set(['z', 'y'])],
        ]),
      },
    ];

    for (const graph of graphs) {
      expect(
        _.isEqual(
          manipulator.calculateDescendants(graph.vertices, graph.edges),
          graph.output
        )
      ).toBeTrue();
    }
  });

  it('calculates declaration types given declaration dependencies', () => {
    const sampleDeclarationsSourceFile = project.createSourceFile(
      'test_declarations.ts',
      'let x; let y; let z; let w;'
    );

    expect(
      sampleDeclarationsSourceFile.getVariableDeclaration('x')
    ).toBeDefined();
    expect(
      sampleDeclarationsSourceFile.getVariableDeclaration('y')
    ).toBeDefined();
    expect(
      sampleDeclarationsSourceFile.getVariableDeclaration('z')
    ).toBeDefined();
    expect(
      sampleDeclarationsSourceFile.getVariableDeclaration('w')
    ).toBeDefined();

    const sampleDeclarations = {
      x: sampleDeclarationsSourceFile.getVariableDeclaration('x')!,
      y: sampleDeclarationsSourceFile.getVariableDeclaration('y')!,
      z: sampleDeclarationsSourceFile.getVariableDeclaration('z')!,
      w: sampleDeclarationsSourceFile.getVariableDeclaration('w')!,
    };

    const testCases = [
      // Basic case: x: string -> y -> z
      // Expected: x: string; y: string; z: string
      {
        calculatedDeclarationTypes: new Map([
          [sampleDeclarations.x, new Set(['string'])],
        ]),
        sortedDeclarations: [
          sampleDeclarations.x,
          sampleDeclarations.y,
          sampleDeclarations.z,
        ],
        directDeclarationDependencies: new Map([
          [sampleDeclarations.x, new Set([sampleDeclarations.y])],
          [sampleDeclarations.y, new Set([sampleDeclarations.z])],
        ]),
        output: new Map([
          [sampleDeclarations.x, new Set(['string'])],
          [sampleDeclarations.y, new Set(['string'])],
          [sampleDeclarations.z, new Set(['string'])],
        ]),
      },

      // New types case: x: string -> y: number -> z: boolean
      // Expected: x: string; y: number | string; z: boolean | number | string
      {
        calculatedDeclarationTypes: new Map([
          [sampleDeclarations.x, new Set(['string'])],
          [sampleDeclarations.y, new Set(['number'])],
          [sampleDeclarations.z, new Set(['boolean'])],
        ]),
        sortedDeclarations: [
          sampleDeclarations.x,
          sampleDeclarations.y,
          sampleDeclarations.z,
        ],
        directDeclarationDependencies: new Map([
          [sampleDeclarations.x, new Set([sampleDeclarations.y])],
          [sampleDeclarations.y, new Set([sampleDeclarations.z])],
        ]),
        output: new Map([
          [sampleDeclarations.x, new Set(['string'])],
          [sampleDeclarations.y, new Set(['string', 'number'])],
          [sampleDeclarations.z, new Set(['string', 'number', 'boolean'])],
        ]),
      },

      // Any pollution case: x: string -> y: any -> z: boolean
      // Expected: x: string; y: number | string; z: boolean | number | string
      {
        calculatedDeclarationTypes: new Map([
          [sampleDeclarations.x, new Set(['string'])],
          [sampleDeclarations.y, new Set(['any'])],
          [sampleDeclarations.z, new Set(['boolean'])],
        ]),
        sortedDeclarations: [
          sampleDeclarations.x,
          sampleDeclarations.y,
          sampleDeclarations.z,
        ],
        directDeclarationDependencies: new Map([
          [sampleDeclarations.x, new Set([sampleDeclarations.y])],
          [sampleDeclarations.y, new Set([sampleDeclarations.z])],
        ]),
        output: new Map([[sampleDeclarations.x, new Set(['string'])]]),
      },

      // Circular dependency case case: x: string -> y -> z -> w: number -> y
      // Expected: x: string; y: number | string; z: number | string; w: number | string
      {
        calculatedDeclarationTypes: new Map([
          [sampleDeclarations.x, new Set(['string'])],
          [sampleDeclarations.y, new Set([])],
          [sampleDeclarations.z, new Set([])],
          [sampleDeclarations.z, new Set(['number'])],
        ]),
        sortedDeclarations: [
          sampleDeclarations.x,
          sampleDeclarations.y,
          sampleDeclarations.z,
          sampleDeclarations.w,
        ],
        directDeclarationDependencies: new Map([
          [sampleDeclarations.x, new Set([sampleDeclarations.y])],
          [sampleDeclarations.y, new Set([sampleDeclarations.z])],
          [sampleDeclarations.z, new Set([sampleDeclarations.w])],
          [sampleDeclarations.w, new Set([sampleDeclarations.y])],
        ]),
        output: new Map([
          [sampleDeclarations.x, new Set(['string'])],
          [sampleDeclarations.y, new Set(['string', 'number'])],
          [sampleDeclarations.z, new Set(['string', 'number'])],
          [sampleDeclarations.w, new Set(['string', 'number'])],
        ]),
      },
    ];

    for (const testCase of testCases) {
      manipulator.calculateDeclarationTypes(
        testCase.calculatedDeclarationTypes,
        testCase.sortedDeclarations,
        testCase.directDeclarationDependencies
      );
      expect(
        _.isEqual(testCase.calculatedDeclarationTypes, testCase.output)
      ).toBeTrue();
    }

    project.removeSourceFile(sampleDeclarationsSourceFile);
  });

  it('adds assignment dependencies', () => {
    const sampleDeclarationsSourceFile = project.createSourceFile(
      'test_declarations.ts',
      'let x: string; let y = 0; y = x;'
    );

    expect(
      sampleDeclarationsSourceFile.getVariableDeclaration('x')
    ).toBeDefined();
    expect(
      sampleDeclarationsSourceFile.getVariableDeclaration('y')
    ).toBeDefined();

    const sampleDeclarations = {
      x: sampleDeclarationsSourceFile.getVariableDeclaration('x')!,
      y: sampleDeclarationsSourceFile.getVariableDeclaration('y')!,
    };

    const testCase = {
      declaration: sampleDeclarations.y,
      calculatedDeclarationTypes: new Map(),
      directDeclarationDependencies: new Map(),
      modifiedDeclarations: new Set([
        sampleDeclarations.x,
        sampleDeclarations.y,
      ]),
      outputCalculatedDeclarationTypes: new Map([
        [sampleDeclarations.y, new Set(['number'])],
      ]),
      outputDirectDeclarationDependencies: new Map([
        [sampleDeclarations.x, new Set([sampleDeclarations.y])],
      ]),
    };

    manipulator.addAssignmentDeclarationDependencies(
      testCase.declaration,
      testCase.directDeclarationDependencies,
      testCase.calculatedDeclarationTypes,
      testCase.modifiedDeclarations
    );
    expect(
      _.isEqual(
        testCase.calculatedDeclarationTypes,
        testCase.outputCalculatedDeclarationTypes
      )
    ).toBeTrue();
    expect(
      _.isEqual(
        testCase.directDeclarationDependencies,
        testCase.outputDirectDeclarationDependencies
      )
    ).toBeTrue();

    project.removeSourceFile(sampleDeclarationsSourceFile);
  });

  it('adds function call dependencies', () => {
    const sampleDeclarationsSourceFile = project.createSourceFile(
      'test_declarations.ts',
      'let x = 0; foo(x); function foo(y) {}'
    );

    expect(
      sampleDeclarationsSourceFile.getVariableDeclaration('x')
    ).toBeDefined();
    expect(
      sampleDeclarationsSourceFile.getFunction('foo')?.getParameter('y')
    ).toBeDefined();

    const sampleDeclarations = {
      x: sampleDeclarationsSourceFile.getVariableDeclaration('x')!,
      y: sampleDeclarationsSourceFile.getFunction('foo')!.getParameter('y')!,
    };

    const testCase = {
      declaration: sampleDeclarations.y,
      calculatedDeclarationTypes: new Map(),
      directDeclarationDependencies: new Map(),
      modifiedDeclarations: new Set([
        sampleDeclarations.x,
        sampleDeclarations.y,
      ]),
      outputDirectDeclarationDependencies: new Map([
        [sampleDeclarations.x, new Set([sampleDeclarations.y])],
      ]),
    };

    manipulator.addFunctionCallDeclarationDependencies(
      testCase.declaration,
      testCase.directDeclarationDependencies,
      testCase.calculatedDeclarationTypes,
      testCase.modifiedDeclarations
    );

    expect(
      _.isEqual(
        testCase.directDeclarationDependencies,
        testCase.outputDirectDeclarationDependencies
      )
    ).toBeTrue();

    project.removeSourceFile(sampleDeclarationsSourceFile);
  });
});
