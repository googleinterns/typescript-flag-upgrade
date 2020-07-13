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

import {
  Node,
  ts,
  Diagnostic,
  VariableDeclaration,
  ParameterDeclaration,
  PropertyDeclaration,
  PropertySignature,
} from 'ts-morph';

export type ArgumentOptions = {
  [x: string]: unknown;
  /** Relative path to TypeScript config file */
  p: string;
  /**
   * Option between only leaving comments ('comment') or both comments and
   * mutative fixes ('all')
   */
  m: string;
  /** Override config and specify input directory */
  i: string | undefined;
  /** Specify file for logging */
  l: string | undefined;
  _: string[];
  $0: string;
};

export type NodeDiagnostic = {
  node: Node<ts.Node>;
  diagnostic: Diagnostic<ts.Diagnostic>;
};

/**
 * TypeScript error codes: https://github.com/microsoft/TypeScript/blob/v3.9.6/src/compiler/diagnosticMessages.json
 */
export enum ErrorCodes {
  CodePathNoReturn = 7030,
  ObjectPossiblyNull = 2531,
  ObjectPossiblyUndefined = 2532,
  ObjectPossiblyNullOrUndefined = 2533,
  TypeANotAssignableToTypeB = 2322,
  ArgumentNotAssignableToParameter = 2345,
}

export type DeclarationType = Map<
  | VariableDeclaration
  | ParameterDeclaration
  | PropertyDeclaration
  | PropertySignature,
  Set<string>
>;

export const STRICT_NULL_CHECKS_COMMENT =
  '// typescript-flag-upgrade automated fix: --strictNullChecks';
export const NO_IMPLICIT_RETURNS_COMMENT =
  '// typescript-flag-upgrade automated fix: --noImplicitReturns';
