import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app_routing_module';
import { TestNoImplicitReturnsComponent } from './test-no-implicit-returns/test_no_implicit_returns_component';
import { TestStrictNullChecksComponent } from './test-strict-null-checks/test_strict_null_checks_component';
import { TestStrictPropertyInitializationComponent } from './test-strict-property-initialization/test_strict_property_initialization_component';
import { TestNoImplicitAnyComponent } from './test-no-implicit-any/test_no_implicit_any_component';

@Component({
  selector: 'app-root',
  templateUrl: './app_component.html',
})
export class AppComponent {
  title = 'test_app';
}

@NgModule({
  declarations: [
    AppComponent,
    TestNoImplicitReturnsComponent,
    TestStrictNullChecksComponent,
    TestStrictPropertyInitializationComponent,
    TestNoImplicitAnyComponent,
  ],
  imports: [BrowserModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
