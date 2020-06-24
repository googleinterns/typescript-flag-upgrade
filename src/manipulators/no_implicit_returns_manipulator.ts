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

import _ from 'lodash';
import {Diagnostic, ts, Node, SyntaxKind, Project} from 'ts-morph';
import {Manipulator} from './manipulator';

/**
 * Manipulator that fixes for the noImplicitReturns compiler flag
 * @extends {Manipulator}
 */
export class NoImplicitReturnsManipulator extends Manipulator {
  constructor(project: Project) {
    super(project);
    this.errorCodes = new Set<number>([7030]);
  }

  /**
   * Manipulates AST of project to fix for the noImplicitReturns compiler flag given diagnostics
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser
   */
  fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void {
    // Retrieve AST nodes corresponding to diagnostics with relevant error codes
    const errorNodes = this.filterNodesFromDiagnostics(
      this.filterErrors(diagnostics),
      new Set<SyntaxKind>([
        SyntaxKind.Identifier,
        SyntaxKind.ReturnStatement,
        SyntaxKind.ArrowFunction,
      ])
    );

    // Iterate through each node in reverse traversal order to prevent interference
    _.forEachRight(errorNodes, ([errorNode]) => {
      const parent = errorNode.getParent();

      switch (errorNode.getKind()) {
        // When node is a function or method, add return undefined statement
        case SyntaxKind.Identifier: {
          if (
            parent &&
            (Node.isFunctionDeclaration(parent) ||
              Node.isMethodDeclaration(parent))
          ) {
            parent.addStatements(
              '// typescript-flag-upgrade automated fix: --noImplicitReturns'
            );
            parent.addStatements('return undefined;');
          }
          break;
        }

        // When node is an empty return statement, replace it with return undefined
        case SyntaxKind.ReturnStatement: {
          if (parent && Node.isBlock(parent)) {
            const index = errorNode.getChildIndex();
            parent.removeStatement(index);
            parent.addStatements(
              '// typescript-flag-upgrade automated fix: --noImplicitReturns'
            );
            parent.addStatements('return undefined;');
          }
          break;
        }

        // If node is an inline arrow function, add return undefined statement
        case SyntaxKind.ArrowFunction: {
          const child = errorNode.getLastChildByKind(SyntaxKind.Block);
          if (child) {
            child.addStatements(
              '// typescript-flag-upgrade automated fix: --noImplicitReturns'
            );
            child.addStatements('return undefined;');
          }
          break;
        }
      }
    });
  }
}
