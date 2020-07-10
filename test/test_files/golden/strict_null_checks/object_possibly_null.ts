// Test: Object is possibly null
function objectPossiblyNull(v: number | null) {
  // Fix: console.log(v!.toString());
  console.log(v!.toString());

  // Fix: console.log('V: ' + (v != null ? v.toString() : 'unknown'));
    // typescript-flag-upgrade automated fix: --strictNullChecks
  console.log('V: ' + v != null ? v!.toString() : 'unknown');
}

// Test: Object is possibly undefined
function objectPossiblyUndefined(v: number | undefined) {
  // Fix: console.log(v!.toString());
  console.log(v!.toString());

  // Fix: console.log('V: ' + (v != null ? v.toString() : 'unknown'));
    // typescript-flag-upgrade automated fix: --strictNullChecks
  console.log('V: ' + v != null ? v!.toString() : 'unknown');
}

// Test: Object is possibly null or undefined
function objectPossiblyNullUndefined(v: number | null | undefined) {
  // Fix: console.log(v!.toString());
  console.log(v!.toString());

  // Fix: console.log('V: ' + (v != null ? v.toString() : 'unknown'));
    // typescript-flag-upgrade automated fix: --strictNullChecks
  console.log('V: ' + v != null ? v!.toString() : 'unknown');
}
