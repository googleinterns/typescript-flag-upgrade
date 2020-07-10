class StrictPropertyInitializationComponent {
  // Test: Unassigned scalar property
  // Fix: private unAssignedScalar: boolean | undefined;
  private unAssignedScalar: boolean;
  private unAssignedButUndefined: boolean | undefined;
  private assignedInDeclaration = true;
  private assignedInConstructor: boolean;

  // Test: Unassigned nonscalar property: list
  // Fix:   private unAssignedNonScalar: [] | undefined;
  private unAssignedNonScalar: [];

  // Test: Unassigned nonscalar property: interface
  // Fix: private unAssignedInterface: BasicInterface | undefined;
  private unAssignedInterface: BasicInterface;

  constructor() {
    this.assignedInConstructor = true;
    this.takesInBoolean(this.unAssignedScalar);
  }

  ngOnInit(): void {}

  // Fix: takesInBoolean(v: boolean | undefined) {}
  takesInBoolean(v: boolean) {}
}
