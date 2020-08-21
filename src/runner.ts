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

import path from 'path';
import _ from 'lodash';
import {Project, ts} from 'ts-morph';
import {ArgumentOptions, DEFAULT_ARGS} from './types';
import {Parser} from './parser';
import {Manipulator} from './manipulators/manipulator';
import {NoImplicitReturnsManipulator} from './manipulators/no_implicit_returns_manipulator';
import {NoImplicitAnyManipulator} from './manipulators/no_implicit_any_manipulator';
import {StrictNullChecksManipulator} from './manipulators/strict_null_checks_manipulator';
import {StrictPropertyInitializationManipulator} from './manipulators/strict_property_initialization_manipulator';
import {ErrorDetector} from './error_detectors/error_detector';
import {ProdErrorDetector} from './error_detectors/prod_error_detector';
import {Emitter} from './emitters/emitter';
import {InPlaceEmitter} from './emitters/in_place_emitter';
import {Logger} from './loggers/logger';
import {ConsoleLogger} from './loggers/console_logger';

/** Class responsible for running the execution of the tool. */
export class Runner {
  private project: Project;

  private parser: Parser;
  private emitter: Emitter;
  private logger: Logger;
  private errorDetector: ErrorDetector;
  private format: boolean | undefined;

  private manipulators: Manipulator[];

  /**
   * Instantiates project and appropriate modules.
   * @param {ArgumentOptions} args - Arguments passed.
   * @param {Project} project - Project to override arguments.
   * @param {Parser} parser - Parser to override arguments.
   * @param {ErrorDetector} errorDetector - Error detector to override arguments.
   * @param {Manipulator[]} manipulators - List of manipulators to override arguments.
   * @param {Emitter} emitter - Emitter to override arguments.
   * @param {Logger} logger - Logger to override arguments.
   */
  constructor(
    args?: ArgumentOptions,
    project?: Project,
    parser?: Parser,
    errorDetector?: ErrorDetector,
    manipulators?: Manipulator[],
    emitter?: Emitter,
    logger?: Logger
  ) {
    args = args || DEFAULT_ARGS;
    this.format = args.f;
    this.parser = parser || new Parser();
    if (project) {
      this.project = project;
    } else {
      this.verifyProject(args);
      this.project = this.createProject(args);
    }
    this.errorDetector = errorDetector || new ProdErrorDetector();
    this.logger = logger || new ConsoleLogger();
    this.manipulators = manipulators || [
      new NoImplicitReturnsManipulator(this.errorDetector, this.logger),
      new StrictPropertyInitializationManipulator(
        this.errorDetector,
        this.logger
      ),
      new StrictNullChecksManipulator(this.errorDetector, this.logger),
      new NoImplicitAnyManipulator(this.errorDetector, this.logger),
    ];
    this.emitter = emitter || new InPlaceEmitter();
  }

  /**
   * Runs through execution of parsing, manipulating, and emitting.
   */
  run() {
    // Log retrieved source files.
    const sourceFiles = this.project.getSourceFiles();
    this.logger.log(
      sourceFiles.map(file => {
        return file.getFilePath();
      })
    );

    // Set of modified source file paths.
    const modifiedSourceFilePaths = new Set<string>();

    // Parse errors, save copy of errors.
    let errors = this.parser.parse(this.project);
    let prevErrors = errors;
    let errorsExist: boolean;
    let nextManipulatorIndex: number;

    do {
      errorsExist = false;
      nextManipulatorIndex = 0;

      // For each manipulator, check if there are errors that it can fix.
      for (const manipulator of this.manipulators) {
        nextManipulatorIndex += 1;

        // If a manipulator detects errors that it can fix, fix them and reparse errors.
        if (manipulator.hasErrors(errors)) {
          manipulator
            .fixErrors(errors)
            .forEach(modifiedSourceFile =>
              modifiedSourceFilePaths.add(modifiedSourceFile.getFilePath())
            );
          errorsExist = true;
          prevErrors = errors;
          errors = this.parser.parse(this.project);
          break;
        }
      }

      // Rotate manipulators so that in next iteration, the next manipulator is run first.
      this.rotateArrayLeft(this.manipulators, nextManipulatorIndex);

      // If previous iterations' errors are same as current errors, no more errors can be fixed so exit loop.
      // TODO: Log if previous errors are same as current errors.
    } while (errorsExist && !_.isEqual(errors, prevErrors));

    // Format and emit project.
    if (this.format) this.emitter.format(modifiedSourceFilePaths, this.project);
    this.emitter.emit(this.project);
  }

  /**
   * Creates a ts-morph project from CLI arguments.
   * @param {ArgumentOptions} args - CLI Arguments containing project properties.
   * @param {boolean} strictMode - If true, four strict flags are set to true.
   * @return {Project} Created project.
   */
  private createProject(args: ArgumentOptions, strictMode = true): Project {
    const setCompilerOptions = strictMode
      ? {
          strictNullChecks: true,
          strictPropertyInitialization: true,
          noImplicitAny: true,
          noImplicitReturns: true,
        }
      : undefined;

    if (args.i) {
      const project = new Project({
        tsConfigFilePath: path.join(process.cwd(), args.p),
        addFilesFromTsConfig: false,
        compilerOptions: setCompilerOptions,
      });

      project.addSourceFilesAtPaths(
        path.join(process.cwd(), args.i) + '/**/*{.d.ts,.ts}'
      );

      project.resolveSourceFileDependencies();
      return project;
    }

    return new Project({
      tsConfigFilePath: path.join(process.cwd(), args.p),
      compilerOptions: setCompilerOptions,
    });
  }

  /**
   * Verifies that the project user passes in through CLI compiles initially with flags set to false.
   * @param {ArgumentOptions} args - CLI Arguments containing project properties.
   */
  private verifyProject(args: ArgumentOptions): void {
    if (
      !this.parser.parse(this.createProject(args, false)).every(diagnostic => {
        return diagnostic.getCategory() !== ts.DiagnosticCategory.Error;
      })
    ) {
      throw new Error(
        'Project not current compiling with original tsconfig flags.'
      );
    }
  }

  /**
   * Mutatively rotates an array to the left.
   * @param {T[]} arr - Array to be rotated.
   * @param {number} index - Number of elements to rotate the array by.
   */
  private rotateArrayLeft<T>(arr: T[], index: number): void {
    if (arr.length > 0) {
      for (let times = 0; times < index; times += 1) {
        arr.push(arr.shift()!);
      }
    }
  }
}
