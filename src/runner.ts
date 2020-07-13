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
import {ArgumentOptions} from './types';
import {Emitter} from './emitters/emitter';
import {NoImplicitReturnsManipulator} from './manipulators/no_implicit_returns_manipulator';
import {NoImplicitAnyManipulator} from './manipulators/no_implicit_any_manipulator';
import {StrictNullChecksManipulator} from './manipulators/strict_null_checks_manipulator';
import {StrictPropertyInitializationManipulator} from './manipulators/strict_property_initialization_manipulator';
import {Parser} from './parser';
import {Manipulator} from './manipulators/manipulator';
import {OutOfPlaceEmitter} from './emitters/out_of_place_emitter';
import {ErrorDetector} from './error_detectors/error_detector';
import {ProdErrorDetector} from './error_detectors/prod_error_detector';
import {InPlaceEmitter} from 'src/emitters/in_place_emitter';

/** Class responsible for running the execution of the tool. */
export class Runner {
  private project: Project;

  private parser: Parser;
  private emitter: Emitter;

  private errorDetector: ErrorDetector;

  private manipulators: Manipulator[];

  /**
   * Instantiates project and appropriate modules.
   * @param {ArgumentOptions} args - Arguments passed.
   * @param {Project} project - Project to override arguments.
   * @param {Parser} parser - Parser to override arguments.
   * @param {ErrorDetector} errorDetector - Error detector to override arguments.
   * @param {Manipulator[]} manipulators - List of manipulators to override arguments.
   * @param {Emitter} emitter - Emitter to override arguments.
   */
  constructor(
    args?: ArgumentOptions,
    project?: Project,
    parser?: Parser,
    errorDetector?: ErrorDetector,
    manipulators?: Manipulator[],
    emitter?: Emitter
  ) {
    if (project) {
      this.project = project;
    } else if (args) {
      if (this.verifyProject(args)) {
        this.project = this.createProject(args);
      } else {
        throw new Error(
          'Project not current compiling with flags set to false.'
        );
      }
    } else {
      throw new Error('Neither arguments nor project provided.');
    }

    this.parser = parser || new Parser(this.project);
    this.errorDetector = errorDetector || new ProdErrorDetector();
    this.manipulators = manipulators || [
      new NoImplicitReturnsManipulator(this.errorDetector),
      new NoImplicitAnyManipulator(this.errorDetector),
      new StrictPropertyInitializationManipulator(this.errorDetector),
      new StrictNullChecksManipulator(this.errorDetector),
    ];
    this.emitter = emitter || new InPlaceEmitter(this.project);
  }

  /**
   * Runs through execution of parsing, manipulating, and emitting.
   */
  run() {
    const sourceFiles = this.project.getSourceFiles();
    console.log(
      sourceFiles.map(file => {
        return file.getFilePath();
      })
    );

    let errors = this.parser.parse();
    let prevErrors = errors;
    let errorsExist;

    do {
      errorsExist = false;
      for (const manipulator of this.manipulators) {
        if (manipulator.hasErrors(errors)) {
          manipulator.fixErrors(errors);
          errorsExist = true;
          prevErrors = errors;
          errors = this.parser.parse();
          break;
        }
      }
    } while (errorsExist && !_.isEqual(errors, prevErrors));
    // TODO: Log if previous errors are same as current errors.

    this.emitter.emit();
  }

  /**
   * Creates a ts-morph project from CLI arguments.
   * @param {ArgumentOptions} args - CLI Arguments containing project properties.
   * @param {boolean} setFlag - Whether the flags should be set in the project or not.
   * @return {Project} Created project.
   */
  private createProject(
    args: ArgumentOptions,
    setFlag: boolean = true
  ): Project {
    if (args.i) {
      const project = new Project({
        tsConfigFilePath: path.join(process.cwd(), args.p),
        addFilesFromTsConfig: false,
        compilerOptions: {
          strictNullChecks: setFlag,
          strictPropertyInitialization: setFlag,
          noImplicitAny: setFlag,
          noImplicitReturns: setFlag,
        },
      });

      project.addSourceFilesAtPaths(
        path.join(process.cwd(), args.i) + '/**/*{.d.ts,.ts}'
      );

      project.resolveSourceFileDependencies();
      return project;
    }

    return new Project({
      tsConfigFilePath: path.join(process.cwd(), args.p),
      compilerOptions: {
        strictNullChecks: setFlag,
        strictPropertyInitialization: setFlag,
        noImplicitAny: setFlag,
        noImplicitReturns: setFlag,
      },
    });
  }

  private verifyProject(args: ArgumentOptions): boolean {
    return new Parser(this.createProject(args, false))
      .parse()
      .every(diagnostic => {
        return diagnostic.getCategory() !== ts.DiagnosticCategory.Error;
      });
  }
}
