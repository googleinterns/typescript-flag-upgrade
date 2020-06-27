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

import {Component, OnInit} from '@angular/core';
import {BasicInterface} from '../util/basic_interface';

/**
 * Component with anti-patterns to test strictPropertyInitialization flag
 */
@Component({
  selector: 'app-strict-property-initialization',
  templateUrl: './strict_property_initialization_component.html',
})
export class StrictPropertyInitializationComponent implements OnInit {
  // Test: Unassigned scalar property
  // Fix: private unAssignedScalar: boolean | undefined;
  private unAssignedScalar: boolean;
  private unAssignedButUndefined: boolean | undefined;
  private assignedInDeclaration = true;
  private assignedInConstructor: boolean;

  // Test: Unassigned nonscalar property: list
  // Fix:   private unAssignedNonScalar: [] | undefined;
  private unAssignedNonScalar: [];

  // Test: Unassigned nonscalar property: interface
  // Fix: private unAssignedInterface: BasicInterface | undefined;
  private unAssignedInterface: BasicInterface;

  constructor() {
    this.assignedInConstructor = true;
    this.takesInBoolean(this.unAssignedScalar);
  }

  ngOnInit(): void {}

  // Fix: takesInBoolean(v: boolean | undefined) {}
  takesInBoolean(v: boolean) {}
}
