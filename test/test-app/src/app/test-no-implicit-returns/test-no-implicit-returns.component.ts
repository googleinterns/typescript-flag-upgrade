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
  selector: 'app-test-no-implicit-returns',
  templateUrl: './test-no-implicit-returns.component.html',
  styleUrls: ['./test-no-implicit-returns.component.css'],
})
export class TestNoImplicitReturnsComponent implements OnInit {
  noEndReturnAlice: string | undefined;
  noEndReturnBob: string | undefined;
  noReturnInIfAlice: string | undefined;
  noReturnInIfBob: string | undefined;

  constructor() {
    this.noEndReturnAlice = this.noEndValueReturn('Alice');
    this.noEndReturnBob = this.noEndValueReturn('Bob');

    this.noReturnInIfAlice = this.noValueReturnInIf('Alice');
    this.noReturnInIfBob = this.noValueReturnInIf('Bob');
  }

  ngOnInit(): void {}

  // Test: No return at end of function
  noEndValueReturn(name: string) {
    if (name === 'Bob') {
      return 'Hello Bob';
    }
  }

  // Test: Returns halfway through function with no value
  noValueReturnInIf(name: string) {
    if (name === 'Bob') {
      return;
    }
    return 'Hello Not-Bob';
  }
}