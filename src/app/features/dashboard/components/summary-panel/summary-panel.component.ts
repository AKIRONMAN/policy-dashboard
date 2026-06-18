import { CommonModule, KeyValuePipe, LowerCasePipe, TitleCasePipe } from '@angular/common';
import { Component, input, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import {
  DEFAULT_POLICY_SUMMARY,
  PolicySummary,
} from '../../../../shared/models/policy-summary.model';
import { CompactCurrencyPipe } from '../../../../shared/pipes/compact-number.pipe';
import { LineOfBusiness } from '../../../../shared/models';
type SummaryKey = keyof PolicySummary;

@Component({
  selector: 'app-summary-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardModule, SkeletonModule, CompactCurrencyPipe, KeyValuePipe, TitleCasePipe, ButtonModule],
  templateUrl: './summary-panel.component.html',
  styleUrl: './summary-panel.component.scss',
})
export class SummaryPanelComponent implements OnInit {
  readonly summary = input<PolicySummary>(DEFAULT_POLICY_SUMMARY);
  readonly loading = input<boolean>(false);

  protected readonly isSummaryVisible = signal<boolean>(true);

  protected readonly skeletonPoliciesSlots = [1, 2, 3, 4, 5, 6] as const;
  protected readonly skeletonLobSlots = [1, 2, 3, 4, 5] as const;

  protected readonly metricSkeletonSlots = [0, 1, 2, 3, 4, 5] as const;

  protected readonly lobIcons: Record<string, string> = {
  [LineOfBusiness.Casualty]: 'pi-exclamation-triangle',
  [LineOfBusiness.AccidentHealth]: 'pi-heart',
  [LineOfBusiness.Marine]: 'pi-compass',
  [LineOfBusiness.Property]: 'pi-home'
};
protected readonly lobClass: Record<string, string> = {
  [LineOfBusiness.Casualty]: 'lob-casualty',
  [LineOfBusiness.AccidentHealth]: 'lob-health',
  [LineOfBusiness.Marine]: 'lob-marine',
  [LineOfBusiness.Property]: 'lob-property'
};

  ngOnInit(): void {
    const stored = localStorage.getItem('summaryVisible');
    if (stored !== null) {
      this.isSummaryVisible.set(stored === 'true');
    }
  }

  protected toggleSummary(): void {
    this.isSummaryVisible.update(value => !value);
    localStorage.setItem('summaryVisible', this.isSummaryVisible().toString());
  }

  protected readonly metrics: {
    key: SummaryKey;
    label: string;
    icon: string;
    class: string;
  }[]
    = [
      {
        key: 'activePolicies',
        label: 'Active',
        icon: 'pi-check-circle',
        class: 'metric-active'
      },
      {
        key: 'pendingPolicies',
        label: 'Pending',
        icon: 'pi-clock',
        class: 'metric-pending'
      },
      {
        key: 'expiredPolicies',
        label: 'Expired',
        icon: 'pi-calendar',
        class: 'metric-expired'
      },
      {
        key: 'cancelledPolicies',
        label: 'Cancelled',
        icon: 'pi-times-circle',
        class: 'metric-cancelled'
      },
      {
        key: 'flaggedForReview',
        label: 'Flagged',
        icon: 'pi-flag',
        class: 'metric-flagged'
      },
      {
        key: 'expiringSoonPolicies',
        label: 'Expiring (30d)',
        icon: 'pi-bell',
        class: 'metric-expiring'
      }
    ];
}
