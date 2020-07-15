interface BasicInterface {}

interface TestInterface {
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  unAssignedScalar?: boolean;
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  unAssignedNonScalar?: [];
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  unAssignedInterface?: BasicInterface;
}

class TestClass implements TestInterface {
  // Test: Inherited unassigned scalar property
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  unAssignedScalar?: boolean;
  // Test: Inherited unassigned nonscalar property: list
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  unAssignedNonScalar?: [];
  // Test: Inherited unassigned nonscalar property: interface
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  unAssignedInterface?: BasicInterface;
}
