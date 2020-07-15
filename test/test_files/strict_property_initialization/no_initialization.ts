interface BasicInterface {}

class StrictPropertyInitializationComponent {
  // Test: Unassigned scalar property
  // Fix: private unAssignedScalar?: boolean;
  private unAssignedScalar: boolean;

  // Test: Unassigned nonscalar property: list
  // Fix: private unAssignedNonScalar?: [];
  private unAssignedNonScalar: [];

  // Test: Unassigned nonscalar property: interface
  // Fix: private unAssignedInterface?: BasicInterface;
  private unAssignedInterface: BasicInterface;

  constructor() {
    // Fix: this.takesInBoolean(this.unAssignedScalar!);
    this.takesInBoolean(this.unAssignedScalar);
  }

  ngOnInit(): void {}

  takesInBoolean(v: boolean) {}
}
