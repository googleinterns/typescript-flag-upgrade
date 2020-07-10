function noValueReturnInIf(name: string) {
    if (name === 'Bob') {
      return;
    }
    return 'Hello Not-Bob';
  }
  
  function noExplitReturnUndefined(name: string) {
    if (name === 'Bob') {
      return 'Hello Bob';
    }
    return;
  }
  