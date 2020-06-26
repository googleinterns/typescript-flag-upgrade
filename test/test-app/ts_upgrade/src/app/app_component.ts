import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app_routing_module';
import { NoImplicitReturnsComponent } from './no-implicit-returns/no_implicit_returns_component';
import { StrictNullChecksComponent } from './strict-null-checks/strict_null_checks_component';
import { StrictPropertyInitializationComponent } from './strict-property-initialization/strict_property_initialization_component';
import { NoImplicitAnyComponent } from './no-implicit-any/no_implicit_any_component';

/**
 * Base component
 */
@Component({
  selector: 'app-root',
  templateUrl: './app_component.html',
})
export class AppComponent {
  title = 'test_app';
}

/**
 * Base module
 */
@NgModule({
  declarations: [
    AppComponent,
    NoImplicitReturnsComponent,
    StrictNullChecksComponent,
    StrictPropertyInitializationComponent,
    NoImplicitAnyComponent,
  ],
  imports: [BrowserModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
