import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, effect, signal } from '@angular/core';

export type ThemeType = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public readonly theme = signal<ThemeType>('system');

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    const savedTheme = localStorage.getItem('theme-preference') as ThemeType;
    if (savedTheme) {
      this.theme.set(savedTheme);
    }
    
    // Listen for OS theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this.theme() === 'system') {
        this.applyThemeToDocument('system');
      }
    });

    // Create an effect to watch for user theme changes and update the document
    effect(() => {
      const currentTheme = this.theme();
      localStorage.setItem('theme-preference', currentTheme);
      this.applyThemeToDocument(currentTheme);
    });
  }

  private applyThemeToDocument(theme: ThemeType) {
    const html = this.document.documentElement;
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const isDark = theme === 'dark' || (theme === 'system' && isSystemDark);
    
    html.classList.toggle('dark-theme', isDark);
    html.classList.toggle('light-theme', !isDark);
    html.style.colorScheme = isDark ? 'dark' : 'light';
  }

  setTheme(newTheme: ThemeType) {
    this.theme.set(newTheme);
  }
}
