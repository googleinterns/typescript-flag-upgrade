interface BasicInterface {}

class StrictNullChecksSample {
  // Test: Assign class member to null/undefined
  // typescript-flag-upgrade automated fix: --strictNullChecks
  shouldBeNumber: null | number;
  // typescript-flag-upgrade automated fix: --strictNullChecks
  shouldBeInterface: BasicInterface | undefined;

  constructor() {
    this.shouldBeNumber = null;
    this.shouldBeInterface = undefined;
  }
}

// Test: Assign variable to null
function assignNull() {
  // typescript-flag-upgrade automated fix: --strictNullChecks
  let n: null | number = 0;
  n = null;
  n = 5;
}

// Test: Assign variable to undefined
function assignUndefined() {
  // typescript-flag-upgrade automated fix: --strictNullChecks
  let n: number | undefined = 0;
  n = undefined;
  n = 5;
}

// Test: Assign variable to null and undefined
function assignNullAndUndefined() {
  // typescript-flag-upgrade automated fix: --strictNullChecks
  let n: null | number | undefined = 0;
  n = null;
  n = 5;
  n = undefined;
  n = 7;
}

// Test: Assign variable to null in conditional branch
function assignInBranch(goInBranch: boolean) {
  // typescript-flag-upgrade automated fix: --strictNullChecks
  let n: null | number = 0;
  if (goInBranch) {
    n = null;
  }
  n = 5;
}

// Test: Assign argument to null
// typescript-flag-upgrade automated fix: --strictNullChecks
function turnsIntoNull(n: null | number) {
  n = null;
}

// Test: Assign non-null to null variable
function assignNonNullValueToNullVar() {
  // typescript-flag-upgrade automated fix: --strictNullChecks
  let n: null | number = null;
  n = returnsNumber();
}

function returnsNumber() {
  return 5;
}

// Test: Return null value but not in return type
function unexpectedlyReturnsNull(): number {
  const n: number | null = null;
  // typescript-flag-upgrade automated fix: --strictNullChecks
  return (n)!;
}

// Test: Return expression that possibly evaluates to null
function returnExpression(): number {
  const n: number | null = null;
  if (true) {
    // typescript-flag-upgrade automated fix: --strictNullChecks
    return (returnsPossiblyNull())!;
  } else {
    // typescript-flag-upgrade automated fix: --strictNullChecks
    return (n || returnsPossiblyNull())!;
  }
}

function returnsPossiblyNull(): number | null {
  return 0;
}
