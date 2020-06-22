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
import {Project, Diagnostic, ts} from 'ts-morph';
import {ArgumentOptions} from './types';
import {fixNoImplicitReturns} from './manipulators/no_implicit_returns_manipulator';

export class Runner {
  private args: ArgumentOptions;
  private project: Project;

  constructor(args: ArgumentOptions) {
    this.args = args;
    this.project = this.init();
  }

  public run() {
    const sourceFiles = this.project.getSourceFiles();

    console.log(
      sourceFiles.map(file => {
        return file.getFilePath();
      })
    );
    const errors = this.parse();

    fixNoImplicitReturns(errors);
    this.emit();
  }

  private init(): Project {
    if (this.args.i) {
      const project = new Project({
        tsConfigFilePath: path.join(process.cwd(), this.args.p),
        addFilesFromTsConfig: false,
      });

      if (path.extname(this.args.i)) {
        project.addSourceFilesAtPaths(path.join(process.cwd(), this.args.i));
      } else {
        project.addSourceFilesAtPaths(
          path.join(process.cwd(), this.args.i) + '/**/*{.d.ts,.ts}'
        );
      }

      project.resolveSourceFileDependencies();
      return project;
    }

    return new Project({
      tsConfigFilePath: path.join(process.cwd(), this.args.p),
    });
  }

  private parse(): Diagnostic<ts.Diagnostic>[] {
    return this.project.getPreEmitDiagnostics();
  }

  private emit() {
    this.project.save();
  }
}
