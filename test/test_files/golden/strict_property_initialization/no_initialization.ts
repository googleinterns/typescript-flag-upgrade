interface BasicInterface {}

class StrictPropertyInitializationComponent {
  // Test: Unassigned scalar property
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  private unAssignedScalar!: boolean;
  private assignedScalar: boolean = false;

  // Test: Unassigned nonscalar property: list
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  private unAssignedNonScalar!: [];
  private assignedNonScalar: [] = [];

  // Test: Unassigned nonscalar property: interface
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  private unAssignedInterface!: BasicInterface;

  constructor() {
    this.takesInBoolean(this.unAssignedScalar);
  }

  ngOnInit(): void {}

  takesInBoolean(v: boolean) {}
}
