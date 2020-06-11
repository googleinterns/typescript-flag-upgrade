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
import { SeparateClass } from './separate-file';

@Component({
  selector: 'app-test-no-implicit-any',
  templateUrl: './test-no-implicit-any.component.html',
  styleUrls: ['./test-no-implicit-any.component.css'],
})
export class TestNoImplicitAnyComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  // Test: No information regarding variable type
  noInfo(name) {
    return name;
  }

  // Test: Infer type from method signatures called by func
  callsTakeString(val) {
    this.takeString(val);
  }

  takeString(val: string) {}

  // Test: Infer type from method signatures calling func
  passString(val: string) {
    this.calledByPassString(val);
  }

  calledByPassString(val) {}

  // Test: Concatenates multiple possible types
  passNum(val: number) {
    this.calledByPassNumAndPassString(val);
  }

  takeNum(val: number) {}

  calledByPassNumAndPassString(val) {}

  // Test: Supports chaining
  callsCallsTakeString(val) {
    this.callsTakeString(val);
  }

  // Test: Spans across multiple files
  callsTakeStringInSeparateClass(val) {
    new SeparateClass().takeStringSeparateClass(val);
  }

  // Lists

  // Test: Assign any array to defined type array
  assignToDefinedArray() {
    let mustBeStringArray: string[];
    const anyArray = [];
    mustBeStringArray = anyArray;
  }

  // Objects

  // Test: Accessing an empty object
  accessEmptyObjectProperty() {
    const emptyObject = {};
    emptyObject['property'] = true;
  }

  // Test: Accessing a non-empty object
  accessNonEmptyObjectProperty() {
    const nonEmptyObject = { already: false };
    nonEmptyObject['property'] = true;
  }

  printUnknownObject(unknownObject) {
    console.log(unknownObject.foo + unknownObject.bar);
  }

  printUnknownObjectWithProps(unknownObject) {
    Math.abs(unknownObject.baz);
  }
}
