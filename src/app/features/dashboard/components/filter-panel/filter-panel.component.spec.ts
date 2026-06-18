import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FilterPanelComponent } from './filter-panel.component';
import { DEFAULT_POLICY_FILTERS, PolicyFilters } from '../../../../shared/models/policy-filters.model';
import { PolicyStatus, Region, LineOfBusiness } from '../../../../shared/models/policy.enums';
import { ComponentRef } from '@angular/core';

describe('FilterPanelComponent', () => {
  let fixture: ComponentFixture<FilterPanelComponent>;
  let component: FilterPanelComponent;
  let componentRef: ComponentRef<FilterPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterPanelComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterPanelComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    it('should create the form with all expected controls', () => {
      const form = (component as any).form;
      expect(form.get('search')).toBeTruthy();
      expect(form.get('statuses')).toBeTruthy();
      expect(form.get('linesOfBusiness')).toBeTruthy();
      expect(form.get('regions')).toBeTruthy();
      expect(form.get('effectiveDateRange')).toBeTruthy();
    });

    it('should initialize with empty search', () => {
      expect((component as any).form.get('search').value).toBe('');
    });

    it('should initialize with empty statuses array', () => {
      expect((component as any).form.get('statuses').value).toEqual([]);
    });
  });

  describe('hasFiltersApplied', () => {
    it('should be false with default filters', () => {
      expect(component.hasFiltersApplied()).toBe(false);
    });

    it('should be true when search is non-empty', () => {
      componentRef.setInput('filters', { ...DEFAULT_POLICY_FILTERS, search: 'tanaka' });
      fixture.detectChanges();
      expect(component.hasFiltersApplied()).toBe(true);
    });

    it('should be true when statuses are selected', () => {
      componentRef.setInput('filters', { ...DEFAULT_POLICY_FILTERS, statuses: [PolicyStatus.Active] });
      fixture.detectChanges();
      expect(component.hasFiltersApplied()).toBe(true);
    });

    it('should be true when regions are selected', () => {
      componentRef.setInput('filters', { ...DEFAULT_POLICY_FILTERS, regions: [Region.Singapore] });
      fixture.detectChanges();
      expect(component.hasFiltersApplied()).toBe(true);
    });

    it('should be true when effectiveDateFrom is set', () => {
      componentRef.setInput('filters', { ...DEFAULT_POLICY_FILTERS, effectiveDateFrom: '2025-01-01' as const });
      fixture.detectChanges();
      expect(component.hasFiltersApplied()).toBe(true);
    });
  });

  describe('filter options', () => {
    it('should expose POLICY_STATUS_OPTIONS', () => {
      expect((component as any).statusOptions.length).toBeGreaterThan(0);
    });

    it('should expose REGION_OPTIONS including APAC regions', () => {
      const regionValues = (component as any).regionOptions.map((o: any) => o.value);
      expect(regionValues).toContain(Region.Singapore);
      expect(regionValues).toContain(Region.Japan);
    });

    it('should expose LINE_OF_BUSINESS_OPTIONS', () => {
      expect((component as any).lineOfBusinessOptions.length).toBeGreaterThan(0);
    });
  });

  describe('emitFilters', () => {
    it('should emit filtersChange with the current form values', () => {
      let emitted: PolicyFilters | undefined;
      component.filtersChange.subscribe((f: PolicyFilters) => emitted = f);

      (component as any).form.patchValue({ search: 'acme' });
      (component as any).emitFilters();

      expect(emitted).toBeDefined();
      expect(emitted!.search).toBe('acme');
    });

    it('should map date range to effectiveDateFrom / effectiveDateTo ISO strings', () => {
      let emitted: PolicyFilters | undefined;
      component.filtersChange.subscribe((f: PolicyFilters) => emitted = f);

      const fromDate = new Date(2025, 0, 1);
      const toDate = new Date(2025, 11, 31);
      (component as any).form.patchValue({ effectiveDateRange: [fromDate, toDate] });
      (component as any).emitFilters();

      expect(emitted!.effectiveDateFrom).toBe('2025-01-01');
      expect(emitted!.effectiveDateTo).toBe('2025-12-31');
    });

    it('should emit null for effectiveDateFrom when date range is null', () => {
      let emitted: PolicyFilters | undefined;
      component.filtersChange.subscribe((f: PolicyFilters) => emitted = f);

      (component as any).form.patchValue({ effectiveDateRange: null });
      (component as any).emitFilters();

      expect(emitted!.effectiveDateFrom).toBeNull();
      expect(emitted!.effectiveDateTo).toBeNull();
    });
  });

  describe('clearFilters output', () => {
    it('should emit clearFilters when onClearClick is called', () => {
      let emitted = false;
      component.clearFilters.subscribe(() => emitted = true);

      (component as any).onClearClick();

      expect(emitted).toBe(true);
    });
  });

  describe('search debouncing', () => {
    it('should emit the final search value after the 300ms debounce window', fakeAsync(() => {
      const emittedFilters: any[] = [];
      component.filtersChange.subscribe((f) => emittedFilters.push(f));

      // Rapid search changes within a single burst
      (component as any).form.get('search').setValue('a');
      tick(100);
      (component as any).form.get('search').setValue('ac');
      tick(100);
      (component as any).form.get('search').setValue('acme');

      // Wait for debounce to settle
      tick(400);

      // The last emitted filter should contain the final search value
      const lastEmit = emittedFilters[emittedFilters.length - 1];
      expect(lastEmit).toBeDefined();
      expect(lastEmit.search).toBe('acme');
    }));
  });
});
