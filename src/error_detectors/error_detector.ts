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

import {Diagnostic, ts, SyntaxKind} from 'ts-morph';
import {NodeDiagnostic} from '../types';

/** Base util class for filtering diagnostics. */
export abstract class ErrorDetector {
  /**
   * Filters a list of diagnostics for errors relevant to specific flag.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics.
   * @param {Set<number>} diagnosticCodes - List of codes to filter for.
   * @return {Diagnostic<ts.Diagnostic>[]} List of filtered diagnostics with error codes.
   */
  abstract filterDiagnosticsByCode(
    diagnostics: Diagnostic<ts.Diagnostic>[],
    diagnosticCodes: Set<number>
  ): Diagnostic<ts.Diagnostic>[];

  /**
   * Checks if a list of diagnostics contains relevant codes.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics.
   * @param {Set<number>} diagnosticCodes - List of relevant codes.
   * @return {boolean} True if diagnostics contain relevant codes.
   */
  abstract detectErrors(
    diagnostics: Diagnostic<ts.Diagnostic>[],
    diagnosticCodes: Set<number>
  ): boolean;

  /**
   * Retrieves the list of nodes corresponding to a list of diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics.
   * @return {NodeDiagnostic[]} List of corresponding node-diagnostic pairs.
   */
  abstract getNodesFromDiagnostics(
    diagnostics: Diagnostic<ts.Diagnostic>[]
  ): NodeDiagnostic[];

  /**
   * Filters node-diagnostic pairs for a set of node kinds.
   * @param {NodeDiagnostic[]} nodeDiagnostics - List of node-diagnostic pairs.
   * @param {Set<SyntaxKind>} nodeKinds - Set of node kinds to filter nodes for.
   * @return {NodeDiagnostic[]} List of filtered node-diagnostic pairs with relevant node kinds.
   */
  abstract filterNodeDiagnosticsByKind(
    nodeDiagnostics: NodeDiagnostic[],
    nodeKinds: Set<SyntaxKind>
  ): NodeDiagnostic[];
}
