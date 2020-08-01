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
  Type,
  VariableDeclaration,
  ParameterDeclaration,
} from 'ts-morph';
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
    const errorNodes = this.errorDetector.filterDiagnosticsByKind(
      this.errorDetector.getNodesFromDiagnostics(
        this.errorDetector.filterDiagnosticsByCode(
          diagnostics,
          this.errorCodesToFix
        )
      ),
      this.nodeKinds
    );

    // Get set of declarations with implicit any type.
    const modifiedDeclarations = this.getDeclarations(errorNodes);

    // Map from declaration to calculated type of declaration.
    const determinedTypes = new Map<AcceptedDeclaration, Set<Type>>();

    // Graph of dependencies between declarations.
    const dependencyGraph = new Map<
      AcceptedDeclaration,
      Set<AcceptedDeclaration>
    >();

    modifiedDeclarations.forEach(declaration => {
      // For parameter declarations, go though each call expression of the parent function.
      if (Node.isParameterDeclaration(declaration)) {
        this.addFunctionCallDeclarationDependencies(
          declaration,
          dependencyGraph,
          determinedTypes,
          modifiedDeclarations
        );
      }

      // For all declarations, find assignment references.
      this.addAssignmentDeclarationDependencies(
        declaration,
        dependencyGraph,
        determinedTypes,
        modifiedDeclarations
      );
    });

    // Topologically sort the dependency graph to determine order to expand declarations.
    const sortedDeclarations = this.topoSort(
      modifiedDeclarations,
      dependencyGraph
    );

    // Set of declarations to skip because its predecessor had type any.
    const skipDeclarations = new Set<AcceptedDeclaration>();

    sortedDeclarations.forEach(declaration => {
      // If declaration is skipped, also skip its successors.
      if (skipDeclarations.has(declaration)) {
        dependencyGraph
          .get(declaration)
          ?.forEach(successor => skipDeclarations.add(successor));
        return;
      }

      // If declaration has type any, output to user and skip successors.
      if (!determinedTypes.has(declaration)) {
        console.log(
          `${declaration
            .getSourceFile()
            .getFilePath()}:${declaration.getStartLineNumber()}:${declaration.getStartLinePos()}:${declaration.getText()} - Unable to automatically determined type.`
        );
        dependencyGraph
          .get(declaration)
          ?.forEach(successor => skipDeclarations.add(successor));
        return;
      }

      // If declaration has determined type, also give successors the determined type.
      dependencyGraph.get(declaration)?.forEach(successor => {
        determinedTypes.get(declaration)!.forEach(determinedType => {
          this.addToMapSet(determinedTypes, successor, determinedType);
        });
      });

      // Set declaration type.
      const newDeclaration = declaration.setType(
        Array.from(determinedTypes.get(declaration)!)
          .map(type => type.getText(declaration))
          .sort()
          .join(' | ')
      );

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
    });

    // If there is a cycle in dependency graph, output to user.
    if (sortedDeclarations.length !== modifiedDeclarations.size) {
      const sortedDeclarationsSet = new Set(sortedDeclarations);
      console.log(
        'The following declarations are cyclically dependent on each other: '
      );
      modifiedDeclarations.forEach(declaration => {
        if (!sortedDeclarationsSet.has(declaration)) {
          console.log(
            `${declaration
              .getSourceFile()
              .getFilePath()}:${declaration.getStartLineNumber()}:${declaration.getStartLinePos()}:${declaration.getText()} - Cyclically dependent declaration.`
          );
        }
      });
    }
  }

  /**
   *
   * @param {NodeDiagnostic[]} diagnostics - List of diagnostics outputted by parser.
   */
  private getDeclarations(nodeDiagnostics: NodeDiagnostic[]) {
    const declarations = new Set<AcceptedDeclaration>();

    nodeDiagnostics.forEach(({node: node}) => {
      if (Node.isIdentifier(node)) {
        node
          .getSymbol()
          ?.getDeclarations()
          ?.forEach(declaration => {
            if (
              Node.isVariableDeclaration(declaration) ||
              Node.isParameterDeclaration(declaration)
            ) {
              declarations.add(declaration);
            }
          });
      }
    });

    return declarations;
  }

  private addAssignmentDeclarationDependencies(
    declaration: AcceptedDeclaration,
    dependencyGraph: Map<AcceptedDeclaration, Set<AcceptedDeclaration>>,
    determinedTypes: Map<AcceptedDeclaration, Set<Type>>,
    modifiedDeclarations: Set<AcceptedDeclaration>
  ) {
    const references = declaration.findReferencesAsNodes();
    references?.forEach(reference => {
      const parent = reference.getParentIfKind(SyntaxKind.BinaryExpression);
      const sibling = reference.getNextSiblingIfKind(SyntaxKind.EqualsToken);
      const nextSibling = sibling?.getNextSibling();

      // Add assigned value's declaration to the dependency graph
      if (parent && nextSibling) {
        this.addDependency(
          dependencyGraph,
          determinedTypes,
          modifiedDeclarations,
          nextSibling,
          declaration
        );
      }
    });
  }

  private addFunctionCallDeclarationDependencies(
    declaration: ParameterDeclaration,
    dependencyGraph: Map<AcceptedDeclaration, Set<AcceptedDeclaration>>,
    determinedTypes: Map<AcceptedDeclaration, Set<Type>>,
    modifiedDeclarations: Set<AcceptedDeclaration>
  ) {
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
          dependencyGraph,
          determinedTypes,
          modifiedDeclarations,
          correspondingArg,
          declaration
        );
      }
    });
  }

  /**
   * Adds a new dependency (edge) between two declarations.
   * @param {Map<AcceptedDeclaration, Set<AcceptedDeclaration>>} dependencyGraph - Dependency graph.
   * @param {Map<AcceptedDeclaration, Set<Type>>} determinedTypes - Calculated types for each declaration.
   * @param {Set<AcceptedDeclaration>} modifiedDeclarations - Set of modified declarations (vertices).
   * @param {Node<ts.Node>} predecessor - Declaration that successor is dependent on.
   * @param {AcceptedDeclaration} successor - Declaration that is dependent on successor.
   */
  private addDependency(
    dependencyGraph: Map<AcceptedDeclaration, Set<AcceptedDeclaration>>,
    determinedTypes: Map<AcceptedDeclaration, Set<Type>>,
    modifiedDeclarations: Set<AcceptedDeclaration>,
    predecessor: Node<ts.Node>,
    successor: AcceptedDeclaration
  ): void {
    // Get predecessor's type.
    const determinedType = this.toTypeList(predecessor.getType());

    // If predecessor is type any, add predecessor's declaration to the dependency graph and modified declarations set
    // and add the dependency into the graph.
    if (determinedType.some(type => type.isAny())) {
      if (Node.isIdentifier(predecessor)) {
        predecessor
          .getSymbol()
          ?.getDeclarations()
          ?.forEach(assignedDeclaration => {
            if (
              Node.isVariableDeclaration(assignedDeclaration) ||
              Node.isParameterDeclaration(assignedDeclaration)
            ) {
              modifiedDeclarations.add(assignedDeclaration);
              this.addToMapSet(dependencyGraph, assignedDeclaration, successor);
            }
          });
      }
    } else {
      // Otherwise, only add predecessor's type to successor's determined types.
      determinedType.forEach(type => {
        this.addToMapSet(determinedTypes, successor, type);
      });
    }
  }

  /**
   * Topologically sorts a directed graph. If cyclic, returns subset of vertices not a part of a cycle.
   * @param {Set<T>} vertices - Set of vertices.
   * @param {Map<T, Set<T>>} edges - Map of directed edges between vertices.
   * @return {T[]} Topologically sorted list of vertices.
   */
  topoSort<T>(vertices: Set<T>, edges: Map<T, Set<T>>): T[] {
    const sorted: T[] = [];
    const numDependencies = new Map<T, number>();

    // Construct a map of in-degrees for each vertex.
    for (const vertex of vertices) {
      numDependencies.set(vertex, 0);
    }

    for (const successors of edges.values()) {
      successors.forEach(successor => {
        numDependencies.set(
          successor,
          (numDependencies.get(successor) || 0) + 1
        );
      });
    }

    // Add all vertices with in-degree to queue.
    const queue: T[] = [];
    for (const vertex of numDependencies.keys()) {
      if (numDependencies.get(vertex) === 0) {
        queue.push(vertex);
      }
    }

    // While queue is not empty, "visit" each vertex in queue and decrement its successors in-degree by 1
    // Add successors to queue if their in-degree become 0.
    while (queue.length > 0) {
      const currVertex = queue.shift()!;
      sorted.push(currVertex);

      edges.get(currVertex)?.forEach(successor => {
        numDependencies.set(successor, numDependencies.get(successor)! - 1);
        if (numDependencies.get(successor) === 0) {
          queue.push(successor);
        }
      });
    }

    return sorted;
  }
}
