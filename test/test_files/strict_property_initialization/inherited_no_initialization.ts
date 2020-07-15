interface BasicInterface {}

interface TestInterface {
  // Fix: unAssignedScalar?: boolean;
  unAssignedScalar: boolean;
  // Fix: unAssignedNonScalar?: [];
  unAssignedNonScalar: [];
  // Fix: unAssignedInterface?: BasicInterface;
  unAssignedInterface: BasicInterface;
}

class TestClass implements TestInterface {
  // Test: Inherited unassigned scalar property
  // Fix: unAssignedScalar?: boolean;
  unAssignedScalar: boolean;
  // Test: Inherited unassigned nonscalar property: list
  // Fix: unAssignedNonScalar?: [];
  unAssignedNonScalar: [];
  // Test: Inherited unassigned nonscalar property: interface
  // Fix: unAssignedInterface?: BasicInterface;
  unAssignedInterface: BasicInterface;
}
