// Test: Object is possibly null
function objectPossiblyNull(v: number | null) {
  console.log(v!.toString());

  // typescript-flag-upgrade automated fix: --strictNullChecks
  console.log('V: ' + v != null ? v!.toString() : 'unknown');
}

// Test: Object is possibly undefined
function objectPossiblyUndefined(v: number | undefined) {
  console.log(v!.toString());

  // typescript-flag-upgrade automated fix: --strictNullChecks
  console.log('V: ' + v != null ? v!.toString() : 'unknown');
}

// Test: Object is possibly null or undefined
function objectPossiblyNullUndefined(v: number | null | undefined) {
  console.log(v!.toString());

  // typescript-flag-upgrade automated fix: --strictNullChecks
  console.log('V: ' + v != null ? v!.toString() : 'unknown');
}
