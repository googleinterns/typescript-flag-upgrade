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

// Test: Add element to empty list
function addToEmptyList() {
  // Fix: const emptyList: any[] = [];
  const emptyList = [];
  emptyList.push(5);
}
