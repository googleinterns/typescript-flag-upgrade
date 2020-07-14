// Test: No return at end of function
function noEndValueReturn(name: string) {
  if (name === 'Bob') {
    return 'Hello Bob';
  }
  // typescript-flag-upgrade automated fix: --noImplicitReturns
  return undefined;
}
