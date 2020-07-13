// Test: Returns with no value
function noValueReturnInIf(name: string) {
  if (name === 'Bob') {
    // Fix: return undefined;
    return;
  }
  return 'Hello Not-Bob';
}

function noExplitReturnUndefined(name: string) {
  if (name === 'Bob') {
    return 'Hello Bob';
  }
  // Fix: return undefined;
  return;
}
