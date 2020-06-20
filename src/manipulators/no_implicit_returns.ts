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

import {Diagnostic, ts, SourceFile, Node, SyntaxKind} from 'ts-morph';

export function detectNoImplicitReturns() {}

export function fixNoImplicitReturns(diagnostics: Diagnostic<ts.Diagnostic>[]) {
  const diagnosticPositions = new Map<SourceFile, Set<number>>();
  let diagnosticCount = 0;

  diagnostics.forEach(diagnostic => {
    if (diagnostic.getCode() === 7030) {
      const sourceFile = diagnostic.getSourceFile();
      const diagnosticPosition = diagnostic.getStart();
      if (
        sourceFile &&
        diagnosticPosition !== undefined &&
        diagnosticPositions.has(sourceFile)
      ) {
        diagnosticPositions.get(sourceFile)!.add(diagnosticPosition);
        diagnosticCount++;
      } else if (sourceFile && diagnosticPosition !== undefined) {
        diagnosticPositions.set(
          sourceFile,
          new Set<number>([diagnosticPosition])
        );
        diagnosticCount++;
      } else {
        throw new Error('noImplicitReturns: Unknown error encountered');
      }
    }
  });

  const errorNodes: Node<ts.Node>[] = [];
  for (const sourceFile of diagnosticPositions.keys()) {
    sourceFile.forEachDescendant(node => {
      if (
        diagnosticPositions.get(sourceFile)?.has(node.getStart()) &&
        [
          SyntaxKind.Identifier,
          SyntaxKind.ReturnStatement,
          SyntaxKind.ArrowFunction,
        ].includes(node.getKind())
      ) {
        errorNodes.push(node);
      }
    });
  }

  if (errorNodes.length !== diagnosticCount) {
    throw new Error(
      "noImplicitReturns: Number of error nodes don't match diagnostics"
    );
  }

  for (let i = errorNodes.length - 1; i >= 0; i--) {
    const errorNode = errorNodes[i];
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
  }
}
