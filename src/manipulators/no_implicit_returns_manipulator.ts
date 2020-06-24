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

import _ from 'lodash';
import {Diagnostic, ts, Node, SyntaxKind, Project} from 'ts-morph';
import {Manipulator} from './manipulator';

export class NoImplicitReturnsManipulator extends Manipulator {
  constructor(project: Project) {
    super(project);
    this.errorCodes = new Set<number>([7030]);
  }

  fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void {
    const errorNodes = this.filterNodesFromDiagnostics(
      this.filterErrors(diagnostics),
      new Set<SyntaxKind>([
        SyntaxKind.Identifier,
        SyntaxKind.ReturnStatement,
        SyntaxKind.ArrowFunction,
      ])
    );

    _.forEachRight(errorNodes, ([errorNode]) => {
      const parent = errorNode.getParent();

      switch (errorNode.getKind()) {
        case SyntaxKind.Identifier: {
          if (
            parent &&
            (Node.isFunctionDeclaration(parent) ||
              Node.isMethodDeclaration(parent))
          ) {
            parent.addStatements(
              '// typescript-flag-upgrade automated fix: --noImplicitReturns'
            );
            parent.addStatements('return undefined;');
          }
          break;
        }

        case SyntaxKind.ReturnStatement: {
          if (parent && Node.isBlock(parent)) {
            const index = errorNode.getChildIndex();
            parent.removeStatement(index);
            parent.addStatements(
              '// typescript-flag-upgrade automated fix: --noImplicitReturns'
            );
            parent.addStatements('return undefined;');
          }
          break;
        }

        case SyntaxKind.ArrowFunction: {
          const child = errorNode.getLastChildByKind(SyntaxKind.Block);
          if (child) {
            child.addStatements(
              '// typescript-flag-upgrade automated fix: --noImplicitReturns'
            );
            child.addStatements('return undefined;');
          }
          break;
        }
      }

      // const printer = ts.createPrinter({removeComments: false});
      // console.log(printer.printFile(errorNode.getSourceFile().compilerNode));
    });
  }
}
