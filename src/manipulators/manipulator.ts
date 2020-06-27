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

import {Diagnostic, ts} from 'ts-morph';
import {ErrorDetector} from 'error_detectors/error_detector';

/** Base class for manipulating AST to fix for flags. */
export abstract class Manipulator {
  errorDetector: ErrorDetector;
  diagnosticCodes: Set<number>;

  /**
   * Sets relevant error codes and node kinds for specific flags.
   * @param {ErrorDetector} errorDetector - Util class for filtering diagnostics.
   * @param {Set<number>} diagnosticCodes - Codes of compiler flag errors.
   */
  constructor(errorDetector: ErrorDetector, diagnosticCodes: Set<number>) {
    this.errorDetector = errorDetector;
    this.diagnosticCodes = diagnosticCodes;
  }

  /**
   * Manipulates AST of project to fix for a specific flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser.
   */
  abstract fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void;

  /**
   * Manipulates AST of project to fix for a specific flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser.
   * @return {boolean} True if diagnostics contain error codes for the flag.
   */
  hasErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): boolean {
    return this.errorDetector.detectErrors(diagnostics, this.diagnosticCodes);
  }
}
