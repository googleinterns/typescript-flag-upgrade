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

import {SourceFile, Project, Diagnostic, ts, Node, SyntaxKind} from 'ts-morph';

/** Base class for manipulating AST to fix for flags */
export abstract class Manipulator {
  project: Project;
  errorCodes: Set<number>;

  /**
   * Sets project to be modified and relevant error codes for specific flags
   * @param {Project} project - ts-morph project to be modified
   */
  constructor(project: Project) {
    this.project = project;
    this.errorCodes = new Set<number>();
  }

  /**
   * Manipulates AST of project to fix for a specific flag given diagnostics
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser
   */
  abstract fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void;

  /**
   * Checks if a list of diagnostics contains errors relevant to specific flag
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics
   * @return {boolean} true if diagnostics contain error codes relevant to specific flag
   */
  detectErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): boolean {
    return this.filterErrors(diagnostics).length !== 0;
  }

  /**
   * Filters a list of diagnostics for errors relevant to specific flag
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics
   * @return {Diagnostic<ts.Diagnostic>[]} List of diagnostics with relevant error codes
   */
  filterErrors(
    diagnostics: Diagnostic<ts.Diagnostic>[]
  ): Diagnostic<ts.Diagnostic>[] {
    return diagnostics.filter(diagnostic => {
      return this.errorCodes.has(diagnostic.getCode());
    });
  }

  /**
   * Retrieves the list of nodes corresponding to a list of diagnostics
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics
   * @return {[Node<ts.Node>, Diagnostic<ts.Diagnostic>][]} List of corresponding [node, diagnostic] tuples
   */
  filterNodesFromDiagnostics(
    diagnostics: Diagnostic<ts.Diagnostic>[],
    wantedNodeKinds: Set<SyntaxKind>
  ): [Node<ts.Node>, Diagnostic<ts.Diagnostic>][] {
    // Construct map of source file to list of contained diagnostics
    const sourceFileToDiagnostics = new Map<
      SourceFile,
      Diagnostic<ts.Diagnostic>[]
    >();
    diagnostics.forEach(diagnostic => {
      const sourceFile = diagnostic.getSourceFile();

      if (sourceFile) {
        if (sourceFileToDiagnostics.has(sourceFile)) {
          sourceFileToDiagnostics.get(sourceFile)!.push(diagnostic);
        } else {
          sourceFileToDiagnostics.set(sourceFile, [diagnostic]);
        }
      }
    });

    // Traverse each source file AST, constructing list of matching nodes to diagnostics
    const errorNodes: [Node<ts.Node>, Diagnostic<ts.Diagnostic>][] = [];

    for (const sourceFile of sourceFileToDiagnostics.keys()) {
      sourceFile.forEachDescendant(node => {
        if (wantedNodeKinds.has(node.getKind())) {
          sourceFileToDiagnostics.get(sourceFile)!.forEach(diagnostic => {
            if (diagnostic.getStart() === node.getStart()) {
              errorNodes.push([node, diagnostic]);
            }
          });
        }
      });
    }
    return errorNodes;
  }
}
