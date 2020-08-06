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
import {
  Diagnostic,
  ts,
  SyntaxKind,
  Node,
  VariableDeclaration,
  ParameterDeclaration,
} from 'ts-morph';
import chalk from 'chalk';
import _ from 'lodash';
import {ErrorDetector} from 'src/error_detectors/error_detector';
import {ErrorCodes, NO_IMPLICIT_ANY_COMMENT, NodeDiagnostic} from '@/src/types';

type AcceptedDeclaration = VariableDeclaration | ParameterDeclaration;

/**
 * Manipulator that fixes for the noImplicitAny compiler flag.
 * @extends {Manipulator}
 */
export class NoImplicitAnyManipulator extends Manipulator {
  private nodeKinds: Set<SyntaxKind>;

  constructor(errorDetector: ErrorDetector) {
    super(
      errorDetector,
      new Set<number>([
        ErrorCodes.VariableImplicitlyAny,
        ErrorCodes.ParameterImplicitlyAny,
      ])
    );
    this.nodeKinds = new Set<SyntaxKind>([SyntaxKind.Identifier]);
  }

  /**
   * Manipulates AST of project to fix for the noImplicitAny compiler flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser.
   */
  fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void {
    // Retrieve AST nodes corresponding to diagnostics with relevant error codes.
    // Filters out errors in test files for this manipulator specifically.
    const errorNodes = this.filterOutTestFiles(
      this.errorDetector.filterDiagnosticsByKind(
        this.errorDetector.getNodesFromDiagnostics(
          this.errorDetector.filterDiagnosticsByCode(
            diagnostics,
            this.errorCodesToFix
          )
        ),
        this.nodeKinds
      )
    );

    // Get set of declarations with implicit any type.
    const modifiedDeclarations = this.getDeclarations(errorNodes);

    // Map from declaration to calculated type of declaration.
    const calculatedDeclarationTypes = new Map<
      AcceptedDeclaration,
      Set<string>
    >();

    // Map of declarations to their direct dependencies (other declarations).
    const directDeclarationDependencies = new Map<
      AcceptedDeclaration,
      Set<AcceptedDeclaration>
    >();

    modifiedDeclarations.forEach(declaration => {
      // For parameter declarations, go though each call expression of the parent function.
      if (Node.isParameterDeclaration(declaration)) {
        this.addFunctionCallDeclarationDependencies(
          declaration,
          directDeclarationDependencies,
          calculatedDeclarationTypes,
          modifiedDeclarations
        );
      }

      // For all declarations, find assignment references.
      this.addAssignmentDeclarationDependencies(
        declaration,
        directDeclarationDependencies,
        calculatedDeclarationTypes,
        modifiedDeclarations
      );
    });

    // Topologically sort the dependency graph to determine order to expand declarations.
    const sortedDeclarations = this.topoSort(
      modifiedDeclarations,
      directDeclarationDependencies
    );

    // In topological order, calculate the inferred types of every declaration.
    this.calculateDeclarationTypes(
      calculatedDeclarationTypes,
      sortedDeclarations,
      directDeclarationDependencies
    );

    // Set each declaration's type to the calculated type.
    this.setDeclarationTypes(calculatedDeclarationTypes);
  }

  /**
   * Filters out error nodes in test files (with filenames ending in spec.ts or _test.ts).
   * @param {NodeDiagnostic[]} nodeDiagnostics - List of node diagnostics outputted by parser.
   * @return List of filtered node diagnostics not located in a test file.
   */
  private filterOutTestFiles(
    nodeDiagnostics: NodeDiagnostic[]
  ): NodeDiagnostic[] {
    return nodeDiagnostics.filter(({node: node}) => {
      return !/^.*(_test|\.spec)\.ts$/.test(node.getSourceFile().getFilePath());
    });
  }

  /**
   * Returns the set of declarations with implicit any type given a list of node diagnostics.
   * @param {NodeDiagnostic[]} nodeDiagnostics - List of node diagnostics outputted by parser.
   * @return Set of declarations with implicit any type based on node diagnostics.
   */
  private getDeclarations(
    nodeDiagnostics: NodeDiagnostic[]
  ): Set<AcceptedDeclaration> {
    const declarations = new Set<AcceptedDeclaration>();

    nodeDiagnostics.forEach(({node: node}) => {
      if (Node.isIdentifier(node)) {
        node
          .getSymbol()
          ?.getDeclarations()
          ?.filter(
            declaration =>
              Node.isVariableDeclaration(declaration) ||
              Node.isParameterDeclaration(declaration)
          )
          ?.forEach(declaration => {
            declarations.add(declaration as AcceptedDeclaration);
          });
      }
    });

    return declarations;
  }

  /**
   * Searches through all references of a declaration and adds edges into the dependency graph whereever
   * it is assigned to another declaration value.
   *
   * Eg. foo = bar;
   * Inserts the dependency bar -> foo, because the type of foo is dependent on the type of bar.
   *
   * @param {AcceptedDeclaration} declaration - Declaration to search assignment references for.
   * @param {Map<AcceptedDeclaration, Set<AcceptedDeclaration>>} directDeclarationDependencies - Direct dependency graph between declarations.
   * @param {Map<AcceptedDeclaration, Set<string>>} calculatedDeclarationTypes - Calculated types for each declaration.
   * @param {Set<AcceptedDeclaration>} modifiedDeclarations - Set of modified declarations (vertices).
   */
  private addAssignmentDeclarationDependencies(
    declaration: AcceptedDeclaration,
    directDeclarationDependencies: Map<
      AcceptedDeclaration,
      Set<AcceptedDeclaration>
    >,
    calculatedDeclarationTypes: Map<AcceptedDeclaration, Set<string>>,
    modifiedDeclarations: Set<AcceptedDeclaration>
  ): void {
    // If declaration has an initialized value, add its type to the calculated declaration types.
    const initializedValue = declaration.getInitializer();
    const initializedType = initializedValue
      ? this.toTypeList(initializedValue.getType())
      : undefined;
    if (initializedType) {
      initializedType.forEach(type => {
        this.addMultipleToMapSet(
          calculatedDeclarationTypes,
          declaration,
          this.typeToString(type, declaration)
        );
      });
    }

    // Find for all assignment references for declaration.
    declaration.findReferencesAsNodes()?.forEach(reference => {
      const binaryExpressionNode = reference.getParentIfKind(
        SyntaxKind.BinaryExpression
      );
      const variableBeingAssigned = binaryExpressionNode?.getLeft();
      const binaryExpressionOperator = binaryExpressionNode?.getOperatorToken();
      const assignedValueExpression = binaryExpressionNode?.getRight();

      // Add assigned value's declaration to the dependency graph.
      if (
        reference === variableBeingAssigned &&
        binaryExpressionOperator?.getKind() === SyntaxKind.EqualsToken &&
        assignedValueExpression
      ) {
        this.addDependency(
          directDeclarationDependencies,
          calculatedDeclarationTypes,
          modifiedDeclarations,
          assignedValueExpression,
          declaration
        );
      }
    });
  }

  /**
   * Searches through all references of a parameter declaration and adds edges into the dependency graph
   * whereever its parent function is being called.
   *
   * Eg. function foo(bar) {}; foo(baz);
   * Inserts the dependency baz -> bar, because the type of bar is dependent on the type of baz.
   *
   * @param {AcceptedDeclaration} declaration - Declaration to search assignment references for.
   * @param {Map<AcceptedDeclaration, Set<AcceptedDeclaration>>} directDeclarationDependencies - Direct dependency graph between declarations.
   * @param {Map<AcceptedDeclaration, Set<string>>} calculatedDeclarationTypes - Calculated types for each declaration.
   * @param {Set<AcceptedDeclaration>} modifiedDeclarations - Set of modified declarations (vertices).
   */
  private addFunctionCallDeclarationDependencies(
    declaration: ParameterDeclaration,
    directDeclarationDependencies: Map<
      AcceptedDeclaration,
      Set<AcceptedDeclaration>
    >,
    calculatedDeclarationTypes: Map<AcceptedDeclaration, Set<string>>,
    modifiedDeclarations: Set<AcceptedDeclaration>
  ): void {
    // Get the parent function declaration
    const parentFunctionDeclaration = declaration.getFirstAncestorByKind(
      SyntaxKind.FunctionDeclaration
    );

    // Get index of parameter declaration
    const parameterIndex = parentFunctionDeclaration
      ?.getParameters()
      ?.indexOf(declaration);

    // Search for function call references
    const functionReferences = parentFunctionDeclaration?.findReferencesAsNodes();
    functionReferences?.forEach(functionReference => {
      // In call reference, get arguments in those calls
      const args = functionReference
        .getParentIfKind(SyntaxKind.CallExpression)
        ?.getArguments();

      // Add corresponding argument's declaration to the dependency graph
      if (
        args &&
        parameterIndex !== undefined &&
        args.length > parameterIndex
      ) {
        const correspondingArg = args[parameterIndex];
        this.addDependency(
          directDeclarationDependencies,
          calculatedDeclarationTypes,
          modifiedDeclarations,
          correspondingArg,
          declaration
        );
      }
    });
  }

  /**
   * Adds a new dependency (edge) between two declarations from predecessor -> successor, meaning that the type of successor
   * is dependent on the type of predecessor.
   *
   * Right now, dependencies are established through assignment and function calls:
   *
   * Eg. foo = bar;
   * Inserts the dependency bar -> foo, because the type of foo is dependent on the type of bar.
   *
   * Eg. function foo(bar) {}; foo(baz);
   * Inserts the dependency baz -> bar, because the type of bar is dependent on the type of baz.
   *
   * @param {Map<AcceptedDeclaration, Set<AcceptedDeclaration>>} directDeclarationDependencies - Direct dependency graph between declarations.
   * @param {Map<AcceptedDeclaration, Set<string>>} calculatedDeclarationTypes - Calculated types for each declaration.
   * @param {Set<AcceptedDeclaration>} modifiedDeclarations - Set of modified declarations (vertices).
   * @param {Node<ts.Node>} predecessorNode - Node that successor is dependent on.
   * @param {AcceptedDeclaration} successorDeclaration - Declaration that is dependent on successor.
   */
  private addDependency(
    directDeclarationDependencies: Map<
      AcceptedDeclaration,
      Set<AcceptedDeclaration>
    >,
    calculatedDeclarationTypes: Map<AcceptedDeclaration, Set<string>>,
    modifiedDeclarations: Set<AcceptedDeclaration>,
    predecessorNode: Node<ts.Node>,
    successorDeclaration: AcceptedDeclaration
  ): void {
    const predecessorDeclarations = predecessorNode
      .getSymbol()
      ?.getDeclarations();

    // If the predecessor's declaration is one of the declarations that is also implicitly any, add
    // in an edge from predecessor -> successor in the dependency graph.
    if (
      predecessorDeclarations?.some(
        predecessorDeclaration =>
          (Node.isVariableDeclaration(predecessorDeclaration) ||
            Node.isParameterDeclaration(predecessorDeclaration)) &&
          modifiedDeclarations.has(predecessorDeclaration)
      )
    ) {
      predecessorDeclarations?.forEach(predecessorDeclaration => {
        this.addToMapSet(
          directDeclarationDependencies,
          predecessorDeclaration,
          successorDeclaration
        );
      });
    } else {
      // Otherwise, get predecessor's type and add it to the calculated declaration type of the successor.
      const calculatedType = this.toTypeList(predecessorNode.getType());
      calculatedType.forEach(type => {
        this.addMultipleToMapSet(
          calculatedDeclarationTypes,
          successorDeclaration,
          this.typeToString(type, predecessorNode)
        );
      });
    }
  }

  /**
   * Sets declaration types based on calculated declaration types.
   * @param {Map<AcceptedDeclaration, Set<string>>} calculatedDeclarationTypes - Calculated types for each declaration.
   */
  private setDeclarationTypes(
    calculatedDeclarationTypes: Map<AcceptedDeclaration, Set<string>>
  ): void {
    for (const [declaration, types] of calculatedDeclarationTypes) {
      // Set declaration type.
      const newDeclaration = declaration.setType([...types].sort().join(' | '));

      // Fix missing imports if applicable.
      newDeclaration.getSourceFile().fixMissingImports();

      // Add comment before edited declaration.
      const modifiedStatement = this.getModifiedStatement(newDeclaration);
      if (
        modifiedStatement &&
        this.verifyCommentRange(modifiedStatement, NO_IMPLICIT_ANY_COMMENT)
      ) {
        modifiedStatement.replaceWithText(
          `${NO_IMPLICIT_ANY_COMMENT}\n${modifiedStatement
            .getText()
            .trimLeft()}`
        );
      }
    }
  }

  /**
   * Calculates final inferred declaration types in topological order based on declaration dependencies.
   * @param {Map<AcceptedDeclaration, Set<string>>} calculatedDeclarationTypes - Calculated types for each declaration.
   * @param {AcceptedDeclaration[]} sortedDeclarations - Topologically sorted list of declarations.
   * @param {Map<AcceptedDeclaration, Set<AcceptedDeclaration>>} directDeclarationDependencies - Direct dependency graph between declarations.
   */
  private calculateDeclarationTypes(
    calculatedDeclarationTypes: Map<AcceptedDeclaration, Set<string>>,
    sortedDeclarations: AcceptedDeclaration[],
    directDeclarationDependencies: Map<
      AcceptedDeclaration,
      Set<AcceptedDeclaration>
    >
  ) {
    // Calculate all descendant dependencies (direct and indirect) for every declaration.
    const descendantDeclarationDependencies = this.calculateDescendantDependencies(
      new Set(sortedDeclarations),
      directDeclarationDependencies
    );

    // Set of declarations to skip because their types are completely dependent on
    // predecessor types and all their predecessors had type any.
    const skipDeclarations = new Set<AcceptedDeclaration>();

    sortedDeclarations.forEach(declaration => {
      // If declaration is skipped, also skip its descendants.
      if (skipDeclarations.has(declaration)) {
        descendantDeclarationDependencies
          .get(declaration)
          ?.forEach(descendant => skipDeclarations.add(descendant));
        return;
      }

      // If declaration has type any, log to user and skip descendants.
      if (
        !calculatedDeclarationTypes.has(declaration) ||
        ![...calculatedDeclarationTypes.get(declaration)!].every(type =>
          this.isValidType(type)
        )
      ) {
        // TODO: Move console log functionality to a logger class.
        console.log(
          chalk.cyan(`${declaration.getSourceFile().getFilePath()}`) +
            ':' +
            chalk.yellow(`${declaration.getStartLineNumber()}`) +
            ':' +
            chalk.yellow(`${declaration.getStartLinePos()}`) +
            ' - ' +
            chalk.red('error') +
            `: Unable to automatically calculate type of '${declaration.getText()}'. This declaration also affects ${
              descendantDeclarationDependencies.get(declaration)?.size || 0
            } other declarations.`
        );

        // Remove declaration and descendants from calculatedDeclarationTypes.
        calculatedDeclarationTypes.delete(declaration);
        descendantDeclarationDependencies
          .get(declaration)
          ?.forEach(descendant => {
            if (!calculatedDeclarationTypes.has(descendant)) {
              skipDeclarations.add(descendant);
            }
            calculatedDeclarationTypes.delete(descendant);
          });

        return;
      }

      // If declaration has determined type, also give descendants the calculated type.
      descendantDeclarationDependencies
        .get(declaration)
        ?.forEach(descendant => {
          calculatedDeclarationTypes
            .get(declaration)!
            .forEach(calculatedType => {
              this.addToMapSet(
                calculatedDeclarationTypes,
                descendant,
                calculatedType
              );
            });
        });
    });
  }

  /**
   * Given a directed graph, constructs a map of vertex to set of descendant vertices with a path from the vertex.
   * @param {Set<T>} vertices - Set of vertices.
   * @param {Map<T, Set<T>>} edges - Map of directed edges between vertices.
   * @return {Map<T, Set<T>>} Map of vertex to set of descendant vertices with a path from the vertex.
   */
  private calculateDescendantDependencies<T>(
    vertices: Set<T>,
    edges: Map<T, Set<T>>
  ): Map<T, Set<T>> {
    const descendantDependencies = new Map<T, Set<T>>();

    vertices.forEach(vertex => {
      const visitedVertices = new Set<T>();
      const vertexDescendants: T[] = [];

      this.postOrderRecurse(vertex, visitedVertices, vertexDescendants, edges);
      vertexDescendants.pop();

      descendantDependencies.set(vertex, new Set(vertexDescendants));
    });

    return descendantDependencies;
  }

  /**
   * Topologically sorts a directed graph. If cyclic, returns vertices in an order that minimizes dependency violations.
   * @param {Set<T>} vertices - Set of vertices.
   * @param {Map<T, Set<T>>} edges - Map of directed edges between vertices.
   * @return {T[]} Topologically sorted list of vertices.
   */
  topoSort<T>(vertices: Set<T>, edges: Map<T, Set<T>>): T[] {
    const postOrder: T[] = [];
    const visitedVertices = new Set<T>();
    vertices.forEach(vertex => {
      if (!visitedVertices.has(vertex)) {
        this.postOrderRecurse(vertex, visitedVertices, postOrder, edges);
      }
    });
    return postOrder.reverse();
  }

  /**
   * Recursively constructs the postorder depth-first traversal.
   * @param {T} vertex - Current vertex.
   * @param {Set<T>} visitedVertices - Set of visited vertices.
   * @param {Map<T, Set<T>>} edges - Map of directed edges between vertices.
   * @param {T[]} postOrder - Postorder depth-first traversal so far.
   */
  private postOrderRecurse<T>(
    vertex: T,
    visitedVertices: Set<T>,
    postOrder: T[],
    edges: Map<T, Set<T>>
  ): void {
    visitedVertices.add(vertex);
    edges.get(vertex)?.forEach(successor => {
      if (!visitedVertices.has(successor)) {
        this.postOrderRecurse(successor, visitedVertices, postOrder, edges);
      }
    });
    postOrder.push(vertex);
  }
}
