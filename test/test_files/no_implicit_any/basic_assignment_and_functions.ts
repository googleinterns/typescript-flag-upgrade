// Test: Assigns type based on assignment to literal
// Fix: callsTakeString(val: string) {
function assignsToStringLiteral(val) {
  val = '';
}

// Test: Assigns type based on assignment to expression
// Fix: assignsToStringExpression(val: string) {
function assignsToStringExpression(val) {
  val = returnsString();
}

function returnsString(): string {
  return '';
}

// Test: Assigns type based on multiple assignments
// Fix: assignsToNumAndString(val: number | string) {
function assignsToNumAndString(val) {
  val = '';
  val = 0;
}

// Test: Assigns type based on function call and assignment
// Fix: calledByNumAssignToString(val: number | string) {
function calledByNumAssignToString(val) {
  val = '';
}

calledByNumAssignToString(5);

// Test: Assigns type based on function calls
// Fix: calledByPassString(val: string) {
function calledByPassString(val) {}

// Test: Assigns type based on multiple function calls
// Fix: calledByPassNumAndPassString(val: number | string) {
function calledByPassNumAndPassString(val) {}

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
