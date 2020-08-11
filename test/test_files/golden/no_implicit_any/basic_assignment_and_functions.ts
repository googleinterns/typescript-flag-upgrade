// Test: Assigns type based on assignment to literal
// typescript-flag-upgrade automated fix: --noImplicitAny
function assignsToStringLiteral(val: string) {
  val = '';
}

// Test: Assigns type based on assignment to expression
// typescript-flag-upgrade automated fix: --noImplicitAny
function assignsToStringExpression(val: string) {
  val = returnsString();
}

function returnsString(): string {
  return '';
}

// Test: Assigns type based on multiple assignments
// typescript-flag-upgrade automated fix: --noImplicitAny
function assignsToNumAndString(val: number | string) {
  val = '';
  val = 0;
}

// Test: Assigns type based on function call and assignment
// typescript-flag-upgrade automated fix: --noImplicitAny
function calledByNumAssignToString(val: number | string) {
  val = '';
}

calledByNumAssignToString(5);

// Test: Assigns type based on function calls
// typescript-flag-upgrade automated fix: --noImplicitAny
function calledByPassString(val: string) {}

// Test: Assigns type based on multiple function calls
// typescript-flag-upgrade automated fix: --noImplicitAny
function calledByPassNumAndPassString(val: string) {}

function passString(val: string) {
  calledByPassString(val);
  calledByPassNumAndPassString(val);
}

function passNum(val: string) {
  calledByPassNumAndPassString(val);
}

//Test: Prevents "any" pollution.
function passAnyValues(foo: any, bar: any[]) {
  calledByPassAnyValues(foo);
  calledByPassAnyValues(bar);
}

function calledByPassAnyValues(foo) {}
