// Test: Pass null value to function
function doesNotExpectNull(n: number) {}

function passesNullValue() {
  const n: number | null = null;
  // typescript-flag-upgrade automated fix: --strictNullChecks
  doesNotExpectNull(n!);
}

// Test: Pass null and undefined value to function
function doesNotExpectNullUndefined(n: number) {}

function passesNullVariable() {
  const n: number | null = null;
  // typescript-flag-upgrade automated fix: --strictNullChecks
  doesNotExpectNullUndefined(n!);
}

function passesUndefinedVariable() {
  const n: number | undefined = undefined;
  // typescript-flag-upgrade automated fix: --strictNullChecks
  doesNotExpectNullUndefined(n!);
}

// Test: Add element to empty list
function addToEmptyList() {
  // typescript-flag-upgrade automated fix: --strictNullChecks
  const emptyList = [];
  emptyList.push(5);
}

// Test: No overload matches
function noOverloadMatches(n: number | undefined) {
  // typescript-flag-upgrade automated fix: --strictNullChecks
  new Date(n!);
}
