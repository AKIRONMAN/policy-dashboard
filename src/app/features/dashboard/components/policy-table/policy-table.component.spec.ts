import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PolicyTableComponent } from './policy-table.component';
import { DEFAULT_PAGINATION } from '../../../../shared/models/pagination.model';
import { DEFAULT_SORT } from '../../../../shared/models/sort.model';
import { PolicyStatus, Region, LineOfBusiness, Currency, PolicySortField, SortDirection } from '../../../../shared/models/policy.enums';
import { Policy } from '../../../../shared/models/policy.model';
import { ComponentRef } from '@angular/core';

const MOCK_POLICY: Policy = {
  id: 'pol-001',
  policyNumber: 'POL-2025-001',
  policyholderName: 'Tanaka Corp',
  status: PolicyStatus.Active,
  region: Region.Japan,
  premiumAmount: 50000,
  effectiveDate: '2025-01-01',
  expiryDate: '2026-01-01',
  lineOfBusiness: LineOfBusiness.Property,
  underwriter: 'Alice Wang',
  flaggedForReview: false,
  currency: Currency.JPY,
};

const MOCK_POLICY_FLAGGED: Policy = {
  ...MOCK_POLICY,
  id: 'pol-002',
  flaggedForReview: true,
};

describe('PolicyTableComponent', () => {
  let fixture: ComponentFixture<PolicyTableComponent>;
  let component: PolicyTableComponent;
  let componentRef: ComponentRef<PolicyTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyTableComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyTableComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should accept policies input and render them', () => {
      componentRef.setInput('policies', [MOCK_POLICY]);
      componentRef.setInput('loading', false);
      componentRef.setInput('pagination', DEFAULT_PAGINATION);
      componentRef.setInput('sort', DEFAULT_SORT);
      fixture.detectChanges();
      expect(component.policies()).toEqual([MOCK_POLICY]);
    });

    it('should default to empty policies array', () => {
      fixture.detectChanges();
      expect(component.policies()).toEqual([]);
    });

    it('should default loading to false', () => {
      fixture.detectChanges();
      expect(component.loading()).toBe(false);
    });

    it('should default sort to DEFAULT_SORT', () => {
      fixture.detectChanges();
      expect(component.sort()).toEqual(DEFAULT_SORT);
    });
  });

  describe('getStatusIcon', () => {
    it('should return check-circle class for ACTIVE status', () => {
      const icon = (component as any).getStatusIcon('ACTIVE');
      expect(icon).toContain('pi-check-circle');
      expect(icon).toContain('status-active');
    });

    it('should return clock class for PENDING status', () => {
      const icon = (component as any).getStatusIcon('PENDING');
      expect(icon).toContain('pi-clock');
      expect(icon).toContain('status-pending');
    });

    it('should return times-circle class for EXPIRED status', () => {
      const icon = (component as any).getStatusIcon('EXPIRED');
      expect(icon).toContain('pi-times-circle');
      expect(icon).toContain('status-expired');
    });

    it('should return ban class for CANCELLED status', () => {
      const icon = (component as any).getStatusIcon('CANCELLED');
      expect(icon).toContain('pi-ban');
      expect(icon).toContain('status-cancelled');
    });

    it('should return question-circle class for unknown status', () => {
      const icon = (component as any).getStatusIcon('UNKNOWN');
      expect(icon).toContain('pi-question-circle');
    });
  });

  describe('trackByPolicyId', () => {
    it('should return the policy id', () => {
      const id = (component as any).trackByPolicyId(0, MOCK_POLICY);
      expect(id).toBe('pol-001');
    });
  });

  describe('outputs', () => {
    it('should emit pageChange when onPageChange is called', () => {
      let emitted: any;
      component.pageChange.subscribe((e: any) => emitted = e);
      (component as any).onPageChange({ first: 25, rows: 25 });
      expect(emitted).toEqual({ page: 2, pageSize: 25 });
    });

    it('should emit page 1 for first: 0', () => {
      let emitted: any;
      component.pageChange.subscribe((e: any) => emitted = e);
      (component as any).onPageChange({ first: 0, rows: 25 });
      expect(emitted.page).toBe(1);
    });

    it('should emit sortChange with correct direction for ascending sort', () => {
      let emitted: any;
      component.sortChange.subscribe((e: any) => emitted = e);
      (component as any).onSortChange({ field: 'premiumAmount', order: 1 });
      expect(emitted.field).toBe('premiumAmount');
      expect(emitted.direction).toBe(SortDirection.Asc);
    });

    it('should emit sortChange with DESC direction for negative order', () => {
      let emitted: any;
      component.sortChange.subscribe((e: any) => emitted = e);
      (component as any).onSortChange({ field: 'premiumAmount', order: -1 });
      expect(emitted.direction).toBe(SortDirection.Desc);
    });

    it('should emit selectionChange when onSelectionChange is called', () => {
      let emitted: any;
      component.selectionChange.subscribe((e: any) => emitted = e);
      (component as any).onSelectionChange([MOCK_POLICY]);
      expect(emitted).toEqual([MOCK_POLICY]);
    });
  });

  describe('skeleton rows', () => {
    it('should have 10 skeleton rows', () => {
      expect((component as any).skeletonRows.length).toBe(10);
    });
  });

  describe('selection clearing', () => {
    it('should clear selectedPolicies when policies input changes', () => {
      componentRef.setInput('policies', [MOCK_POLICY]);
      fixture.detectChanges();
      (component as any).selectedPolicies = [MOCK_POLICY];

      componentRef.setInput('policies', [MOCK_POLICY_FLAGGED]);
      fixture.detectChanges();

      expect((component as any).selectedPolicies).toEqual([]);
    });
  });
});
