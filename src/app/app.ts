import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccessibilityWidgetComponent } from './shared/accessibility-widget/accessibility-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AccessibilityWidgetComponent],
  template: '<router-outlet></router-outlet><app-accessibility-widget></app-accessibility-widget>'
})
export class App {}
