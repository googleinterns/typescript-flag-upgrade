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
import {Manipulator} from './manipulator';
import {ErrorDetector} from 'src/error_detectors/error_detector';
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
  SourceFile,
  Statement,
  PropertySignature,
} from 'ts-morph';
import {ErrorCodes, DeclarationType} from 'src/types';

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
      SyntaxKind.ElementAccessExpression,
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
    const modifiedDeclarationTypes: DeclarationType = new Map<
      | VariableDeclaration
      | ParameterDeclaration
      | PropertyDeclaration
      | PropertySignature,
      Set<string>
    >();

    // Keep track of modified statements to insert comments
    const modifiedStatementedNodes = new Set<[StatementedNode, number]>();

    // Keep track of which source files have with type never[] arrays have been fixed
    const fixedNeverTypeSourceFiles = new Set<SourceFile>();

    // Iterate through each node in reverse traversal order to prevent interference
    errorNodes.forEach(({node: errorNode, diagnostic: diagnostic}) => {
      this.fixNeverType(
        errorNode.getSourceFile(),
        fixedNeverTypeSourceFiles,
        modifiedDeclarationTypes
      );

      switch (diagnostic.getCode()) {
        // When object is possibly null or undefined
        case ErrorCodes.ObjectPossiblyNull:
        case ErrorCodes.ObjectPossiblyUndefined:
        case ErrorCodes.ObjectPossiblyNullOrUndefined: {
          this.handlePossiblyNullUndefined(
            errorNode,
            diagnostic,
            modifiedStatementedNodes
          );
          break;
        }

        // When two types are not assignable to each other
        case ErrorCodes.TypeANotAssignableToTypeB: {
          this.handleNonAssignableTypes(
            errorNode,
            diagnostic,
            modifiedDeclarationTypes,
            modifiedStatementedNodes
          );
          break;
        }

        // When argument and parameter types are not assignable to each other
        case ErrorCodes.ArgumentNotAssignableToParameter: {
          this.handleNonAssignableArgumentTypes(
            errorNode,
            diagnostic,
            modifiedDeclarationTypes,
            modifiedStatementedNodes
          );
          break;
        }
      }
    });

    // Expand all declarations to include the calculated set of types
    modifiedDeclarationTypes.forEach((types, declaration) => {
      const oldTypes = this.toTypeList(declaration.getType())
        .map(type => type.getText(declaration))
        .sort();

      let newTypes = Array.from(types);
      newTypes = newTypes
        .filter(type => {
          if (
            // Eg. never[] | string[] -> string[]
            type === 'never[]' &&
            newTypes.some(otherType => {
              return otherType.endsWith('[]');
            })
          ) {
            return false;
          } else if (
            // Eg. any | string -> any
            type !== 'any' &&
            newTypes.some(otherType => {
              return otherType === 'any';
            })
          ) {
            return false;
          } else if (
            // Eg. any[] | string[] -> any[]
            type.endsWith('[]') &&
            type !== 'any[]' &&
            newTypes.some(otherType => {
              return otherType === 'any[]';
            })
          ) {
            return false;
          }

          return true;
        })
        .map(type => {
          return type.replace(new RegExp('never', 'g'), 'any');
        })
        .sort();

      // If declaration type has not changed, skip
      // Otherwise, expand declaration type
      if (!_.isEqual(oldTypes, newTypes)) {
        const newDeclaration = declaration.setType(newTypes.join(' | '));

        const modifiedStatement = this.getModifiedStatement(newDeclaration);
        if (modifiedStatement) {
          this.addModifiedStatement(
            modifiedStatementedNodes,
            modifiedStatement
          );
        }
      }
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
   * Fix empty array declaration types to any[] instead of never[].
   * @param {SourceFile} sourceFile - Source file to fix.
   * @param {Set<SourceFile>} fixedSourceFiles - Set of source files that have already been fixed.
   * @param {DeclarationType} modifiedDeclarationTypes - Map of expanded declaration types.
   */
  private fixNeverType(
    sourceFile: SourceFile,
    fixedSourceFiles: Set<SourceFile>,
    modifiedDeclarationTypes: DeclarationType
  ): void {
    // Eg. let foo = []; -> let foo: any[] = [];
    if (!fixedSourceFiles.has(sourceFile)) {
      this.getNeverTypeArrayDeclarations(sourceFile).forEach(declaration => {
        this.addModifiedDeclarationTypes(
          modifiedDeclarationTypes,
          declaration,
          ['any[]']
        );
      });

      fixedSourceFiles.add(sourceFile);
    }
  }

  /**
   * If a variable is possibly undefined or null, add definite assignment assertion.
   * @param {Node<ts.Node>} errorNode - Node of possibly undefined object.
   * @param {Diagnostic} diagnostic - Error diagnostic.
   * @param {Set<[StatementedNode, number]>} modifiedStatementedNodes - Set of modified statements.
   */
  private handlePossiblyNullUndefined(
    errorNode: Node<ts.Node>,
    diagnostic: Diagnostic,
    modifiedStatementedNodes: Set<[StatementedNode, number]>
  ): void {
    if (!this.nodeKinds.has(errorNode.getKind())) {
      return;
    }

    if (
      (Node.isIdentifier(errorNode) ||
        Node.isPropertyAccessExpression(errorNode) ||
        Node.isElementAccessExpression(errorNode) ||
        Node.isCallExpression(errorNode)) &&
      diagnostic.getLength() === errorNode.getText().length
    ) {
      // Eg. foo.toString(); -> foo!.toString()
      const newNode = errorNode.replaceWithText(errorNode.getText() + '!');

      const modifiedStatement = this.getModifiedStatement(newNode);

      this.addModifiedStatement(
        modifiedStatementedNodes,
        modifiedStatement as Statement
      );
    }
  }

  /**
   * Handle object being assigned a type not assignable to the declared type by expanding declaration type.
   * @param {Node<ts.Node>} errorNode - Node of object with non assignable type.
   * @param {Diagnostic} diagnostic - Error diagnostic.
   * @param {DeclarationType} modifiedDeclarationTypes - Map of expanded declaration types.
   * @param {Set<[StatementedNode, number]>} modifiedStatementedNodes - Set of modified statements.
   */
  private handleNonAssignableTypes(
    errorNode: Node<ts.Node>,
    diagnostic: Diagnostic,
    modifiedDeclarationTypes: DeclarationType,
    modifiedStatementedNodes: Set<[StatementedNode, number]>
  ): void {
    if (!this.nodeKinds.has(errorNode.getKind())) {
      return;
    }

    // If node is an object that is assigned an unassiable type
    // Eg. let n = 0; n = undefined; -> let n: number | undefined = 0;
    if (
      (Node.isIdentifier(errorNode) ||
        Node.isPropertyAccessExpression(errorNode)) &&
      diagnostic.getLength() === errorNode.getText().length
    ) {
      const errorSymbol = errorNode.getSymbol();
      const declarations = errorSymbol?.getDeclarations();

      // Determine the type that was assigned to the variable/parameter/property
      const typesToAdd = this.determineAssignedType(errorNode);

      // For each declaration, add the union of all declared and assigned types to modifiedDeclarationTypes
      declarations?.forEach(declaration => {
        this.addModifiedDeclarationTypes(
          modifiedDeclarationTypes,
          declaration,
          typesToAdd.map(type => {
            return type.getText(declaration);
          })
        );
      });
      // If error node is a return statement, add definite assignment assertion to return value
      // Eg. return n; -> return n!;
    } else if (Node.isReturnStatement(errorNode)) {
      if (
        errorNode.getChildCount() === 1 ||
        (errorNode.getChildCount() === 2 &&
          errorNode.getLastChild()?.getKind() === SyntaxKind.SemicolonToken)
      ) {
        errorNode = errorNode.replaceWithText('return undefined!;');

        this.addModifiedStatement(
          modifiedStatementedNodes,
          errorNode as Statement
        );
      } else if (!Node.isNonNullExpression(errorNode.getChildAtIndex(1))) {
        errorNode = errorNode.replaceWithText(
          `return (${errorNode.getChildAtIndex(1).getText()})!`
        );

        this.addModifiedStatement(
          modifiedStatementedNodes,
          errorNode as Statement
        );
      }
    }
  }

  /**
   * Handle argument type not assignable to parameter type.
   * @param {Node<ts.Node>} errorNode - Node of argument with non assignable type.
   * @param {Diagnostic} diagnostic - Error diagnostic.
   * @param {DeclarationType} modifiedDeclarationTypes - Map of expanded declaration types.
   * @param {Set<[StatementedNode, number]>} modifiedStatementedNodes - Set of modified statements.
   */
  private handleNonAssignableArgumentTypes(
    errorNode: Node<ts.Node>,
    diagnostic: Diagnostic,
    modifiedDeclarationTypes: DeclarationType,
    modifiedStatementedNodes: Set<[StatementedNode, number]>
  ): void {
    if (diagnostic.getLength() !== errorNode.getText().length) {
      return;
    }

    const childIsFunc =
      errorNode.getFirstChildByKind(SyntaxKind.FunctionDeclaration) ||
      errorNode.getFirstChildByKind(SyntaxKind.ArrowFunction);

    // If argument is a function, add null and undefined types to parameter declaration
    // Eg. foo(function bar (n: number) {}); -> foo(function bar (n: number | null | undefined) {});
    if (Node.isCallExpression(errorNode) && childIsFunc) {
      const parameterDeclaration = childIsFunc.getFirstChildByKind(
        SyntaxKind.Parameter
      );

      if (parameterDeclaration) {
        const declarationType = this.toTypeList(parameterDeclaration.getType());

        declarationType.forEach(type => {
          this.addToMapSet(
            modifiedDeclarationTypes,
            parameterDeclaration,
            type.getText(parameterDeclaration)
          );
        });

        this.addToMapSet(
          modifiedDeclarationTypes,
          parameterDeclaration,
          'undefined'
        );

        this.addToMapSet(
          modifiedDeclarationTypes,
          parameterDeclaration,
          'null'
        );
      }

      // Otherwise, add definite assignment assertion to the argument being passed
      // Eg. foo(n); -> foo(n!);
    } else if (!Node.isNonNullExpression(errorNode)) {
      const newNode = errorNode.replaceWithText(errorNode.getText() + '!');

      const modifiedStatement = this.getModifiedStatement(newNode);
      if (modifiedStatement) {
        this.addModifiedStatement(modifiedStatementedNodes, modifiedStatement);
      }
    }
  }

  /**
   * Determines the list of types that a variable, parameter, or property was assigned.
   * @param {Node<ts.Node>} node - Identifier node for variable, parameter, or property.
   * @return {Type[]} List of types assigned to input variable, parameter, or property.
   */
  private determineAssignedType(node: Node<ts.Node>): Type[] {
    let assignedTypes: Type[] = [];

    const parent = node.getParentIfKind(SyntaxKind.BinaryExpression);
    const sibling = node.getNextSiblingIfKind(SyntaxKind.EqualsToken);
    const nextSibling = sibling?.getNextSibling();

    if (sibling && parent && nextSibling) {
      assignedTypes = this.toTypeList(nextSibling.getType());
    }

    return assignedTypes;
  }

  /**
   * Converts a Union type into a list of base types, if applicable.
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
   * @param {Node<ts.Node>} node - Modified node.
   * @return {Statement|undefined} Closest Statement ancestor of modified node or undefined if doesn't exist.
   */
  private getModifiedStatement(node: Node<ts.Node>): Statement | undefined {
    return node.getParentWhile((parent, child) => {
      return !(Node.isStatementedNode(parent) && Node.isStatement(child));
    }) as Statement;
  }

  /**
   * Returns list of array declarations with type never[].
   * @param {SourceFile} sourceFile - Source file to search through.
   * @return {Set<Node<ts.Node>>} Set of array declarations with type never[].
   */
  private getNeverTypeArrayDeclarations(
    sourceFile: SourceFile
  ): Set<Node<ts.Node>> {
    const neverTypeArrayDeclarations = new Set<Node<ts.Node>>();

    sourceFile.forEachDescendant(descendant => {
      if (
        (Node.isIdentifier(descendant) ||
          Node.isPropertyAccessExpression(descendant)) &&
        descendant.getType().getText(descendant) === 'never[]'
      ) {
        descendant
          .getSymbol()
          ?.getDeclarations()
          .forEach(declaration => neverTypeArrayDeclarations.add(declaration));
      }
    });

    return neverTypeArrayDeclarations;
  }

  /**
   * Adds a list of types to a map of expanded declaration types.
   * @param {DeclarationType} modifiedDeclarationTypes - Map of expanded declaration types.
   * @param {Node<ts.Node>} declaration - Declaration node to add type to.
   * @param {string[]} typesToAdd - List of types to add to declaration.
   */
  private addModifiedDeclarationTypes(
    modifiedDeclarationTypes: DeclarationType,
    declaration: Node<ts.Node>,
    typesToAdd: string[]
  ): void {
    if (
      Node.isVariableDeclaration(declaration) ||
      Node.isParameterDeclaration(declaration) ||
      Node.isPropertyDeclaration(declaration) ||
      Node.isPropertySignature(declaration)
    ) {
      const declarationType = this.toTypeList(declaration.getType());

      declarationType.forEach(type => {
        this.addToMapSet(
          modifiedDeclarationTypes,
          declaration,
          type.getText(declaration)
        );
      });

      typesToAdd.forEach(type => {
        this.addToMapSet(modifiedDeclarationTypes, declaration, type);
      });
    }
  }

  /**
   * Adds to the list of modified statements to insert comments before.
   * @param {Set<[StatementedNode, number]>} statementedNotes - Set of (statemented node, index to insert at) pairs.
   * @param {Statement} statement - Modified statement.
   */
  private addModifiedStatement(
    statementedNotes: Set<[StatementedNode, number]>,
    statement: Statement
  ): void {
    const parent = statement.getParent();

    if (parent && Node.isStatementedNode(parent)) {
      statementedNotes.add([parent, statement.getChildIndex()]);
    }
  }

  /**
   * Adds value to a Map with Set value types.
   * @param {Map<K, Set<V>>} map - Map to add to.
   * @param {K} key - Key to insert value at.
   * @param {V} val - Value to insert.
   */
  private addToMapSet<K, V>(map: Map<K, Set<V>>, key: K, val: V): void {
    if (map.has(key)) {
      map.get(key)?.add(val);
    } else {
      map.set(
        key,
        new Set<V>([val])
      );
    }
  }
}
