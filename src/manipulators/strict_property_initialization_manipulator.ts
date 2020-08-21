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

import {Manipulator} from './manipulator';
import {
  Diagnostic,
  ts,
  SyntaxKind,
  Node,
  Identifier,
  SourceFile,
} from 'ts-morph';
import {ErrorDetector} from '@/src/error_detectors/error_detector';
import {ErrorCodes, STRICT_PROPERTY_INITIALIZATION_COMMENT} from '@/src/types';
import {Logger} from '@/src/loggers/logger';
import {ManipulatorUtil} from '@/src/util/manipulator_util';

/**
 * Manipulator that fixes for the strictPropertyInitialization compiler flag.
 * @extends {Manipulator}
 */
export class StrictPropertyInitializationManipulator extends Manipulator {
  private nodeKinds: Set<SyntaxKind>;

  constructor(errorDetector: ErrorDetector, logger: Logger) {
    super(
      errorDetector,
      logger,
      new Set<number>([ErrorCodes.PropertyNoInitializer])
    );
    this.nodeKinds = new Set<SyntaxKind>([SyntaxKind.Identifier]);
  }

  /**
   * Manipulates AST of project to fix for the strictPropertyInitialization compiler flag given diagnostics.
   * @param {Diagnostic<ts.Diagnostic>[]} diagnostics - List of diagnostics outputted by parser
   * @returns {Set<SourceFile>} Set of modified source files.
   */
  fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): Set<SourceFile> {
    // Retrieve AST nodes corresponding to diagnostics with relevant error codes
    const errorNodes = this.errorDetector.filterDiagnosticsByKind(
      this.errorDetector.getNodesFromDiagnostics(
        this.errorDetector.filterDiagnosticsByCode(
          diagnostics,
          this.errorCodesToFix
        )
      ),
      this.nodeKinds
    );

    // Set of modified source files.
    const modifiedSourceFiles = new Set<SourceFile>();

    // Set of identifiers of uninitialized properties to modify type declarations
    const modifiedIdentifiers = new Set<Identifier>();

    // Iterate through each node in reverse traversal order to prevent interference
    errorNodes.forEach(({node: errorNode}) => {
      if (Node.isIdentifier(errorNode)) {
        // Add all Identifier errorNodes to set of modifiedIdentifiers
        modifiedIdentifiers.add(errorNode as Identifier);
      }
    });

    // For each modifiedIdentifier, expand type declaration to include undefined
    // Eg. property: string; => property!: string;
    modifiedIdentifiers.forEach(identifier => {
      if (!identifier.getType().getText().includes('undefined')) {
        const newIdentifier = identifier.replaceWithText(
          `${identifier.getText().trim()}!`
        );

        modifiedSourceFiles.add(newIdentifier.getSourceFile());

        const parent = newIdentifier.getParent();
        if (
          parent &&
          Node.isPropertyDeclaration(parent) &&
          ManipulatorUtil.verifyCommentRange(
            parent,
            STRICT_PROPERTY_INITIALIZATION_COMMENT
          )
        ) {
          parent.replaceWithText(
            `${STRICT_PROPERTY_INITIALIZATION_COMMENT}\n${parent
              .getText()
              .trimLeft()}`
          );
        }
      }
    });

    return modifiedSourceFiles;
  }
}
