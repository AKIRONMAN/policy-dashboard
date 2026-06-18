import { CommonModule, CurrencyPipe, DatePipe, LowerCasePipe, TitleCasePipe } from '@angular/common';
import { Component, input, output, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { TableModule, TablePageEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DEFAULT_PAGINATION, Pagination } from '../../../../shared/models/pagination.model';
import { DEFAULT_SORT, Sort } from '../../../../shared/models/sort.model';
import { Policy } from '../../../../shared/models/policy.model';
import { SortDirection } from '../../../../shared/models/policy.enums';
import {
  PolicyTablePageChangeEvent,
  PolicyTableSelectionChangeEvent,
  PolicyTableSortChangeEvent,
} from './policy-table.events';

@Component({
  selector: 'app-policy-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe, TableModule, TagModule, SkeletonModule, ProgressSpinnerModule, TitleCasePipe],
  templateUrl: './policy-table.component.html',
  styleUrl: './policy-table.component.scss',
})
export class PolicyTableComponent {
  readonly policies = input<readonly Policy[]>([]);
  readonly loading = input<boolean>(false);
  readonly pagination = input<Pagination>(DEFAULT_PAGINATION);
  readonly sort = input<Sort>(DEFAULT_SORT);

  readonly pageChange = output<PolicyTablePageChangeEvent>();
  readonly sortChange = output<PolicyTableSortChangeEvent>();
  readonly selectionChange = output<PolicyTableSelectionChangeEvent>();

  protected readonly skeletonRows = Array.from({ length: 10 });

  protected selectedPolicies: Policy[] = [];
  protected sortField = signal<string | null>(DEFAULT_SORT.field);
  protected sortOrder = signal<number>(DEFAULT_SORT.direction === SortDirection.Asc ? 1 : -1);

  constructor() {
    // Sync table with new data
    effect(() => {
      this.policies(); // Re-run effect when policies input changes
      this.selectedPolicies = []; // Clear selection on new data load
    });
    // Sync table sort UI with store sort state
    effect(() => {
      const currentSort = this.sort();
      this.sortField.set(currentSort.field);
      this.sortOrder.set(currentSort.direction === SortDirection.Asc ? 1 : -1);
    });

  }

  protected onPageChange(event: TablePageEvent): void {
    this.pageChange.emit({
      page: Math.floor(event.first / event.rows) + 1,
      pageSize: event.rows,
    });
  }

  protected onSortChange(event: { field: string; order: number }): void {
    this.sortChange.emit({
      field: event.field as PolicyTableSortChangeEvent['field'],
      direction: event.order >= 0 ? SortDirection.Asc : SortDirection.Desc,
    });
  }

  protected onSelectionChange(selection: Policy[]): void {
    this.selectionChange.emit(selection);
  }

  /**
   * TrackBy function for table rows to optimize rendering
   * Prevents full table re-render on data changes
   */
  protected trackByPolicyId(index: number, policy: Policy): string {
    return policy.id;
  }

  protected getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'pi-check-circle status-active',
      PENDING: 'pi-clock status-pending',
      EXPIRED: 'pi-times-circle status-expired',
      CANCELLED: 'pi-ban status-cancelled',
    };
    return map[status] || 'pi-question-circle';
  }
}
