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

import {Diagnostic, ts, Node, SyntaxKind, StatementedNode} from 'ts-morph';
import {Manipulator} from './manipulator';
import {ErrorCodes} from 'types';
import {ErrorDetector} from 'error_detectors/error_detector';

/**
 * Manipulator that fixes for the noImplicitReturns compiler flag.
 * @extends {Manipulator}
 */
export class NoImplicitReturnsManipulator extends Manipulator {
  private nodeKinds: Set<SyntaxKind>;

  constructor(errorDetector: ErrorDetector) {
    super(
      errorDetector,
      new Set<number>([ErrorCodes.CodePathNoReturn])
    );
    this.nodeKinds = new Set<SyntaxKind>([
      SyntaxKind.Identifier,
      SyntaxKind.ReturnStatement,
      SyntaxKind.ArrowFunction,
    ]);
  }

  /**
   * Manipulates AST of project to fix for the noImplicitReturns compiler flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser.
   */
  fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void {
    // Retrieve AST nodes corresponding to diagnostics with relevant error codes.
    const errorNodes = this.errorDetector.filterDiagnosticsByKind(
      this.errorDetector.getNodesFromDiagnostics(
        this.errorDetector.filterDiagnosticsByCode(
          diagnostics,
          this.errorCodesToFix
        )
      ),
      this.nodeKinds
    );

    // Iterate through each node in reverse traversal order to prevent interference.
    errorNodes.forEach(({node: errorNode}) => {
      const parent = errorNode.getParent();

      switch (errorNode.getKind()) {
        // When node is a function or method, add return undefined statement.
        case SyntaxKind.Identifier: {
          if (
            parent &&
            (Node.isFunctionDeclaration(parent) ||
              Node.isMethodDeclaration(parent))
          ) {
            this.addChildReturnStatement(parent);
          }
          break;
        }

        // When node is an empty return statement, replace it with return undefined.
        case SyntaxKind.ReturnStatement: {
          if (parent && Node.isBlock(parent)) {
            const index = errorNode.getChildIndex();
            parent.removeStatement(index);
            this.addChildReturnStatement(parent);
          }
          break;
        }

        // If node is an inline arrow function, add return undefined statement.
        case SyntaxKind.ArrowFunction: {
          const child = errorNode.getLastChildByKind(SyntaxKind.Block);
          if (child) {
            this.addChildReturnStatement(child);
          }
          break;
        }
      }
    });
  }

  private addChildReturnStatement(node: StatementedNode): void {
    node.addStatements(
      '// typescript-flag-upgrade automated fix: --noImplicitReturns'
    );
    node.addStatements('return undefined;');
  }
}
