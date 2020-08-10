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

import {Manipulator} from '@/src/manipulators/manipulator';

describe('Manipulator', () => {
  it('correctly filters unnecessary types', () => {
    const typeLists = [
      {in: [], out: []},
      {in: ['string[]'], out: ['string[]']},
      {in: ['string[]', 'any[]'], out: ['any[]']},
      {in: ['never[]', 'string[]'], out: ['string[]']},
      {in: ['{foo: string[]}', '{foo: any[]}'], out: ['{foo: any[]}']},
      {in: ['{foo: never[]}', '{foo: string[]}'], out: ['{foo: string[]}']},
      {in: ['string', 'any'], out: ['any']},
      {in: ['null', 'any[]'], out: ['null', 'any[]']},
    ];

    for (let typeList of typeLists) {
      expect(Manipulator.filterUnnecessaryTypes(new Set(typeList.in))).toEqual(
        new Set(typeList.out)
      );
    }
  });
});
