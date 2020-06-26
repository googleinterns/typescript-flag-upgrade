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
import {Emitter} from './emitter';
import {Project} from 'ts-morph';

/** Out-of-place emitter that emits to a dist directory. */
export class OutOfPlaceEmitter extends Emitter {
  private outputPath: string;

  /**
   * Sets project and output path to be emitted to.
   * @param {Project} project - ts-morph project to be emitted
   * @param {string} project - Relative path to output directory
   */
  constructor(project: Project, outputPath = './ts_upgrade') {
    super(project);
    this.outputPath = outputPath;
  }

  /**
   * Creates dist directory and copies modified source files to it.
   */
  emit(): void {
    const srcDirs = this.project.getRootDirectories();
    const sourceFiles = this.project.getSourceFiles();

    srcDirs.forEach(srcDir => {
      const destDir = srcDir.createDirectory(
        path.join(srcDir.getPath(), this.outputPath)
      );
      for (const sourceFile of sourceFiles) {
        if (srcDir.isAncestorOf(sourceFile)) {
          const relativePath = srcDir.getRelativePathTo(sourceFile);
          srcDir.createSourceFile(
            path.join(destDir.getPath(), relativePath),
            sourceFile.getFullText(),
            {overwrite: true}
          );
        }
      }
      destDir.saveSync();
    });
  }
}
