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

import {Diagnostic, ts, SyntaxKind, SourceFile} from 'ts-morph';
import {NodeDiagnostic} from 'src/types';
import {ErrorDetector} from './error_detector';

/**
 * Util class for filtering diagnostics, used in prod.
 * @extends {ErrorDetector}
 */
export class ProdErrorDetector extends ErrorDetector {
  /**
   * Filters a list of diagnostics for errors relevant to specific flag.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics.
   * @param {Set<number>} errorCodes - List of codes to filter for.
   * @return {Diagnostic<ts.Diagnostic>[]} List of filtered diagnostics with error codes.
   */
  filterDiagnosticsByCode(
    diagnostics: Diagnostic<ts.Diagnostic>[],
    errorCodes: Set<number>
  ): Diagnostic<ts.Diagnostic>[] {
    return diagnostics.filter(diagnostic => {
      return errorCodes.has(diagnostic.getCode());
    });
  }

  /**
   * Checks if a list of diagnostics contains relevant codes.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics.
   * @param {Set<number>} errorCodes - List of relevant codes.
   * @return {boolean} True if diagnostics contain relevant codes.
   */
  detectErrors(
    diagnostics: Diagnostic<ts.Diagnostic>[],
    errorCodes: Set<number>
  ): boolean {
    return this.filterDiagnosticsByCode(diagnostics, errorCodes).length !== 0;
  }

  /**
   * Retrieves the list of nodes corresponding to a list of diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics.
   * @return {NodeDiagnostic[]} List of corresponding node-diagnostic pairs.
   */
  getNodesFromDiagnostics(
    diagnostics: Diagnostic<ts.Diagnostic>[]
  ): NodeDiagnostic[] {
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
    const errorNodes: NodeDiagnostic[] = [];

    for (const sourceFile of sourceFileToDiagnostics.keys()) {
      sourceFile.forEachDescendant(node => {
        sourceFileToDiagnostics.get(sourceFile)!.forEach(diagnostic => {
          if (diagnostic.getStart() === node.getStart()) {
            errorNodes.push({node, diagnostic});
          }
        });
      });
    }
    return errorNodes.reverse();
  }

  /**
   * Filters node-diagnostic pairs for a set of node kinds.
   * @param {NodeDiagnostic[]} nodeDiagnostics - List of node-diagnostic pairs.
   * @param {Set<SyntaxKind>} nodeKinds - Set of node kinds to filter nodes for.
   * @return {NodeDiagnostic[]} List of filtered node-diagnostic pairs with relevant node kinds.
   */
  filterDiagnosticsByKind(
    nodeDiagnostics: NodeDiagnostic[],
    nodeKinds: Set<SyntaxKind>
  ): NodeDiagnostic[] {
    return nodeDiagnostics.filter(({node}) => {
      return nodeKinds.has(node.getKind());
    });
  }
}
