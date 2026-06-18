import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <button
      pButton
      type="button"
      [icon]="currentTheme() === 'light' ? 'pi pi-moon' : 'pi pi-sun'"
      [title]="currentTheme() === 'light' ? 'Switch to dark theme' : 'Switch to light theme'"
      (click)="themeService.toggleTheme()"
      class="theme-toggle"
      [attr.aria-label]="currentTheme() === 'light' ? 'Switch to dark theme' : 'Switch to light theme'"
    ></button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .theme-toggle {
      width: 40px;
      height: 40px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border-light);
      border-radius: 6px;
      color: var(--color-text-primary);
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        background-color: var(--color-surface-hover);
        border-color: var(--color-border);
      }

      &:active {
        background-color: var(--color-surface-active);
      }

      ::ng-deep .pi {
        font-size: 18px;
      }
    }
  `,
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
  readonly currentTheme = this.themeService.currentTheme;
}
