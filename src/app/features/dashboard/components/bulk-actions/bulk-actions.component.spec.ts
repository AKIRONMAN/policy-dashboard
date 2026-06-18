import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BulkActionsComponent } from './bulk-actions.component';
import { initialPolicyState } from '../../../../shared/models/policy-state.model';
import { selectSelectedPolicyIds, selectLoading } from '../../../../state/policy/policy.selectors';
import { updateBulkFlag, clearSelection } from '../../../../state/policy/policy.actions';

describe('BulkActionsComponent', () => {
  let fixture: ComponentFixture<BulkActionsComponent>;
  let component: BulkActionsComponent;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkActionsComponent, NoopAnimationsModule],
      providers: [
        provideMockStore({
          initialState: { policy: initialPolicyState },
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(BulkActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => store.resetSelectors());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('selectedPolicyIds$', () => {
    it('should emit an empty array initially', (done) => {
      component.selectedPolicyIds$.subscribe((ids) => {
        expect(ids).toEqual([]);
        done();
      });
    });

    it('should emit the selected IDs from the store', (done) => {
      store.overrideSelector(selectSelectedPolicyIds, ['pol-001', 'pol-002']);
      store.refreshState();

      component.selectedPolicyIds$.subscribe((ids) => {
        expect(ids).toEqual(['pol-001', 'pol-002']);
        done();
      });
    });
  });

  describe('loading$', () => {
    it('should emit false initially', (done) => {
      component.loading$.subscribe((loading) => {
        expect(loading).toBe(false);
        done();
      });
    });

    it('should emit true when store is in loading state', (done) => {
      store.overrideSelector(selectLoading, true);
      store.refreshState();

      component.loading$.subscribe((loading) => {
        expect(loading).toBe(true);
        done();
      });
    });
  });

  describe('onFlagSelected', () => {
    it('should dispatch updateBulkFlag with flagStatus: true when IDs are selected', () => {
      store.overrideSelector(selectSelectedPolicyIds, ['pol-001', 'pol-002']);
      store.refreshState();
      const dispatchSpy = spyOn(store, 'dispatch');

      component.onFlagSelected();

      expect(dispatchSpy).toHaveBeenCalledWith(
        updateBulkFlag({ policyIds: ['pol-001', 'pol-002'], flagStatus: true })
      );
    });

    it('should NOT dispatch when no policies are selected', () => {
      store.overrideSelector(selectSelectedPolicyIds, []);
      store.refreshState();
      const dispatchSpy = spyOn(store, 'dispatch');

      component.onFlagSelected();

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('onUnflagSelected', () => {
    it('should dispatch updateBulkFlag with flagStatus: false when IDs are selected', () => {
      store.overrideSelector(selectSelectedPolicyIds, ['pol-001']);
      store.refreshState();
      const dispatchSpy = spyOn(store, 'dispatch');

      component.onUnflagSelected();

      expect(dispatchSpy).toHaveBeenCalledWith(
        updateBulkFlag({ policyIds: ['pol-001'], flagStatus: false })
      );
    });

    it('should NOT dispatch when no policies are selected', () => {
      store.overrideSelector(selectSelectedPolicyIds, []);
      store.refreshState();
      const dispatchSpy = spyOn(store, 'dispatch');

      component.onUnflagSelected();

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });
});
