import { Injectable, signal, effect } from '@angular/core';

export type ThemeName = 'light' | 'dark';

const THEME_STORAGE_KEY = 'app-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly currentTheme = signal<ThemeName>('light');

  constructor() {
    this.loadTheme();
    // Apply theme whenever it changes
    effect(() => {
      this.applyTheme(this.currentTheme());
    });
  }

  /**
   * Load theme from localStorage or system preference
   */
  private loadTheme(): void {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;

    if (storedTheme === 'light' || storedTheme === 'dark') {
      this.currentTheme.set(storedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.currentTheme.set(prefersDark ? 'dark' : 'light');
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const newTheme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.currentTheme.set(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }

  /**
   * Set a specific theme
   */
  setTheme(theme: ThemeName): void {
    this.currentTheme.set(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  /**
   * Apply theme to document by updating CSS variables
   */
  private applyTheme(theme: ThemeName): void {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
  }
}
