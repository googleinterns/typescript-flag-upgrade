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

export abstract class Manipulator {
  project: Project;
  errorCodes: Set<number>;

  constructor(project: Project) {
    this.project = project;
    this.errorCodes = new Set<number>();
  }

  abstract fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void;

  detectErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): boolean {
    return this.filterErrors(diagnostics).length !== 0;
  }

  filterErrors(
    diagnostics: Diagnostic<ts.Diagnostic>[]
  ): Diagnostic<ts.Diagnostic>[] {
    return diagnostics.filter(diagnostic => {
      return this.errorCodes.has(diagnostic.getCode());
    });
  }

  filterNodesFromDiagnostics(
    diagnostics: Diagnostic<ts.Diagnostic>[],
    wantedNodeKinds: Set<SyntaxKind>
  ): [Node<ts.Node>, Diagnostic<ts.Diagnostic>][] {
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
