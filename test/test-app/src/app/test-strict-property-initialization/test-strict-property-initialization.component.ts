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
  selector: 'app-test-strict-property-initialization',
  templateUrl: './test-strict-property-initialization.component.html',
  styleUrls: ['./test-strict-property-initialization.component.css'],
})
export class TestStrictPropertyInitializationComponent implements OnInit {
  private unAssignedScalar: boolean; // Test: Unassigned scalar property
  private unAssignedButUndefined: boolean | undefined;
  private assignedInDeclaration = true;
  private assignedInConstructor: boolean;

  private unAssignedNonScalar: []; // Test: Unassigned nonscalar property: list
  private unAssignedInterface: TestInterface; // Test: Unassigned nonscalar property: interface

  constructor() {
    this.assignedInConstructor = true;
  }

  ngOnInit(): void {}
}

interface TestInterface {
  param: boolean;
}
