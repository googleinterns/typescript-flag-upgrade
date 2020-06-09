import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'test-app';
  greetingA;
  greetingB;

  constructor() {
    this.greetingA = this.maybeHello('Alice');
    this.greetingB = this.maybeHello('Bob');
  }

  // Basic test: --noImplicitReturns
  maybeHello(name: string) {
    if (name === 'Bob') {
      return 'Hello';
    }
    return undefined;
  }

  // Basic test: --noImplicitAny
  sayHello(name) {
    return name;
  }
}
