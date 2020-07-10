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

// Test: Return null value but not in return type
function unexpectedlyReturnsNull(): number {
  const n: number | null = null;
  // Fix: return n!;
  return n;
}

// Test: Return expression that possibly evaluates to null
function returnExpression(): number {
  const n: number | null = null;
  if (true) {
    // Fix: return returnsPossiblyNull()!;
    return returnsPossiblyNull();
  } else {
    // Fix: return (n || returnsPossiblyNull())!;
    return n || returnsPossiblyNull();
  }
}

function returnsPossiblyNull(): number | null {
  return 0;
}
