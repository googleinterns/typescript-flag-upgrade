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

/** Base class for emitting modified TypeScript files. */
export abstract class Emitter {
  /**
   * Emits project, implemented by subclasses.
   * @param {Project} project - ts-morph project to be emitted.
   */
  abstract emit(project: Project): void;

  /**
   * Formats source files given a set of their file paths.
   * @param sourceFilePaths - Set of file paths of source files to format.
   * @param project - ts-morph project containing source files.
   */
  format(sourceFilePaths: Set<string>, project: Project): void {
    sourceFilePaths.forEach(sourceFilePath =>
      project.getSourceFile(sourceFilePath)?.formatText({
        indentSize: 2,
        ensureNewLineAtEndOfFile: true,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
        insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: false,
        insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
        insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: false,
      })
    );
  }
}
