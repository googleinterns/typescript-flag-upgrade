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
import {BasicClass} from '../util/basic_class';
import {BasicInterface} from '../util/basic_interface';

/**
 * Component with anti-patterns to test noImplicitAny flag
 */
@Component({
  selector: 'app-no-implicit-any',
  templateUrl: './no_implicit_any_component.html',
})
export class NoImplicitAnyComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  // Test: Ignores when no information regarding variable type
  noInfo(name) {
    return name;
  }

  // Test: Infer type from method signatures calling func
  passString(val: string) {
    this.calledByPassString(val);
    this.calledByPassNumAndPassString(val);
  }

  // Fix: calledByPassString(val: string) {}
  calledByPassString(val) {}

  // Test: Concatenates multiple possible types
  passNum(val: number) {
    this.calledByPassNumAndPassString(val);
  }

  // Fix: calledByPassString(val: string | number) {}
  calledByPassNumAndPassString(val) {}

  // Test: Infer non-scalar types from method signatures calling func
  passObject(val: BasicInterface) {
    this.calledByPassObject(val);
  }

  // Fix: calledByPassObject(val: BasicInterface) {}
  calledByPassObject(val) {}

  // Test: Spans across multiple files
  // Fix: callsReturnsStringInSeparateClass(val: string) {
  callsReturnsStringInSeparateClass(val) {
    val = new BasicClass().returnsString();
  }

  // Fix: callsReturnsObjectInSeparateClass(val: BasicInterface) {
  callsReturnsObjectInSeparateClass(val) {
    val = new BasicClass().returnsObject();
  }

  // Lists: UNSUPPORTED

  // Test: Assign any array to defined type array
  assignToDefinedArray() {
    let mustBeStringArray: string[];
    const anyArray = [];
    mustBeStringArray = anyArray;
  }

  assignToDefinedNonScalarArray() {
    let mustBeObjectArray: BasicInterface[];
    const anyArray = [];
    mustBeObjectArray = anyArray;
  }

  // Objects: UNSUPPORTED

  // Test: Accessing an empty object
  accessEmptyObjectProperty() {
    const emptyObject = {};
    emptyObject['property'] = true;
  }

  // Test: Accessing a non-empty object
  accessNonEmptyObjectProperty() {
    const nonEmptyObject = {already: false};
    nonEmptyObject['property'] = true;
  }
}
