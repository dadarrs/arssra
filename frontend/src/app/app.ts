import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    DashboardComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  constructor(public readonly themeService: ThemeService) {}

  toggleTheme() {
    const current = this.themeService.theme();
    if (current === 'system') {
      this.themeService.setTheme('dark');
    } else if (current === 'dark') {
      this.themeService.setTheme('light');
    } else {
      this.themeService.setTheme('system');
    }
  }

  getThemeIcon(): string {
    const theme = this.themeService.theme();
    if (theme === 'dark') return 'dark_mode';
    if (theme === 'light') return 'light_mode';
    return 'brightness_auto';
  }
}
