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
import {Diagnostic, ts, SyntaxKind} from 'ts-morph';
import {ErrorDetector} from '@/src/error_detectors/error_detector';

/**
 * Manipulator that fixes for the noImplicitAny compiler flag.
 * @extends {Manipulator}
 */
export class NoImplicitAnyManipulator extends Manipulator {
  private nodeKinds: Set<SyntaxKind>;

  constructor(errorDetector: ErrorDetector) {
    super(errorDetector, new Set<number>([]));
    this.nodeKinds = new Set<SyntaxKind>();
  }

  fixErrors(diagnostics: Diagnostic<ts.Diagnostic>[]): void {}
}
