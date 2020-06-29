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
import {ErrorDetector} from 'error_detectors/error_detector';
import {Diagnostic, ts, SyntaxKind, Node, StatementedNode} from 'ts-morph';
import {ErrorCodes} from 'types';

/**
 * Manipulator that fixes for the strictNullChecks compiler flag.
 * @extends {Manipulator}
 */
export class StrictNullChecksManipulator extends Manipulator {
  private nodeKinds: Set<SyntaxKind>;

  constructor(errorDetector: ErrorDetector) {
    super(
      errorDetector,
      new Set<number>([
        ErrorCodes.ObjectPossiblyNull,
        ErrorCodes.ObjectPossiblyUndefined,
        ErrorCodes.ObjectPossiblyNullOrUndefined,
        ErrorCodes.TypeANotAssignableToTypeB,
      ])
    );
    this.nodeKinds = new Set<SyntaxKind>([
      SyntaxKind.Identifier,
      SyntaxKind.PropertyAccessExpression,
      SyntaxKind.CallExpression,
    ]);
  }

  /**
   * Manipulates AST of project to fix for the noImplicitReturns compiler flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser
   */
  fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void {
    // Retrieve AST nodes corresponding to diagnostics with relevant error codes
    const errorNodes = this.errorDetector.sortAndFilterDiagnosticsByKind(
      this.errorDetector.getNodesFromDiagnostics(
        this.errorDetector.filterDiagnosticsByCode(
          diagnostics,
          this.errorCodesToFix
        )
      ),
      this.nodeKinds
    );

    const modifiedStatementedNodes = new Set<[StatementedNode, number]>();

    // Iterate through each node in reverse traversal order to prevent interference
    errorNodes.forEach(({node: errorNode, diagnostic: diagnostic}) => {
      const parent = errorNode.getParentOrThrow();

      switch (diagnostic.getCode()) {
        // When object is possibly null, add definite assignment assertion to identifier
        case ErrorCodes.ObjectPossiblyNull:
        case ErrorCodes.ObjectPossiblyUndefined:
        case ErrorCodes.ObjectPossiblyNullOrUndefined: {
          if (
            Node.isIdentifier(errorNode) &&
            Node.isPropertyAccessExpression(parent)
          ) {
            const newNode = errorNode.replaceWithText(
              errorNode.getText() + '!'
            );

            const modifiedStatement = newNode.getParentWhileOrThrow(
              (parent, child) => {
                return !(
                  Node.isStatementedNode(parent) && Node.isStatement(child)
                );
              }
            );

            modifiedStatementedNodes.add([
              (modifiedStatement.getParentOrThrow() as unknown) as StatementedNode,
              modifiedStatement.getChildIndex(),
            ]);
          }
          break;
        }
        case ErrorCodes.TypeANotAssignableToTypeB: {
          if (Node.isIdentifier(errorNode)) {
            console.log(errorNode.getStartLineNumber());
            errorNode.getDefinitions().forEach(dec => {
              console.log('--');
              console.log(dec.getKind());
              console.log(dec.getNode().getStartLineNumber());
              console.log('--');
              const decNode = dec.getDeclarationNode();
              if (decNode && Node.isVariableDeclaration(decNode)) {
                decNode.setType(errorNode.getType().getText() + ' | any');
              }
            });
          }
          // console.log(errorNode.getText());
          // console.log(errorNode.getKindName());
          // console.log(errorNode.getType().getText());
          break;
        }
      }
    });

    modifiedStatementedNodes.forEach(
      ([modifiedStatementedNode, indexToInsert]) => {
        modifiedStatementedNode.insertStatements(
          indexToInsert,
          '// typescript-flag-upgrade automated fix: --strictNullChecks'
        );
      }
    );
  }
}
