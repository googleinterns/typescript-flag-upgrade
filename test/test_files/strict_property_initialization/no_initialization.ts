interface BasicInterface {}

class StrictPropertyInitializationComponent {
  private assignedScalar: boolean = false;
  private assignedInConstructorScalar: boolean;

  // Test: Unassigned scalar property
  // Fix: private unAssignedScalar!: boolean;
  private unAssignedScalar: boolean;

  // Test: Unassigned nonscalar property: list
  // Fix: private unAssignedNonScalar!: [];
  private unAssignedNonScalar: [];
  private assignedNonScalar: [] = [];

  // Test: Unassigned nonscalar property: interface
  // Fix: private unAssignedInterface!: BasicInterface;
  private unAssignedInterface: BasicInterface;

  constructor() {
    this.assignedInConstructorScalar = false;
    this.takesInBoolean(this.unAssignedScalar);
  }

  ngOnInit(): void {}

  takesInBoolean(v: boolean) {}
}
