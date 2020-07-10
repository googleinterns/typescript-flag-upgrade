import {Project} from 'ts-morph';
import {Runner} from 'src/runner';
import {OutOfPlaceEmitter} from 'src/emitters/out_of_place_emitter';
import {SourceFileComparer} from 'testing/source_file_matcher';

describe('Runner', () => {
  beforeAll(() => {
    jasmine.addMatchers(SourceFileComparer);
  });

  it('should fix strictNullChecks', () => {
    const relativeOutputPath = './ts_upgrade';
    const inputConfigPath = './test/test_files/tsconfig.json';

    const inputFilePaths = [
      './test/test_files/strict_null_checks/object_possibly_null.ts',
      './test/test_files/strict_null_checks/unassignable_argument_type.ts',
      './test/test_files/strict_null_checks/unassignable_variable_type.ts',
    ];
    const actualOutputFilePaths = [
      './test/test_files/strict_null_checks/ts_upgrade/object_possibly_null.ts',
      './test/test_files/strict_null_checks/ts_upgrade/unassignable_argument_type.ts',
      './test/test_files/strict_null_checks/ts_upgrade/unassignable_variable_type.ts',
    ];
    const expectedOutputFilePaths = [
      './test/test_files/golden/strict_null_checks/object_possibly_null.ts',
      './test/test_files/golden/strict_null_checks/unassignable_argument_type.ts',
      './test/test_files/golden/strict_null_checks/unassignable_variable_type.ts',
    ];

    const project = new Project({
      tsConfigFilePath: inputConfigPath,
      addFilesFromTsConfig: false,
      compilerOptions: {
        strictNullChecks: true,
      },
    });

    project.addSourceFilesAtPaths(inputFilePaths);
    project.resolveSourceFileDependencies();

    new Runner(
      /* args*/ undefined,
      project,
      /* parser */ undefined,
      /* errorDetector */ undefined,
      /* manipulators */ undefined,
      new OutOfPlaceEmitter(project, relativeOutputPath)
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
