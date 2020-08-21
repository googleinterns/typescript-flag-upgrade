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

import {CollectionsUtil} from '@/src/util/collections_util';
import _ from 'lodash';

describe('CollectionsUtil', () => {
  it('correctly adds single values to a mapset', () => {
    const testMapSet = new Map<number, Set<number>>();

    expect(_.isEqual(testMapSet, new Map())).toBeTrue();

    CollectionsUtil.addToMapSet(testMapSet, 0, 0);
    CollectionsUtil.addToMapSet(testMapSet, 1, 1);

    expect(
      _.isEqual(
        testMapSet,
        new Map([
          [0, new Set([0])],
          [1, new Set([1])],
        ])
      )
    ).toBeTrue();

    CollectionsUtil.addToMapSet(testMapSet, 0, 0);
    CollectionsUtil.addToMapSet(testMapSet, 1, 0);

    expect(
      _.isEqual(
        testMapSet,
        new Map([
          [0, new Set([0])],
          [1, new Set([0, 1])],
        ])
      )
    ).toBeTrue();
  });

  it('correctly adds multiple values to a mapset', () => {
    const testMapSet = new Map<number, Set<number>>();

    expect(_.isEqual(testMapSet, new Map())).toBeTrue();

    CollectionsUtil.addMultipleToMapSet(testMapSet, 0, [0]);

    expect(_.isEqual(testMapSet, new Map([[0, new Set([0])]]))).toBeTrue();

    CollectionsUtil.addMultipleToMapSet(testMapSet, 1, [0, 1]);

    expect(
      _.isEqual(
        testMapSet,
        new Map([
          [0, new Set([0])],
          [1, new Set([0, 1])],
        ])
      )
    ).toBeTrue();
  });
});
