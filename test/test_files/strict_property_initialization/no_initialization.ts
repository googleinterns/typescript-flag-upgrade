interface BasicInterface {}

class StrictPropertyInitializationComponent {
  // Test: Unassigned scalar property
  // Fix: private unAssignedScalar!: boolean;
  private unAssignedScalar: boolean;
  private assignedScalar: boolean = false;

  // Test: Unassigned nonscalar property: list
  // Fix: private unAssignedNonScalar!: [];
  private unAssignedNonScalar: [];
  private assignedNonScalar: [] = [];

  // Test: Unassigned nonscalar property: interface
  // Fix: private unAssignedInterface!: BasicInterface;
  private unAssignedInterface: BasicInterface;

  constructor() {
    this.takesInBoolean(this.unAssignedScalar);
  }

  ngOnInit(): void {}

  takesInBoolean(v: boolean) {}
}
