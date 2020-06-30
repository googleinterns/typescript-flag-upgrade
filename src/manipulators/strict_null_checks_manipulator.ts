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
import {
  Diagnostic,
  ts,
  SyntaxKind,
  Node,
  StatementedNode,
  VariableDeclaration,
  Type,
  ParameterDeclaration,
  PropertyDeclaration,
} from 'ts-morph';
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

    const modifiedDeclarationTypes = new Map<
      VariableDeclaration | ParameterDeclaration | PropertyDeclaration,
      Set<Type>
    >();

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

            const modifiedStatement = this.getModifiedStatement(newNode);

            modifiedStatementedNodes.add([
              (modifiedStatement.getParentOrThrow() as unknown) as StatementedNode,
              modifiedStatement.getChildIndex(),
            ]);
          }
          break;
        }
        case ErrorCodes.TypeANotAssignableToTypeB: {
          if (
            Node.isIdentifier(errorNode) ||
            Node.isPropertyAccessExpression(errorNode)
          ) {
            const errorSymbol = errorNode.getSymbolOrThrow();
            const declarations = errorSymbol.getDeclarations();

            const typesToAdd = this.determineAssignedType(errorNode);

            declarations.forEach(declaration => {
              if (
                Node.isVariableDeclaration(declaration) ||
                Node.isParameterDeclaration(declaration) ||
                Node.isPropertyDeclaration(declaration)
              ) {
                const declarationType = this.toTypeList(declaration.getType());

                if (modifiedDeclarationTypes.has(declaration)) {
                  declarationType.forEach(type => {
                    modifiedDeclarationTypes.get(declaration)?.add(type);
                  });
                } else {
                  modifiedDeclarationTypes.set(
                    declaration,
                    new Set(declarationType)
                  );
                }

                typesToAdd.forEach(type => {
                  modifiedDeclarationTypes.get(declaration)?.add(type);
                });
              }
            });
          }
          break;
        }
      }
    });

    modifiedDeclarationTypes.forEach((types, declaration) => {
      const newDeclaration = declaration.setType(
        Array.from(types)
          .map(type => {
            return type.getText();
          })
          .join(' | ')
      );

      const modifiedStatement = this.getModifiedStatement(newDeclaration);
      modifiedStatementedNodes.add([
        (modifiedStatement.getParentOrThrow() as unknown) as StatementedNode,
        modifiedStatement.getChildIndex(),
      ]);
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

  private determineAssignedType(node: Node<ts.Node>): Type[] {
    let assignedTypes: Type[] = [];

    const parent = node.getParentIfKind(SyntaxKind.BinaryExpression);
    const sibling = node.getNextSiblingIfKind(SyntaxKind.EqualsToken);

    if (sibling && parent) {
      assignedTypes = this.toTypeList(
        sibling.getNextSiblingOrThrow().getType()
      );
    }

    return assignedTypes;
  }

  private toTypeList(type: Type): Type[] {
    return type.isUnion()
      ? type.getUnionTypes().map(individualType => {
          return individualType.getBaseTypeOfLiteralType();
        })
      : [type.getBaseTypeOfLiteralType()];
  }

  private getModifiedStatement(node: Node<ts.Node>) {
    return node.getParentWhileOrThrow((parent, child) => {
      return !(Node.isStatementedNode(parent) && Node.isStatement(child));
    });
  }
}
