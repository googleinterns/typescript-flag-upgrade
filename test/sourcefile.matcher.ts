import MatchersUtil = jasmine.MatchersUtil;
import CustomMatcherFactories = jasmine.CustomMatcherFactories;
import CustomEqualityTester = jasmine.CustomEqualityTester;
import CustomMatcher = jasmine.CustomMatcher;
import CustomMatcherResult = jasmine.CustomMatcherResult;

import {SourceFile, Node, ts} from 'ts-morph';

export const SourceFileComparer: CustomMatcherFactories = {
  toHaveSameASTAs: function (
    util: MatchersUtil,
    customEqualityTesters: readonly CustomEqualityTester[]
  ): CustomMatcher {
    return {
      compare: function (
        actual: SourceFile,
        expected: SourceFile
      ): CustomMatcherResult {
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
