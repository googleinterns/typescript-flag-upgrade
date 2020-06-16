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

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NoImplicitAnyComponent } from './no_implicit_any_component';
import { BasicClass } from '../util/basic_class';

describe('TestNoImplicitAnyComponent', () => {
  // Test: noImplicitAny in Angular test file
  // Fix: let testClass: BasicClass | undefined;
  let testClass;
  let component: NoImplicitAnyComponent;
  let fixture: ComponentFixture<NoImplicitAnyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NoImplicitAnyComponent],
      providers: [BasicClass],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NoImplicitAnyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    testClass = TestBed.inject(BasicClass);
  });

  it('gets value from class', () => {
    expect(testClass.value).toBe(true);
  });
});
