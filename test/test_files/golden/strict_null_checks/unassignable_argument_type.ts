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

// Test: Add element to empty list
function addToEmptyList() {
  // Fix: const emptyList: number[] = [];
  const emptyList: any[] = [];
    // typescript-flag-upgrade automated fix: --strictNullChecks
  emptyList.push(5!);
}
