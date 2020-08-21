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

import {ManipulatorUtil} from '@/src/util/manipulator_util';
import {Project} from 'ts-morph';
import _ from 'lodash';

describe('ManipulatorUtil', () => {
  let project: Project;

  beforeEach(() => {
    const inputConfigPath = './test/test_files/tsconfig.json';
    project = new Project({
      tsConfigFilePath: inputConfigPath,
      addFilesFromTsConfig: false,
    });
  });

  it('correctly filters out unnecessary types', () => {
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
      expect(
        ManipulatorUtil.filterUnnecessaryTypes(new Set(typeList.in))
      ).toEqual(new Set(typeList.out));
    }
  });

  it('converts types to string', () => {
    const sampleSourceFile = project.createSourceFile(
      'test.ts',
      'let x: string; let y: number | boolean; let z: 0 | true;'
    );

    expect(sampleSourceFile.getVariableDeclaration('x')).toBeDefined();
    expect(sampleSourceFile.getVariableDeclaration('y')).toBeDefined();
    expect(sampleSourceFile.getVariableDeclaration('z')).toBeDefined();

    const sampleDeclarations = {
      x: sampleSourceFile.getVariableDeclaration('x')!,
      y: sampleSourceFile.getVariableDeclaration('y')!,
      z: sampleSourceFile.getVariableDeclaration('z')!,
    };

    expect(
      _.isEqual(ManipulatorUtil.typeToString(sampleDeclarations.x.getType()), [
        'string',
      ])
    ).toBeTrue();

    expect(
      _.isEqual(
        new Set(ManipulatorUtil.typeToString(sampleDeclarations.y.getType())),
        new Set(['number', 'boolean'])
      )
    ).toBeTrue();

    expect(
      _.isEqual(
        new Set(ManipulatorUtil.typeToString(sampleDeclarations.z.getType())),
        new Set(['number', 'boolean'])
      )
    ).toBeTrue();

    project.removeSourceFile(sampleSourceFile);
  });

  it('checks valid types', () => {
    const typeCases = [
      {in: '', out: true},
      {in: 'string[]', out: true},
      {in: 'any[]', out: false},
      {in: 'never[]', out: false},
      {in: '{foo: any[]}', out: false},
      {in: '{foo: never[]}', out: false},
      {in: '{foo: string[]}', out: true},
      {in: 'any', out: false},
      {in: 'null', out: true},
    ];

    for (let typeCase of typeCases) {
      expect(ManipulatorUtil.isValidType(typeCase.in)).toEqual(typeCase.out);
    }
  });

  it('retrieves parent statement', () => {
    const sampleSourceFile = project.createSourceFile(
      'test.ts',
      'let x;\nlet y;'
    );

    expect(sampleSourceFile.getVariableDeclaration('x')).toBeDefined();
    expect(sampleSourceFile.getVariableDeclaration('y')).toBeDefined();

    const sampleDeclarations = {
      x: sampleSourceFile.getVariableDeclaration('x')!,
      y: sampleSourceFile.getVariableDeclaration('y')!,
    };

    expect(
      ManipulatorUtil.getModifiedStatement(sampleDeclarations.x)?.getText()
    ).toEqual('let x;');

    expect(
      ManipulatorUtil.getModifiedStatement(sampleDeclarations.y)?.getText()
    ).toEqual('let y;');

    project.removeSourceFile(sampleSourceFile);
  });

  it('checks leading comments', () => {
    const sampleSourceFile = project.createSourceFile(
      'test.ts',
      'let x;\n// Test comment\nlet y;'
    );

    expect(sampleSourceFile.getVariableDeclaration('x')).toBeDefined();
    expect(sampleSourceFile.getVariableDeclaration('y')).toBeDefined();
    expect(
      ManipulatorUtil.getModifiedStatement(
        sampleSourceFile.getVariableDeclaration('x')!
      )
    ).toBeDefined();
    expect(
      ManipulatorUtil.getModifiedStatement(
        sampleSourceFile.getVariableDeclaration('y')!
      )
    ).toBeDefined();

    const sampleDeclarationStatements = {
      x: ManipulatorUtil.getModifiedStatement(
        sampleSourceFile.getVariableDeclaration('x')!
      )!,
      y: ManipulatorUtil.getModifiedStatement(
        sampleSourceFile.getVariableDeclaration('y')!
      )!,
    };

    expect(
      ManipulatorUtil.verifyCommentRange(
        sampleDeclarationStatements.x,
        '// Test comment'
      )
    ).toBeTrue();

    expect(
      ManipulatorUtil.verifyCommentRange(
        sampleDeclarationStatements.y,
        '// Test comment'
      )
    ).toBeFalse();

    project.removeSourceFile(sampleSourceFile);
  });
});
