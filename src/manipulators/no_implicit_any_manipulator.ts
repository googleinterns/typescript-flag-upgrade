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
import {Diagnostic, ts, SyntaxKind, Node, VariableDeclaration} from 'ts-morph';
import {ErrorDetector} from 'src/error_detectors/error_detector';
import {ErrorCodes} from '../types';

/**
 * Manipulator that fixes for the noImplicitAny compiler flag.
 * @extends {Manipulator}
 */
export class NoImplicitAnyManipulator extends Manipulator {
  private nodeKinds: Set<SyntaxKind>;

  constructor(errorDetector: ErrorDetector) {
    super(
      errorDetector,
      new Set<number>([ErrorCodes.TypeImplicitlyAny])
    );
    this.nodeKinds = new Set<SyntaxKind>([SyntaxKind.Identifier]);
  }

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

    const modifiedDeclarations = new Set<VariableDeclaration>();

    // Iterate through each node in reverse traversal order to prevent interference.
    errorNodes.forEach(({node: errorNode}) => {
      if (Node.isIdentifier(errorNode)) {
        const errorSymbol = errorNode.getSymbol();
        const declarations = errorSymbol?.getDeclarations();
        declarations?.forEach(declaration => {
          if (Node.isVariableDeclaration(declaration)) {
            modifiedDeclarations.add(declaration);
          }
        });
      }
    });

    modifiedDeclarations.forEach(declaration => {
      const references = declaration
        .getFirstChildIfKind(SyntaxKind.Identifier)
        ?.findReferencesAsNodes();
      references?.forEach(reference => {
        const parent = reference.getParentIfKind(SyntaxKind.BinaryExpression);
        const sibling = reference.getNextSiblingIfKind(SyntaxKind.EqualsToken);
        const nextSibling = sibling?.getNextSiblingIfKind(
          SyntaxKind.CallExpression
        );

        if (parent && nextSibling?.getText().startsWith('TestBed.get')) {
          const assignedIdentifiers = nextSibling
            .getDescendantsOfKind(SyntaxKind.Identifier)
            ?.filter(
              identifier =>
                identifier.getText() !== 'TestBed' &&
                identifier.getText() !== 'get'
            );

          const assignedType = assignedIdentifiers
            .map(identifier => identifier.getText())
            .join(' | ');

          declaration.setType(assignedType);
        }
      });
    });
  }
}
