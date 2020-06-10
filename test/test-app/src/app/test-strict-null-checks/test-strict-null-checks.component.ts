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

@Component({
  selector: 'app-test-strict-null-checks',
  templateUrl: './test-strict-null-checks.component.html',
  styleUrls: ['./test-strict-null-checks.component.css'],
})
export class TestStrictNullChecksComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  // Test: Assign variable to null
  assignNull() {
    let n = 0;
    n = null;
    n = 5;
  }

  // Test: Assign variable to undefined
  assignUndefined() {
    let n = 0;
    n = undefined;
    n = 5;
  }

  // Test: Assign variable to null and undefined
  assignNullAndUndefined() {
    let n = 0;
    n = null;
    n = 5;
    n = undefined;
    n = 7;
  }

  // Test: Assign variable to null in conditional branch
  assignInBranch(goInBranch: boolean) {
    let n = 0;
    if (goInBranch) {
      n = null;
    }
    n = 5;
  }

  // Test: Pass null value to function
  doesNotExpectNull(n: number) {}

  passesNullValue() {
    this.doesNotExpectNull(null);
  }

  // Test: Assign argument to null
  turnsIntoNull(n: number) {
    n = null;
  }

  // Test: Add element to empty list
  addToEmptyList() {
    const emptyList = [];
    emptyList.push(5);
  }

  // Test: Return null value but not in return type
  unexpectedlyReturnsNull(): number {
    return null;
  }

  // Test: Object is possibly null
  objectPossiblyNull() {
    const v: number | null = 5;

    console.log(v.toString());
    // => Error, v may be undefined

    console.log('V: ' + v != null ? v.toString() : 'unknown');
    // => Error, unfortunately TypeScript can't infer that v is non-null here.
  }
}
