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
  Diagnostic,
  ts,
  Node,
  Type,
  Statement,
  TypeFormatFlags,
  SourceFile,
} from 'ts-morph';
import {ErrorDetector} from '@/src/error_detectors/error_detector';
import {Logger} from '@/src/loggers/logger';

/** Base class for manipulating AST to fix for flags. */
export abstract class Manipulator {
  errorDetector: ErrorDetector;
  logger: Logger;
  errorCodesToFix: Set<number>;

  /**
   * Sets relevant error codes and node kinds for specific flags.
   * @param {ErrorDetector} errorDetector - Util class for filtering diagnostics.
   * @param {Set<number>} errorCodesToFix - Codes of compiler flag errors.
   */
  constructor(
    errorDetector: ErrorDetector,
    logger: Logger,
    errorCodesToFix: Set<number>
  ) {
    this.errorDetector = errorDetector;
    this.logger = logger;
    this.errorCodesToFix = errorCodesToFix;
  }

  /**
   * Manipulates AST of project to fix for a specific flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser.
   * @return {Set<SourceFile>} Set of modified source files.
   */
  abstract fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): Set<SourceFile>;

  /**
   * Manipulates AST of project to fix for a specific flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser.
   * @return {boolean} True if diagnostics contain error codes for the flag.
   */
  hasErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): boolean {
    return this.errorDetector.detectErrors(diagnostics, this.errorCodesToFix);
  }

  /**
   * Verifies that a node hasn't been edited before by looking through leading comments and
   * ensuring that comments weren't left by previous iterations of fixes.
   * @param {Node<ts.Node>} node - Node to verify.
   * @param {string} comment - Comment to look for when parsing leading comment ranges of node.
   * @return {boolean} True if node hasn't been editted before.
   */
  verifyCommentRange(node: Node<ts.Node>, comment: string): boolean {
    return !node.getLeadingCommentRanges().some(commentRange => {
      return commentRange.getText().includes(comment);
    });
  }

  /**
   * Adds value to a Map with Set value types.
   * @param {Map<K, Set<V>>} map - Map to add to.
   * @param {K} key - Key to insert value at.
   * @param {V} val - Value to insert.
   */
  addToMapSet<K, V>(map: Map<K, Set<V>>, key: K, val: V): void {
    let values: Set<V> | undefined = map.get(key);
    if (!values) {
      values = new Set<V>();
      map.set(key, values);
    }
    values.add(val);
  }

  /**
   * Adds multiple values to a Map with Set value types.
   * @param {Map<K, Set<V>>} map - Map to add to.
   * @param {K} key - Key to insert value at.
   * @param {V[]} vals - Values to insert.
   */
  addMultipleToMapSet<K, V>(map: Map<K, Set<V>>, key: K, vals: V[]): void {
    vals.forEach(val => {
      this.addToMapSet(map, key, val);
    });
  }

  /**
   * Converts a Union type into a list of base types, if applicable.
   * @param {Type} type - Input type.
   * @return {Type[]} List of types represented by input type.
   */
  toTypeList(type: Type): Type[] {
    return type.isUnion()
      ? type.getUnionTypes().map(individualType => {
          return individualType.getBaseTypeOfLiteralType();
        })
      : [type.getBaseTypeOfLiteralType()];
  }

  /**
   * Returns a modified node's closest Statement ancestor, or the node itself if it is Statement.
   * @param {Node<ts.Node>} node - Modified node.
   * @return {Statement|undefined} Closest Statement ancestor of modified node or undefined if doesn't exist.
   */
  getModifiedStatement(node: Node<ts.Node>): Statement | undefined {
    if (Node.isStatement(node)) {
      return node;
    }

    return node.getParentWhile((parent, child) => {
      return !(Node.isStatementedNode(parent) && Node.isStatement(child));
    }) as Statement | undefined;
  }

  /**
   * Returns if type is valid. Currently, "any", "any[]", and "never[]" are invalid.
   * @param {string} type - Type to be evaluated.
   * @return {boolean} True if type is valid.
   */
  isValidType(type: string): boolean {
    return !new Set([
      'any',
      'Array<never>',
      'Array<any>',
      'never[]',
      'any[]',
    ]).has(type);
  }

  /**
   * Returns the string representation of a type.
   * @param {Type<ts.Type>} type - Type to be converted to a string.
   * @return {string[]} String representation of type.
   */
  typeToString(type?: Type<ts.Type>, enclosingNode?: Node<ts.Node>): string[] {
    if (!type) {
      return [];
    }

    return this.toTypeList(type).map(subType =>
      subType.getText(
        enclosingNode,
        TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
      )
    );
  }
}
