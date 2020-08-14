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

import {Node, ts, Type, Statement, TypeFormatFlags} from 'ts-morph';

export class ManipulatorUtil {
  /**
   * Verifies that a node hasn't been edited before by looking through leading comments and
   * ensuring that comments weren't left by previous iterations of fixes.
   * @param {Node<ts.Node>} node - Node to verify.
   * @param {string} comment - Comment to look for when parsing leading comment ranges of node.
   * @return {boolean} True if node hasn't been editted before.
   */
  static verifyCommentRange(node: Node<ts.Node>, comment: string): boolean {
    return !node.getLeadingCommentRanges().some(commentRange => {
      return commentRange.getText().includes(comment);
    });
  }

  /**
   * Converts a Union type into a list of base types, if applicable.
   * @param {Type} type - Input type.
   * @return {Type[]} List of types represented by input type.
   */
  static toTypeList(type: Type): Type[] {
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
  static getModifiedStatement(node: Node<ts.Node>): Statement | undefined {
    if (Node.isStatement(node)) {
      return node;
    }

    return node.getParentWhile((parent, child) => {
      return !(Node.isStatementedNode(parent) && Node.isStatement(child));
    }) as Statement | undefined;
  }

  /**
   * Returns if type is valid. Currently, any type with "any" and "never" is invalid.
   * @param {string} type - Type to be evaluated.
   * @return {boolean} True if type is valid.
   */
  static isValidType(type: string): boolean {
    return !type.includes('any') && !type.includes('never');
  }

  /**
   * Returns the string representation of a type.
   * @param {Type<ts.Type>} type - Type to be converted to a string.
   * @return {string[]} String representation of type.
   */
  static typeToString(
    type?: Type<ts.Type>,
    enclosingNode?: Node<ts.Node>
  ): string[] {
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

  /**
   * Parses through a set of types and removes unnecessary types caused by any and never.
   * @param {Set<string>} types - Set of types.
   * @return {Set<string>} Set of filtered types.
   */
  static filterUnnecessaryTypes(types: Set<string>): Set<string> {
    if (types.has('any')) {
      return new Set<string>(['any']);
    }

    const typeArray = [...types];
    const unnecessaryTypes = new Set<string>();
    const newTypes = new Set<string>();

    typeArray.forEach((type, index) => {
      if (unnecessaryTypes.has(type)) {
        return;
      }

      // If the current type contains "never" in a context and another type has the same
      // context without "never", the current type is not needed
      // Eg. never[] | string[] -> only string[] is needed
      // Eg. { foo: never[] } | { foo: string[] } -> only { foo: string[] } is needed
      let startSearchNeverPos = 0;
      let matchNeverIndex: number;
      while (
        (matchNeverIndex = type.indexOf('never', startSearchNeverPos)) !== -1
      ) {
        startSearchNeverPos = matchNeverIndex + 1;
        typeArray.forEach((otherType, otherIndex) => {
          // If another type has matching beginnings and endings as the current type but
          // doesn't have "never", include the other type but not this type
          if (
            otherIndex !== index &&
            otherType.startsWith(type.substring(0, matchNeverIndex)) &&
            otherType.endsWith(type.substring(matchNeverIndex + 5))
          ) {
            unnecessaryTypes.add(type);
            newTypes.delete(type);
          }
        });
      }

      // If another type contains "any" in a context, and the current type has the same
      // context without "any", the current type is not needed
      // Eg. any[] | string[] -> only any[] is needed
      // Eg. { foo: any[] } | { foo: string[] } -> only { foo: any[] } is needed
      let startSearchAnyPos = 0;
      let matchAnyIndex: number;
      while ((matchAnyIndex = type.indexOf('any', startSearchAnyPos)) !== -1) {
        startSearchAnyPos = matchAnyIndex + 1;
        typeArray.forEach((otherType, otherIndex) => {
          // If other types have matching beginnings and endings as the current type but
          // doesn't have "any", include this type and not the other types
          if (
            otherIndex !== index &&
            otherType.startsWith(type.substring(0, matchAnyIndex)) &&
            otherType.endsWith(type.substring(matchAnyIndex + 3))
          ) {
            unnecessaryTypes.add(otherType);
            newTypes.delete(otherType);
          }
        });
      }

      if (!unnecessaryTypes.has(type)) {
        newTypes.add(type);
      }
    });

    return newTypes;
  }
}
