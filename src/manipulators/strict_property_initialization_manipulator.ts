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

import {Manipulator} from './manipulator';
import {Diagnostic, ts, SyntaxKind} from 'ts-morph';
import {ErrorDetector} from 'src/error_detectors/error_detector';
import {ErrorCodes} from '../types';

/**
 * Manipulator that fixes for the strictPropertyInitialization compiler flag.
 * @extends {Manipulator}
 */
export class StrictPropertyInitializationManipulator extends Manipulator {
  private nodeKinds: Set<SyntaxKind>;

  constructor(errorDetector: ErrorDetector) {
    super(
      errorDetector,
      new Set<number>([ErrorCodes.PropertyNoInitializer])
    );
    this.nodeKinds = new Set<SyntaxKind>([SyntaxKind.Identifier]);
  }

  /**
   * Manipulates AST of project to fix for the strictPropertyInitialization compiler flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser
   */
  fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void {
    // // Retrieve AST nodes corresponding to diagnostics with relevant error codes
    // const errorNodes = this.errorDetector.filterDiagnosticsByKind(
    //   this.errorDetector.getNodesFromDiagnostics(
    //     this.errorDetector.filterDiagnosticsByCode(
    //       diagnostics,
    //       this.errorCodesToFix
    //     )
    //   ),
    //   this.nodeKinds
    // );
    // // Iterate through each node in reverse traversal order to prevent interference
    // errorNodes.forEach(({node: errorNode}) => {
    //   errorNode.replaceWithText(errorNode.getText() + '?');
    // });
  }
}
