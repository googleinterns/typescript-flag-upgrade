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
        ErrorCodes.ArgumentNotAssignableToParameter,
      ])
    );
    this.nodeKinds = new Set<SyntaxKind>([
      SyntaxKind.Identifier,
      SyntaxKind.PropertyAccessExpression,
      SyntaxKind.CallExpression,
      SyntaxKind.ReturnStatement,
    ]);
  }

  /**
   * Manipulates AST of project to fix for the noImplicitReturns compiler flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser
   */
  fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void {
    // Retrieve AST nodes corresponding to diagnostics with relevant error codes
    const errorNodes = this.errorDetector.getNodesFromDiagnostics(
      this.errorDetector.filterDiagnosticsByCode(
        diagnostics,
        this.errorCodesToFix
      )
    );

    // Initialize map of declarations to their types
    const modifiedDeclarationTypes = new Map<
      VariableDeclaration | ParameterDeclaration | PropertyDeclaration,
      Set<Type | string>
    >();

    // Keep track of modified statements to insert comments
    const modifiedStatementedNodes = new Set<[StatementedNode, number]>();

    // Iterate through each node in reverse traversal order to prevent interference
    errorNodes.forEach(({node: errorNode, diagnostic: diagnostic}) => {
      switch (diagnostic.getCode()) {
        // When object is possibly null, add definite assignment assertion to identifier
        case ErrorCodes.ObjectPossiblyNull:
        case ErrorCodes.ObjectPossiblyUndefined:
        case ErrorCodes.ObjectPossiblyNullOrUndefined: {
          if (!this.nodeKinds.has(errorNode.getKind())) {
            return;
          }

          if (
            (Node.isIdentifier(errorNode) ||
              Node.isPropertyAccessExpression(errorNode) ||
              Node.isCallExpression(errorNode)) &&
            diagnostic.getLength() === errorNode.getText().length
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

        // When two types are not assignable to each other, add both types to the declaration (variable,
        // parameter, or property declaration)
        case ErrorCodes.TypeANotAssignableToTypeB: {
          if (!this.nodeKinds.has(errorNode.getKind())) {
            return;
          }

          if (
            (Node.isIdentifier(errorNode) ||
              Node.isPropertyAccessExpression(errorNode)) &&
            diagnostic.getLength() === errorNode.getText().length
          ) {
            const errorSymbol = errorNode.getSymbolOrThrow();
            const declarations = errorSymbol.getDeclarations();

            // Determine the type that was assigned to the variable/parameter/property
            const typesToAdd = this.determineAssignedType(errorNode);

            // For each declaration, add the union of all declared and assigned types to modifiedDeclarationTypes
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

            // If error node is a return statement, add definite assignment assertion to return value
          } else if (Node.isReturnStatement(errorNode)) {
            if (
              errorNode.getChildCount() === 1 ||
              (errorNode.getChildCount() === 2 &&
                errorNode.getLastChildOrThrow().getKind() ===
                  SyntaxKind.SemicolonToken)
            ) {
              errorNode = errorNode.replaceWithText('return undefined!;');

              modifiedStatementedNodes.add([
                (errorNode.getParentOrThrow() as unknown) as StatementedNode,
                errorNode.getChildIndex(),
              ]);
            } else if (
              !Node.isNonNullExpression(errorNode.getChildAtIndex(1))
            ) {
              errorNode = errorNode.replaceWithText(
                'return (' + errorNode.getChildAtIndex(1).getText() + ')!;'
              );

              modifiedStatementedNodes.add([
                (errorNode.getParentOrThrow() as unknown) as StatementedNode,
                errorNode.getChildIndex(),
              ]);
            }
          }
          break;
        }

        // When argument and parameter types are not assignable to each other
        case ErrorCodes.ArgumentNotAssignableToParameter: {
          if (diagnostic.getLength() !== errorNode.getText().length) {
            return;
          }

          const childFunc =
            errorNode.getFirstChildByKind(SyntaxKind.FunctionDeclaration) ||
            errorNode.getFirstChildByKind(SyntaxKind.ArrowFunction);

          // If argument is a function, add null and undefined types to parameter declaration
          if (Node.isCallExpression(errorNode) && childFunc) {
            const parameterDeclaration = childFunc.getFirstChildByKindOrThrow(
              SyntaxKind.Parameter
            );

            const declarationType = this.toTypeList(
              parameterDeclaration.getType()
            );

            if (modifiedDeclarationTypes.has(parameterDeclaration)) {
              declarationType.forEach(type => {
                modifiedDeclarationTypes.get(parameterDeclaration)?.add(type);
              });
            } else {
              modifiedDeclarationTypes.set(
                parameterDeclaration,
                new Set(declarationType)
              );
            }

            modifiedDeclarationTypes
              .get(parameterDeclaration)
              ?.add('undefined');
            modifiedDeclarationTypes.get(parameterDeclaration)?.add('null');

            // Otherwise, add definite assignment assertion to the argument being passed
          } else if (!Node.isNonNullExpression(errorNode)) {
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
      }
    });

    // Expand all declarations to include the calculated set of types
    modifiedDeclarationTypes.forEach((types, declaration) => {
      const newDeclaration = declaration.setType(
        Array.from(types)
          .map(type => {
            return type instanceof Type ? type.getText() : type;
          })
          .join(' | ')
      );

      const modifiedStatement = this.getModifiedStatement(newDeclaration);
      modifiedStatementedNodes.add([
        (modifiedStatement.getParentOrThrow() as unknown) as StatementedNode,
        modifiedStatement.getChildIndex(),
      ]);
    });

    // Insert comment before each modified statement
    const comment =
      '// typescript-flag-upgrade automated fix: --strictNullChecks';

    modifiedStatementedNodes.forEach(
      ([modifiedStatementedNode, indexToInsert]) => {
        if (
          !modifiedStatementedNode
            .getStatements()
            [indexToInsert]?.getLeadingCommentRanges()
            .some(commentRange => {
              return commentRange.getText().includes(comment);
            })
        ) {
          modifiedStatementedNode.insertStatements(indexToInsert, comment);
        }
      }
    );
  }

  /**
   * Determines the list of types that a variable, parameter, or property was assigned.
   *
   * @param {Node<ts.Node>} node - Identifier node for variable, parameter, or property.
   * @return {Type[]} List of types assigned to input variable, parameter, or property.
   */
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

  /**
   * Converts a Union type into a list of base types, if applicable.
   *
   * @param {Type} type - Input type.
   * @return {Type[]} List of types represented by input type.
   */
  private toTypeList(type: Type): Type[] {
    return type.isUnion()
      ? type.getUnionTypes().map(individualType => {
          return individualType.getBaseTypeOfLiteralType();
        })
      : [type.getBaseTypeOfLiteralType()];
  }

  /**
   * Traverses through a node's ancestor and returns the closest Statement node.
   *
   * @param {Node<ts.Node>} node - Modified node.
   * @return {Node<ts.Node>} Closest Statement ancestor of modified node.
   */
  private getModifiedStatement(node: Node<ts.Node>): Node<ts.Node> {
    return node.getParentWhileOrThrow((parent, child) => {
      return !(Node.isStatementedNode(parent) && Node.isStatement(child));
    });
  }
}
