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
import {ErrorCodes} from '../types';

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

    const modifiedDeclarations = new Set<AcceptedDeclaration>();

    // Iterate through each node, adding declarations to a set.
    errorNodes.forEach(({node: errorNode}) => {
      if (Node.isIdentifier(errorNode)) {
        const errorSymbol = errorNode.getSymbol();
        const declarations = errorSymbol?.getDeclarations();
        declarations?.forEach(declaration => {
          if (
            Node.isVariableDeclaration(declaration) ||
            Node.isParameterDeclaration(declaration)
          ) {
            modifiedDeclarations.add(declaration);
          }
        });
      }
    });

    const determinedTypes = new Map<AcceptedDeclaration, Set<Type>>();
    const dependencyGraph = new Map<
      AcceptedDeclaration,
      Set<AcceptedDeclaration>
    >();

    modifiedDeclarations.forEach(declaration => {
      if (Node.isParameterDeclaration(declaration)) {
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
            this.addToDependencyGraph(
              dependencyGraph,
              determinedTypes,
              modifiedDeclarations,
              correspondingArg,
              declaration
            );
          }
        });
      }

      const references = declaration.findReferencesAsNodes();
      references?.forEach(reference => {
        const parent = reference.getParentIfKind(SyntaxKind.BinaryExpression);
        const sibling = reference.getNextSiblingIfKind(SyntaxKind.EqualsToken);
        const nextSibling = sibling?.getNextSibling();

        if (parent && nextSibling) {
          this.addToDependencyGraph(
            dependencyGraph,
            determinedTypes,
            modifiedDeclarations,
            nextSibling,
            declaration
          );
        }
      });
    });

    const sortedDeclarations = this.topoSort(
      modifiedDeclarations,
      dependencyGraph
    );

    const skipDeclarations = new Set<AcceptedDeclaration>();

    sortedDeclarations?.forEach(declaration => {
      if (skipDeclarations.has(declaration)) {
        return;
      }

      if (!determinedTypes.has(declaration)) {
        console.log(`Couldn't determine type of ${declaration.getText()}`);
        dependencyGraph
          .get(declaration)
          ?.forEach(successor => skipDeclarations.add(successor));
        return;
      }

      dependencyGraph.get(declaration)?.forEach(successor => {
        determinedTypes.get(declaration)!.forEach(determinedType => {
          this.addToMapSet(determinedTypes, successor, determinedType);
        });
      });

      declaration.setType(
        Array.from(determinedTypes.get(declaration)!)
          .map(type => type.getText(declaration))
          .sort()
          .join(' | ')
      );
    });

    // // Print dependency graph
    // for (const [key, val] of dependencyGraph) {
    //   console.log(key.getText());
    //   val.forEach(v => console.log(v.getText()));
    //   console.log();
    // }

    // console.log('---');

    // for (const [key, val] of determinedTypes) {
    //   console.log(key.getText());
    //   val.forEach(v => console.log(v.getText()));
    //   console.log();
    // }

    // console.log('---');

    // for (const key of modifiedDeclarations) {
    //   console.log(key.getText());
    // }
  }

  private addToDependencyGraph(
    dependencyGraph: Map<AcceptedDeclaration, Set<AcceptedDeclaration>>,
    determinedTypes: Map<AcceptedDeclaration, Set<Type>>,
    modifiedDeclarations: Set<AcceptedDeclaration>,
    predecessor: Node<ts.Node>,
    successor: AcceptedDeclaration
  ): void {
    const determinedType = this.toTypeList(predecessor.getType());

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
      determinedType.forEach(type => {
        this.addToMapSet(determinedTypes, successor, type);
      });
    }
  }

  topoSort<T>(vertices: Set<T>, graph: Map<T, Set<T>>): T[] | undefined {
    const sorted: T[] = [];
    const numDependencies = new Map<T, number>();

    for (const vertex of vertices) {
      numDependencies.set(vertex, 0);
    }

    for (const successors of graph.values()) {
      successors.forEach(successor => {
        numDependencies.set(
          successor,
          (numDependencies.get(successor) || 0) + 1
        );
      });
    }

    const queue: T[] = [];

    for (const vertex of numDependencies.keys()) {
      if (numDependencies.get(vertex) === 0) {
        queue.push(vertex);
      }
    }

    while (queue.length > 0) {
      const currVertex = queue.shift()!;
      sorted.push(currVertex);

      graph.get(currVertex)?.forEach(successor => {
        numDependencies.set(successor, numDependencies.get(successor)! - 1);
        if (numDependencies.get(successor) === 0) {
          queue.push(successor);
        }
      });
    }

    if (sorted.length !== vertices.size) {
      return undefined;
    }

    return sorted;
  }
}
