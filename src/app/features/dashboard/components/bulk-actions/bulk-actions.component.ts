import { Component, DestroyRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { selectSelectedPolicyIds, selectLoading } from '../../../../state/policy/policy.selectors';
import { updateBulkFlag, clearSelection } from '../../../../state/policy/policy.actions';
import { Observable } from 'rxjs';
import { pairwise, filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-bulk-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, ToastModule],
  providers: [MessageService],
  template: `
    <div class="bulk-actions-container">
      <p-toast />
      <div class="actions">
        <button
          pButton
          type="button"
          label="Flag Selected for Review"
          icon="pi pi-flag"
          [disabled]="(loading$ | async) || (selectedPolicyIds$ | async)?.length === 0"
          [loading]="(loading$ | async) ?? false"
          [attr.aria-label]="'Flag ' + ((selectedPolicyIds$ | async)?.length || 0) + ' selected policies for review'"
          (click)="onFlagSelected()"
          class="p-button-warning"
        ></button>
        <button
          pButton
          type="button"
          label="Unflag Selected"
          icon="pi pi-times"
          [disabled]="(loading$ | async) || (selectedPolicyIds$ | async)?.length === 0"
          [loading]="(loading$ | async) ?? false"
          [attr.aria-label]="'Unflag ' + ((selectedPolicyIds$ | async)?.length || 0) + ' selected policies'"
          (click)="onUnflagSelected()"
          class="p-button-info"
        ></button>
        <span class="selection-count" aria-live="polite">
          {{ (selectedPolicyIds$ | async)?.length || 0 }} selected
        </span>
      </div>
    </div>
  `,
  styleUrl: './bulk-actions.component.scss',
})
export class BulkActionsComponent {
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);

  readonly selectedPolicyIds$: Observable<readonly string[]> = this.store.select(selectSelectedPolicyIds);
  readonly loading$: Observable<boolean> = this.store.select(selectLoading);

  private pendingFlagCount = signal<number>(0);

  constructor() {
    // Watch for loading state transitions: when action completes (loading: true -> false)
    this.loading$
      .pipe(
        pairwise(), // Get [previous, current] values
        filter(([wasLoading, isLoading]) => wasLoading && !isLoading), // Detect: true -> false
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        // Action completed, show toast and clear selection
        const count = this.pendingFlagCount();
        if (count > 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${count} policies updated`,
            life: 3000,
          });
          this.clearSelection();
          this.pendingFlagCount.set(0);

          // Focus management: move focus to search input so it doesn't get lost
          setTimeout(() => {
            const searchInput = document.getElementById('policy-search');
            if (searchInput) {
              searchInput.focus();
            }
          }, 100);
        }
      });
  }

  onFlagSelected(): void {
    this.selectedPolicyIds$
      .pipe(take(1))
      .subscribe((selectedIds) => {
        if (selectedIds.length > 0) {
          // Store count for toast after action completes
          this.pendingFlagCount.set(selectedIds.length);
          // Dispatch action - effect will handle API call and reload
          this.store.dispatch(
            updateBulkFlag({ policyIds: Array.from(selectedIds), flagStatus: true })
          );
        }
      });
  }

  onUnflagSelected(): void {
    this.selectedPolicyIds$
      .pipe(take(1))
      .subscribe((selectedIds) => {
        if (selectedIds.length > 0) {
          // Store count for toast after action completes
          this.pendingFlagCount.set(selectedIds.length);
          // Dispatch action - effect will handle API call and reload
          this.store.dispatch(
            updateBulkFlag({ policyIds: Array.from(selectedIds), flagStatus: false })
          );
        }
      });
  }

  private clearSelection(): void {
    this.store.dispatch(clearSelection());
  }
}

