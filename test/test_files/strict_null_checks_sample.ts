interface BasicInterface {}

class StrictNullChecksSample {
  // Test: Assign class member to null/undefined
  // Fix: shouldBeNumber: number | null;
  shouldBeNumber: number;
  // Fix: shouldBeInterface: BasicInterface | undefined;
  shouldBeInterface: BasicInterface;

  constructor() {
    this.shouldBeNumber = null;
    this.shouldBeInterface = undefined;
  }
}

// Test: Assign variable to null
function assignNull() {
  // Fix: let n: number | null = 0;
  let n = 0;
  n = null;
  n = 5;
}

// Test: Assign variable to undefined
function assignUndefined() {
  // Fix: let n: number | undefined = 0;
  let n = 0;
  n = undefined;
  n = 5;
}

// Test: Assign variable to null and undefined
function assignNullAndUndefined() {
  // Fix: let n: number | null | undefined = 0;
  let n = 0;
  n = null;
  n = 5;
  n = undefined;
  n = 7;
}

// Test: Assign variable to null in conditional branch
function assignInBranch(goInBranch: boolean) {
  // Fix: let n: number | null = 0;
  let n = 0;
  if (goInBranch) {
    n = null;
  }
  n = 5;
}

// Test: Pass null value to function
function doesNotExpectNull(n: number) {}

function passesNullValue() {
  const n: number | null = null;
  // Fix: doesNotExpectNull(n!);
  doesNotExpectNull(n);
}

// Test: Pass null and undefined value to function
function doesNotExpectNullUndefined(n: number) {}

function passesNullVariable() {
  const n: number | null = null;
  // Fix: doesNotExpectNullUndefined(n!);
  doesNotExpectNullUndefined(n);
}

function passesUndefinedVariable() {
  const n: number | undefined = undefined;
  // Fix: doesNotExpectNullUndefined(n!);
  doesNotExpectNullUndefined(n);
}

// Test: Assign argument to null
// Fix: turnsIntoNull(n: number | null)
function turnsIntoNull(n: number) {
  n = null;
}

// Test: Assign non-null to null variable
function assignNonNullValueToNullVar() {
  // Fix: let n: null | number = null;
  let n: null = null;
  n = returnsNumber();
}

function returnsNumber() {
  return 5;
}

// Test: Add element to empty list
function addToEmptyList() {
  // Fix: const emptyList: number[] = [];
  const emptyList = [];
  emptyList.push(5);
}

// Test: Return null value but not in return type
function unexpectedlyReturnsNull(): number {
  const n: number | null = null;
  // Fix: return n!;
  return n;
}

// Test: Object is possibly null
function objectPossiblyNull(v: number | null) {
  // Fix: console.log(v!.toString());
  console.log(v.toString());

  // Fix: console.log('V: ' + (v != null ? v.toString() : 'unknown'));
  console.log('V: ' + v != null ? v.toString() : 'unknown');
}