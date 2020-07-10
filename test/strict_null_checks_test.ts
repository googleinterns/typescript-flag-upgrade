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

    const inputFilePath = './test/test_files/strict_null_checks_sample.ts';
    const actualOutputFilePath =
      './test/test_files/ts_upgrade/strict_null_checks_sample.ts';
    const expectedOutputFilePath =
      './test/test_files/golden/strict_null_checks_sample.ts';

    const project = new Project({
      tsConfigFilePath: inputConfigPath,
      addFilesFromTsConfig: false,
      compilerOptions: {
        strictNullChecks: true,
      },
    });

    project.addSourceFileAtPath(inputFilePath);
    project.resolveSourceFileDependencies();

    new Runner(
      /* args*/ undefined,
      project,
      /* parser */ undefined,
      /* errorDetector */ undefined,
      /* manipulators */ undefined,
      new OutOfPlaceEmitter(project, relativeOutputPath)
    ).run();

    const expectedOutput = project.addSourceFileAtPath(expectedOutputFilePath);
    const actualOutput = project.addSourceFileAtPath(actualOutputFilePath);

    expect(actualOutput).toHaveSameASTAs(expectedOutput);
  });
});
