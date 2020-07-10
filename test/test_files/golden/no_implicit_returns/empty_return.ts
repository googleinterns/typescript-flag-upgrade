function noValueReturnInIf(name: string) {
  if (name === 'Bob') {
      // typescript-flag-upgrade automated fix: --noImplicitReturns
      return undefined;
  }
  return 'Hello Not-Bob';
}

function noExplitReturnUndefined(name: string) {
  if (name === 'Bob') {
    return 'Hello Bob';
  }
    // typescript-flag-upgrade automated fix: --noImplicitReturns
    return undefined;
}
