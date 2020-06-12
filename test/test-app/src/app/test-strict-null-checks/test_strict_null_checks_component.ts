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

import { Component, OnInit } from '@angular/core';

/**
 * Component with anti-patterns to test strictNullChecks flag
 */
@Component({
  selector: 'app-test-strict-null-checks',
  templateUrl: './test_strict_null_checks_component.html',
})
export class TestStrictNullChecksComponent implements OnInit {
  // Test: Assign class member to null
  // Fix: shouldBeNumber: number | null;
  shouldBeNumber: number;

  constructor() {
    this.shouldBeNumber = null;
  }

  ngOnInit(): void {}

  // Test: Assign variable to null
  assignNull() {
    // Fix: let n: number | null = 0;
    let n = 0;
    n = null;
    n = 5;
  }

  // Test: Assign variable to undefined
  assignUndefined() {
    // Fix: let n: number | undefined = 0;
    let n = 0;
    n = undefined;
    n = 5;
  }

  // Test: Assign variable to null and undefined
  assignNullAndUndefined() {
    // Fix: let n: number | null | undefined = 0;
    let n = 0;
    n = null;
    n = 5;
    n = undefined;
    n = 7;
  }

  // Test: Assign variable to null in conditional branch
  assignInBranch(goInBranch: boolean) {
    // Fix: let n: number | null = 0;
    let n = 0;
    if (goInBranch) {
      n = null;
    }
    n = 5;
  }

  // Test: Pass null value to function
  // Fix: doesNotExpectNull(n: number | null) {}
  doesNotExpectNull(n: number) {}

  passesNullValue() {
    this.doesNotExpectNull(null);
  }

  // Test: Pass null and undefined value to function
  // Fix: doesNotExpectNullUndefined(n: number | null | undefined) {}
  doesNotExpectNullUndefined(n: number) {}

  passesNullVariable() {
    const n: number | null = null;
    this.doesNotExpectNullUndefined(n);
  }

  passesUndefinedVariable() {
    const n: number | undefined = undefined;
    this.doesNotExpectNullUndefined(n);
  }

  // Test: Assign argument to null
  // Fix: turnsIntoNull(n: number | null)
  turnsIntoNull(n: number) {
    n = null;
  }

  // Test: Assign non-null to null variable
  assignNonNullValueToNullVar() {
    // Fix: let n: null | number = null;
    let n = null;
    n = this.returnsNumber();
  }

  returnsNumber() {
    return 5;
  }

  // Test: Add element to empty list
  addToEmptyList() {
    // Fix: const emptyList: number[] = []
    const emptyList = [];
    emptyList.push(5);
  }

  // Test: Return null value but not in return type
  // Fix: unexpectedlyReturnsNull(): number | null {
  unexpectedlyReturnsNull(): number {
    return null;
  }

  // Test: Object is possibly null
  objectPossiblyNull(v: number | null) {
    // Fix: console.log(v!.toString());
    console.log(v.toString());

    // Fix: console.log('V: ' + (v != null ? v.toString() : 'unknown'));
    console.log('V: ' + v != null ? v.toString() : 'unknown');
  }
}
