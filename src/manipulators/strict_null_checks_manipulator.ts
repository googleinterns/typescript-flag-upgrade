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
import {ErrorDetector} from '@/src/error_detectors/error_detector';
import {
  Diagnostic,
  ts,
  SyntaxKind,
  Node,
  VariableDeclaration,
  ParameterDeclaration,
  PropertyDeclaration,
  PropertySignature,
  SourceFile,
} from 'ts-morph';
import {Logger} from '@/src/loggers/logger';
import chalk from 'chalk';
import {ErrorCodes, STRICT_NULL_CHECKS_COMMENT} from '@/src/types';
import {CollectionsUtil} from '@/src/util/collections_util';
import {ManipulatorUtil} from '@/src/util/manipulator_util';

type AcceptedDeclaration =
  | VariableDeclaration
  | ParameterDeclaration
  | PropertyDeclaration
  | PropertySignature;

/**
 * Manipulator that fixes for the strictNullChecks compiler flag.
 * @extends {Manipulator}
 */
export class StrictNullChecksManipulator extends Manipulator {
  private nodeKinds: Set<SyntaxKind>;

  constructor(errorDetector: ErrorDetector, logger: Logger) {
    super(
      errorDetector,
      logger,
      new Set<number>([
        ErrorCodes.ObjectPossiblyNull,
        ErrorCodes.ObjectPossiblyUndefined,
        ErrorCodes.ObjectPossiblyNullOrUndefined,
        ErrorCodes.TypeANotAssignableToTypeB,
        ErrorCodes.ArgumentNotAssignableToParameter,
        ErrorCodes.NoOverloadMatches,
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
   * Manipulates AST of project to fix for the strictNullChecks compiler flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser
   * @returns {Set<SourceFile>} Set of modified source files.
   */
  fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): Set<SourceFile> {
    // Retrieve AST nodes corresponding to diagnostics with relevant error codes.
    const errorNodes = this.errorDetector.getNodesFromDiagnostics(
      this.errorDetector.filterDiagnosticsByCode(
        diagnostics,
        this.errorCodesToFix
      )
    );

    // Set of modified source files.
    const modifiedSourceFiles = new Set<SourceFile>();

    // Map from declaration to calculated type of declaration.
    const calculatedDeclarationTypes = new Map<
      AcceptedDeclaration,
      Set<string>
    >();

    // Set of modified nodes.
    const modifiedNodes = new Set<Node<ts.Node>>();

    // Iterate through each node in reverse traversal order to prevent interference.
    errorNodes.forEach(({node: errorNode, diagnostic: diagnostic}) => {
      switch (diagnostic.getCode()) {
        // When object is possibly null or undefined.
        case ErrorCodes.ObjectPossiblyNull:
        case ErrorCodes.ObjectPossiblyUndefined:
        case ErrorCodes.ObjectPossiblyNullOrUndefined: {
          this.handlePossiblyNullUndefined(
            errorNode,
            diagnostic,
            modifiedNodes
          );
          break;
        }

        // When two types are not assignable to each other.
        case ErrorCodes.TypeANotAssignableToTypeB: {
          this.handleNonAssignableTypes(
            errorNode,
            diagnostic,
            calculatedDeclarationTypes,
            modifiedNodes
          );
          break;
        }

        // When argument and parameter types are not assignable to each other.
        case ErrorCodes.ArgumentNotAssignableToParameter:
        case ErrorCodes.NoOverloadMatches: {
          this.handleNonAssignableArgumentTypes(
            errorNode,
            diagnostic,
            calculatedDeclarationTypes,
            modifiedNodes
          );
          break;
        }
      }
    });

    // Set declaration types based on calculated declaration types.
    this.setDeclarationTypes(calculatedDeclarationTypes, modifiedNodes);

    // Adding leading comments to all modified nodes.
    this.addLeadingComments(modifiedNodes);
  }

  /**
   * If a variable is possibly undefined or null, add definite assignment assertion.
   * @param {Node<ts.Node>} errorNode - Node of possibly undefined object.
   * @param {Diagnostic} diagnostic - Error diagnostic.
   * @param {Set<Node<ts.Node>} modifiedNodes - Set of modified nodes.
   */
  private handlePossiblyNullUndefined(
    errorNode: Node<ts.Node>,
    diagnostic: Diagnostic,
    modifiedNodes: Set<Node<ts.Node>>
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
      const newNode = errorNode.replaceWithText(`${errorNode.getText()}!`);
      modifiedNodes.add(newNode);
    }
  }

  /**
   * Handle object being assigned a type not assignable to the declared type by expanding declaration type.
   * @param {Node<ts.Node>} errorNode - Node of object with non assignable type.
   * @param {Diagnostic} diagnostic - Error diagnostic.
   * @param {Map<AcceptedDeclaration, Set<string>>} calculatedDeclarationTypes - Map of expanded declaration types.
   * @param {Set<Node<ts.Node>} modifiedNodes - Set of modified nodes.
   */
  private handleNonAssignableTypes(
    errorNode: Node<ts.Node>,
    diagnostic: Diagnostic,
    calculatedDeclarationTypes: Map<AcceptedDeclaration, Set<string>>,
    modifiedNodes: Set<Node<ts.Node>>
  ): void {
    if (!this.nodeKinds.has(errorNode.getKind())) {
      return;
    }

    // If node is an object that is assigned an unassignable type.
    // Eg. let n = 0; n = undefined; -> let n: number | undefined = 0;
    if (
      (Node.isIdentifier(errorNode) ||
        Node.isPropertyAccessExpression(errorNode)) &&
      diagnostic.getLength() === errorNode.getText().length
    ) {
      // Determine the type that was assigned to the variable/parameter/property.
      const typesToAdd = this.determineAssignedType(errorNode);

      // For each declaration, add the union of all declared and assigned types to calculatedDeclarationTypes
      errorNode
        .getSymbol()
        ?.getDeclarations()
        ?.forEach(declaration => {
          CollectionsUtil.addMultipleToMapSet(
            calculatedDeclarationTypes,
            declaration,
            ManipulatorUtil.typeToString(
              declaration.getType(),
              declaration
            ).concat(typesToAdd)
          );
        });

      // If error node is a return statement, add definite assignment assertion to return value.
      // Eg. return n; -> return n!;
    } else if (Node.isReturnStatement(errorNode)) {
      if (
        errorNode.getChildCount() === 1 ||
        (errorNode.getChildCount() === 2 &&
          errorNode.getLastChild()?.getKind() === SyntaxKind.SemicolonToken)
      ) {
        const newNode = errorNode.replaceWithText('return undefined!;');
        modifiedNodes.add(newNode);
      } else if (
        !Node.isNonNullExpression(errorNode.getChildAtIndex(1)) &&
        !errorNode.getChildAtIndex(1).getText().endsWith('!')
      ) {
        const newNode = errorNode.replaceWithText(
          `return (${errorNode.getChildAtIndex(1).getText()})!;`
        );
        modifiedNodes.add(newNode);
      } else {
        this.logger.log(
          chalk.cyan(`${errorNode.getSourceFile().getFilePath()}`) +
            ':' +
            chalk.yellow(`${errorNode.getStartLineNumber()}`) +
            ':' +
            chalk.yellow(`${errorNode.getStartLinePos()}`) +
            ' - ' +
            chalk.red('error') +
            `: Unable to automatically fix --strictNullChecks for '${errorNode.getText()}'.`
        );
      }
    }
  }

  /**
   * Handle argument type not assignable to parameter type.
   * @param {Node<ts.Node>} errorNode - Node of argument with non assignable type.
   * @param {Diagnostic} diagnostic - Error diagnostic.
   * @param {Map<AcceptedDeclaration, Set<string>>} calculatedDeclarationTypes - Map of expanded declaration types.
   * @param {Set<Node<ts.Node>} modifiedNodes - Set of modified nodes.
   */
  private handleNonAssignableArgumentTypes(
    errorNode: Node<ts.Node>,
    diagnostic: Diagnostic,
    calculatedDeclarationTypes: Map<AcceptedDeclaration, Set<string>>,
    modifiedNodes: Set<Node<ts.Node>>
  ): void {
    if (diagnostic.getLength() !== errorNode.getText().length) {
      return;
    }

    // If argument is a function, add null and undefined types to parameter declaration
    // Eg. foo(function bar (n: number) {}); -> foo(function bar (n: number | null | undefined) {});
    const argumentIsFunction =
      errorNode.getFirstChildByKind(SyntaxKind.FunctionDeclaration) ||
      errorNode.getFirstChildByKind(SyntaxKind.ArrowFunction);

    if (Node.isCallExpression(errorNode) && argumentIsFunction) {
      const parameterDeclaration = argumentIsFunction.getFirstChildByKind(
        SyntaxKind.Parameter
      );

      if (parameterDeclaration) {
        CollectionsUtil.addMultipleToMapSet(
          calculatedDeclarationTypes,
          parameterDeclaration,
          ManipulatorUtil.typeToString(
            parameterDeclaration.getType(),
            parameterDeclaration
          ).concat(['null', 'undefined'])
        );
      }
    } else {
      // If argument is being called by an empty array, ignore.
      const callExpressionNode = errorNode.getParentIfKind(
        SyntaxKind.CallExpression
      );

      const callerTypes = ManipulatorUtil.typeToString(
        callExpressionNode
          ?.getFirstChildIfKind(SyntaxKind.PropertyAccessExpression)
          ?.getFirstChild()
          ?.getType(),
        callExpressionNode
      );

      if (callerTypes.includes('never[]')) {
        this.logger.log(
          chalk.cyan(`${errorNode.getSourceFile().getFilePath()}`) +
            ':' +
            chalk.yellow(`${errorNode.getStartLineNumber()}`) +
            ':' +
            chalk.yellow(`${errorNode.getStartLinePos()}`) +
            ' - ' +
            chalk.red('error') +
            ': Unable to support calls on empty array.'
        );
        return;
      }

      // Otherwise, add definite assignment assertion to the argument being passed.
      // Eg. foo(n); -> foo(n!);
      if (
        !Node.isNonNullExpression(errorNode) &&
        !errorNode.getText().endsWith('!')
      ) {
        const newNode = errorNode.replaceWithText(`${errorNode.getText()}!`);
        modifiedNodes.add(newNode);
      } else {
        this.logger.log(
          chalk.cyan(`${errorNode.getSourceFile().getFilePath()}`) +
            ':' +
            chalk.yellow(`${errorNode.getStartLineNumber()}`) +
            ':' +
            chalk.yellow(`${errorNode.getStartLinePos()}`) +
            ' - ' +
            chalk.red('error') +
            `: Unable to automatically fix --strictNullChecks for '${errorNode.getText()}'.`
        );
      }
    }
  }

  /**
   * Determines the list of types that a variable, parameter, or property was assigned.
   * @param {Node<ts.Node>} node - Identifier node for variable, parameter, or property.
   * @return {string[]} List of types assigned to input variable, parameter, or property.
   */
  private determineAssignedType(node: Node<ts.Node>): string[] {
    let assignedTypes: string[] = [];

    const binaryExpressionNode = node.getParentIfKind(
      SyntaxKind.BinaryExpression
    );
    const variableBeingAssigned = binaryExpressionNode?.getLeft();
    const binaryExpressionOperator = binaryExpressionNode?.getOperatorToken();
    const assignedValueExpression = binaryExpressionNode?.getRight();

    if (
      node === variableBeingAssigned &&
      binaryExpressionOperator?.getKind() === SyntaxKind.EqualsToken &&
      assignedValueExpression
    ) {
      assignedTypes = ManipulatorUtil.typeToString(
        assignedValueExpression.getType(),
        assignedValueExpression
      );
    }

    return assignedTypes;
  }

  /**
   * Sets declaration types based on calculated declaration types.
   * @param {Map<AcceptedDeclaration, Set<string>>} calculatedDeclarationTypes - Calculated types for each declaration.
   * @param {Set<Node<ts.Node>} modifiedNodes - Set of modified nodes.
   */
  private setDeclarationTypes(
    calculatedDeclarationTypes: Map<AcceptedDeclaration, Set<string>>,
    modifiedNodes: Set<Node<ts.Node>>
  ): void {
    // Expand all declarations to include the calculated set of types
    for (const [declaration, types] of calculatedDeclarationTypes) {
      const oldTypes = ManipulatorUtil.typeToString(
        declaration.getType(),
        declaration
      )
        .sort()
        .join(' | ');

      if ([...types].some(type => !ManipulatorUtil.isValidType(type))) {
        this.logger.log(
          chalk.cyan(`${declaration.getSourceFile().getFilePath()}`) +
            ':' +
            chalk.yellow(`${declaration.getStartLineNumber()}`) +
            ':' +
            chalk.yellow(`${declaration.getStartLinePos()}`) +
            ' - ' +
            chalk.red('error') +
            `: Unable to automatically calculate type of '${declaration.getText()}'.`
        );
        continue;
      }
      const newTypes = [...types].sort().join(' | ');

      // If declaration type has not changed, skip.
      // Otherwise, expand declaration type.
      if (oldTypes !== newTypes && Node.isTypedNode(declaration)) {
        const newDeclaration = declaration.setType(newTypes);
        modifiedNodes.add(newDeclaration);
      }
    }
  }

  /**
   * Adds leading comments to each modified node.
   * @param {Set<Node<ts.Node>} modifiedNodes - Set of modified nodes.
   */
  private addLeadingComments(modifiedNodes: Set<Node<ts.Node>>): void {
    const modifiedStatements = new Set<Node<ts.Node>>();

    [...modifiedNodes]
      .filter(modifiedNode => !modifiedNode.wasForgotten())
      .forEach(modifiedNode => {
        const modifiedStatement =
          Node.isPropertyDeclaration(modifiedNode) ||
          Node.isPropertySignature(modifiedNode)
            ? modifiedNode
            : ManipulatorUtil.getModifiedStatement(modifiedNode);

        if (modifiedStatement) {
          modifiedStatements.add(modifiedStatement);
        }
      });

    [...modifiedStatements]
      .filter(modifiedStatement =>
        ManipulatorUtil.verifyCommentRange(
          modifiedStatement,
          STRICT_NULL_CHECKS_COMMENT
        )
      )
      .forEach(modifiedStatement => {
        modifiedStatement.replaceWithText(
          `${STRICT_NULL_CHECKS_COMMENT}\n${modifiedStatement
            .getText()
            .trimLeft()}`
        );
      });
  }
}
