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

import {SourceFile} from 'ts-morph';

declare global {
  namespace jasmine {
    interface Matchers<T> {
      toHaveSameASTAs(expectationFailOutput?: SourceFile): boolean;
    }
  }
}

export const SourceFileComparer: jasmine.CustomMatcherFactories = {
  toHaveSameASTAs: function (): jasmine.CustomMatcher {
    return {
      compare: function (
        actual: SourceFile,
        expected: SourceFile
      ): jasmine.CustomMatcherResult {
        const diffs: string[] = [];

        const actualDescendants = actual.forEachDescendantAsArray();
        const expectedDescendants = expected.forEachDescendantAsArray();

        if (actualDescendants.length !== expectedDescendants.length) {
          diffs.push(
            'Given # descendants: ' +
              actualDescendants.length +
              ', Expected # descendants: ' +
              expectedDescendants.length
          );
        }

        for (let i = 0; i < actualDescendants.length; i++) {
          const givenNode = actualDescendants[i];
          const expectedNode = expectedDescendants[i];

          if (
            givenNode.getChildCount() === 0 &&
            expectedNode.getChildCount() === 0
          ) {
            if (givenNode.getText() !== expectedNode.getText()) {
              diffs.push(
                'Given: ' +
                  givenNode.getText() +
                  ', Expected: ' +
                  expectedNode.getText()
              );
            }
          }
        }

        if (diffs.length === 0) {
          return {
            pass: true,
            message: 'Source files match.',
          };
        } else {
          return {
            pass: false,
            message: `Source file ASTs differ: ${diffs.toString()}`,
          };
        }
      },
    };
  },
};
