// Test: No return at end of function
function noEndValueReturn(name: string) {
  if (name === 'Bob') {
    return 'Hello Bob';
  }
  // Fix: return undefined;
}
