interface BasicInterface {}
// typescript-flag-upgrade automated fix: --strictNullChecks

class StrictNullChecksSample {
  // Test: Assign class member to null/undefined
  // Fix: shouldBeNumber: number | null;
  shouldBeNumber: null | number;
  // Fix: shouldBeInterface: BasicInterface | undefined;
  shouldBeInterface: BasicInterface | undefined;

  constructor() {
    this.shouldBeNumber = null;
    this.shouldBeInterface = undefined;
  }
}

// Test: Assign variable to null
function assignNull() {
  // Fix: let n: number | null = 0;
    // typescript-flag-upgrade automated fix: --strictNullChecks
  let n: null | number = 0;
  n = null;
  n = 5;
}

// Test: Assign variable to undefined
function assignUndefined() {
  // Fix: let n: number | undefined = 0;
    // typescript-flag-upgrade automated fix: --strictNullChecks
  let n: number | undefined = 0;
  n = undefined;
  n = 5;
}

// Test: Assign variable to null and undefined
function assignNullAndUndefined() {
  // Fix: let n: number | null | undefined = 0;
    // typescript-flag-upgrade automated fix: --strictNullChecks
  let n: null | number | undefined = 0;
  n = null;
  n = 5;
  n = undefined;
  n = 7;
}

// Test: Assign variable to null in conditional branch
function assignInBranch(goInBranch: boolean) {
  // Fix: let n: number | null = 0;
    // typescript-flag-upgrade automated fix: --strictNullChecks
  let n: null | number = 0;
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
    // typescript-flag-upgrade automated fix: --strictNullChecks
  doesNotExpectNull(n!);
}

// Test: Pass null and undefined value to function
function doesNotExpectNullUndefined(n: number) {}

function passesNullVariable() {
  const n: number | null = null;
  // Fix: doesNotExpectNullUndefined(n!);
    // typescript-flag-upgrade automated fix: --strictNullChecks
  doesNotExpectNullUndefined(n!);
}

function passesUndefinedVariable() {
  const n: number | undefined = undefined;
  // Fix: doesNotExpectNullUndefined(n!);
    // typescript-flag-upgrade automated fix: --strictNullChecks
  doesNotExpectNullUndefined(n!);
}

// Test: Assign argument to null
// Fix: turnsIntoNull(n: number | null)
// typescript-flag-upgrade automated fix: --strictNullChecks
function turnsIntoNull(n: null | number) {
  n = null;
}

// Test: Assign non-null to null variable
function assignNonNullValueToNullVar() {
  // Fix: let n: null | number = null;
    // typescript-flag-upgrade automated fix: --strictNullChecks
  let n: null | number = null;
  n = returnsNumber();
}

function returnsNumber() {
  return 5;
}

// Test: Add element to empty list
function addToEmptyList() {
  // Fix: const emptyList: number[] = [];
  const emptyList: any[] = [];
    // typescript-flag-upgrade automated fix: --strictNullChecks
  emptyList.push(5!);
}

// Test: Return null value but not in return type
function unexpectedlyReturnsNull(): number {
  const n: number | null = null;
  // Fix: return n!;
    // typescript-flag-upgrade automated fix: --strictNullChecks
  return (n)!
}

// Test: Return expression that possibly evaluates to null
function returnExpression(): number {
  const n: number | null = null;
  if (true) {
    // Fix: return returnsPossiblyNull()!;
      // typescript-flag-upgrade automated fix: --strictNullChecks
    return (returnsPossiblyNull())!
  } else {
    // Fix: return (n || returnsPossiblyNull())!;
      // typescript-flag-upgrade automated fix: --strictNullChecks
    return (n || returnsPossiblyNull())!
  }
}

function returnsPossiblyNull(): number | null {
  return 0;
}

// Test: Object is possibly null
function objectPossiblyNull(v: number | null) {
  // Fix: console.log(v!.toString());
  console.log(v!.toString());

  // Fix: console.log('V: ' + (v != null ? v.toString() : 'unknown'));
    // typescript-flag-upgrade automated fix: --strictNullChecks
  console.log('V: ' + v != null ? v!.toString() : 'unknown');
}

// Test: Object is possibly undefined
function objectPossiblyUndefined(v: number | undefined) {
  // Fix: console.log(v!.toString());
  console.log(v!.toString());

  // Fix: console.log('V: ' + (v != null ? v.toString() : 'unknown'));
    // typescript-flag-upgrade automated fix: --strictNullChecks
  console.log('V: ' + v != null ? v!.toString() : 'unknown');
}

// Test: Object is possibly null or undefined
function objectPossiblyNullUndefined(v: number | null | undefined) {
  // Fix: console.log(v!.toString());
  console.log(v!.toString());

  // Fix: console.log('V: ' + (v != null ? v.toString() : 'unknown'));
    // typescript-flag-upgrade automated fix: --strictNullChecks
  console.log('V: ' + v != null ? v!.toString() : 'unknown');
}
