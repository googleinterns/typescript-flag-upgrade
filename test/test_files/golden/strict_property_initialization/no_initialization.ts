interface BasicInterface {}

class StrictPropertyInitializationComponent {
  private assignedScalar: boolean = false;
  private assignedInConstructorScalar: boolean;

  // Test: Unassigned scalar property
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  private unAssignedScalar!: boolean;

  // Test: Unassigned nonscalar property: list
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  private unAssignedNonScalar!: [];
  private assignedNonScalar: [] = [];

  // Test: Unassigned nonscalar property: interface
  // typescript-flag-upgrade automated fix: --strictPropertyInitialization
  private unAssignedInterface!: BasicInterface;

  constructor() {
    this.assignedInConstructorScalar = false;
    this.takesInBoolean(this.unAssignedScalar);
  }

  ngOnInit(): void {}

  takesInBoolean(v: boolean) {}
}
