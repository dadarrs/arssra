import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, effect, signal } from '@angular/core';

export type ThemeType = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public readonly theme = signal<ThemeType>('system');

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    try {
      const savedTheme = globalThis.localStorage?.getItem('theme-preference') as ThemeType;
      if (savedTheme) {
        this.theme.set(savedTheme);
      }
    } catch { /* empty */ }
    
    // Listen for OS theme changes
    try {
      const mediaQuery = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
      mediaQuery?.addEventListener('change', () => {
        if (this.theme() === 'system') {
          this.applyThemeToDocument('system');
        }
      });
    } catch { /* empty */ }

    // Create an effect to watch for user theme changes and update the document
    effect(() => {
      const currentTheme = this.theme();
      try {
        globalThis.localStorage?.setItem('theme-preference', currentTheme);
      } catch { /* empty */ }
      this.applyThemeToDocument(currentTheme);
    });
  }

  private applyThemeToDocument(theme: ThemeType) {
    try {
      const html = this.document.documentElement;
      const isSystemDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
      
      const isDark = theme === 'dark' || (theme === 'system' && isSystemDark);
      
      html.classList.toggle('dark-theme', isDark);
      html.classList.toggle('light-theme', !isDark);
      html.style.colorScheme = isDark ? 'dark' : 'light';
    } catch { /* empty */ }
  }

  setTheme(newTheme: ThemeType) {
    this.theme.set(newTheme);
  }
}
