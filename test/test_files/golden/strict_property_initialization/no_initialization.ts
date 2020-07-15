interface BasicInterface {}

class StrictPropertyInitializationComponent {
  // Test: Unassigned scalar property
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  private unAssignedScalar?: boolean;

  // Test: Unassigned nonscalar property: list
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  private unAssignedNonScalar?: [];

  // Test: Unassigned nonscalar property: interface
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  private unAssignedInterface?: BasicInterface;

  constructor() {
    // typescript-flag-upgrade automated fix: --strictNullChecks
    this.takesInBoolean(this.unAssignedScalar!);
  }

  ngOnInit(): void {}

  takesInBoolean(v: boolean) {}
}
