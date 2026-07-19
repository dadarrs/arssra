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
    
    // Create an effect to watch for theme changes and update the document
    effect(() => {
      const currentTheme = this.theme();
      localStorage.setItem('theme-preference', currentTheme);
      
      const html = this.document.documentElement;
      if (currentTheme === 'system') {
        html.style.colorScheme = 'light dark';
        html.classList.remove('dark-theme', 'light-theme');
      } else {
        html.style.colorScheme = currentTheme;
        html.classList.toggle('dark-theme', currentTheme === 'dark');
        html.classList.toggle('light-theme', currentTheme === 'light');
      }
    });
  }

  setTheme(newTheme: ThemeType) {
    this.theme.set(newTheme);
  }
}
