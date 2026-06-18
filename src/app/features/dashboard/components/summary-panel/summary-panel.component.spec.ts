import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SummaryPanelComponent } from './summary-panel.component';
import { DEFAULT_POLICY_SUMMARY, PolicySummary } from '../../../../shared/models/policy-summary.model';
import { Currency } from '../../../../shared/models/policy.enums';
import { ComponentRef } from '@angular/core';

const MOCK_SUMMARY: PolicySummary = {
  totalPolicies: 210,
  activePolicies: 105,
  pendingPolicies: 42,
  expiredPolicies: 40,
  cancelledPolicies: 23,
  flaggedForReview: 42,
  expiringSoonPolicies: 7,
  totalPremium: 14500000,
  currency: Currency.USD,
  lobPremiumMap: {
    PROPERTY: 4800000,
    CASUALTY: 3900000,
    MARINE: 3600000,
    'A&H': 2200000,
  },
};

describe('SummaryPanelComponent', () => {
  let fixture: ComponentFixture<SummaryPanelComponent>;
  let component: SummaryPanelComponent;
  let componentRef: ComponentRef<SummaryPanelComponent>;

  beforeEach(async () => {
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');

    await TestBed.configureTestingModule({
      imports: [SummaryPanelComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryPanelComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should accept summary input', () => {
      componentRef.setInput('summary', MOCK_SUMMARY);
      fixture.detectChanges();
      expect(component.summary()).toEqual(MOCK_SUMMARY);
    });

    it('should default summary to DEFAULT_POLICY_SUMMARY', () => {
      fixture.detectChanges();
      expect(component.summary()).toEqual(DEFAULT_POLICY_SUMMARY);
    });

    it('should accept loading input as true', () => {
      componentRef.setInput('loading', true);
      fixture.detectChanges();
      expect(component.loading()).toBe(true);
    });

    it('should default loading to false', () => {
      fixture.detectChanges();
      expect(component.loading()).toBe(false);
    });
  });

  describe('metrics config', () => {
    it('should define 6 metric cards', () => {
      fixture.detectChanges();
      expect((component as any).metrics.length).toBe(6);
    });

    it('should include activePolicies metric', () => {
      fixture.detectChanges();
      const metrics = (component as any).metrics;
      expect(metrics.some((m: any) => m.key === 'activePolicies')).toBeTrue();
    });

    it('should include flaggedForReview metric', () => {
      fixture.detectChanges();
      const metrics = (component as any).metrics;
      expect(metrics.some((m: any) => m.key === 'flaggedForReview')).toBeTrue();
    });

    it('should include expiringSoonPolicies metric', () => {
      fixture.detectChanges();
      const metrics = (component as any).metrics;
      expect(metrics.some((m: any) => m.key === 'expiringSoonPolicies')).toBeTrue();
    });
  });

  describe('toggleSummary', () => {
    it('should toggle isSummaryVisible from true to false', () => {
      fixture.detectChanges();
      const initialValue = (component as any).isSummaryVisible();
      (component as any).toggleSummary();
      expect((component as any).isSummaryVisible()).toBe(!initialValue);
    });

    it('should persist the toggle state to localStorage', () => {
      fixture.detectChanges();
      (component as any).toggleSummary();
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('ngOnInit — localStorage hydration', () => {
    it('should set isSummaryVisible to false when localStorage has "false"', async () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('false');
      fixture.detectChanges();
      component.ngOnInit();
      expect((component as any).isSummaryVisible()).toBe(false);
    });

    it('should set isSummaryVisible to true when localStorage has "true"', async () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('true');
      fixture.detectChanges();
      component.ngOnInit();
      expect((component as any).isSummaryVisible()).toBe(true);
    });
  });

  describe('skeleton slots', () => {
    it('should define 6 skeleton policy slots', () => {
      fixture.detectChanges();
      expect((component as any).skeletonPoliciesSlots.length).toBe(6);
    });
  });
});
