import {
  Component,
  DestroyRef,
  input,
  inject,
  output,
  effect,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PolicyFilters, DEFAULT_POLICY_FILTERS } from '../../../../shared/models/policy-filters.model';
import {
  LineOfBusiness,
  PolicyStatus,
  Region,
} from '../../../../shared/models/policy.enums';
import { IsoDateString } from '../../../../shared/models/policy.model';
import {
  LINE_OF_BUSINESS_OPTIONS,
  POLICY_STATUS_OPTIONS,
  REGION_OPTIONS,
  SelectOption,
} from './filter-panel.options';

interface FilterFormValue {
  search: string;
  statuses: PolicyStatus[];
  linesOfBusiness: LineOfBusiness[];
  regions: Region[];
  effectiveDateRange: [Date, Date] | null;
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DatePickerModule,
    FloatLabelModule,
    InputTextModule,
    MultiSelectModule,
    ButtonModule,
  ],
  templateUrl: './filter-panel.component.html',
  styleUrl: './filter-panel.component.scss',
})
export class FilterPanelComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();
  private readonly cdr = inject(ChangeDetectorRef);

  readonly filters = input<PolicyFilters>(DEFAULT_POLICY_FILTERS);
  readonly filtersChange = output<PolicyFilters>();
  readonly clearFilters = output<void>();

  // Compute if any filters are applied
  readonly hasFiltersApplied = computed(() => {
    const currentFilters = this.filters();
    return (
      currentFilters.search.length > 0 ||
      currentFilters.statuses.length > 0 ||
      currentFilters.linesOfBusiness.length > 0 ||
      currentFilters.regions.length > 0 ||
      currentFilters.effectiveDateFrom !== null ||
      currentFilters.effectiveDateTo !== null
    );
  });

  protected form!: FormGroup;
  protected readonly statusOptions: SelectOption<PolicyStatus>[] = POLICY_STATUS_OPTIONS;
  protected readonly regionOptions: SelectOption<Region>[] = REGION_OPTIONS;
  protected readonly lineOfBusinessOptions: SelectOption<LineOfBusiness>[] = LINE_OF_BUSINESS_OPTIONS;

  constructor() {
    // Create reactive form
    this.form = this.fb.group({
      search: ['', [Validators.required, Validators.minLength(0)]],
      statuses: [[]],
      linesOfBusiness: [[]],
      regions: [[]],
      effectiveDateRange: null, // Correctly initialized as array
    });

    // Setup search debouncing
    this.form
      .get('search')
      ?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.emitFilters();
      });

    // Setup form value changes for other fields
    this.form
      .valueChanges
      .pipe(
        distinctUntilChanged((prev, curr) => {
          // Skip if only search changed
          if (
            prev.search !== curr.search &&
            JSON.stringify(prev.statuses) === JSON.stringify(curr.statuses) &&
            JSON.stringify(prev.linesOfBusiness) === JSON.stringify(curr.linesOfBusiness) &&
            JSON.stringify(prev.regions) === JSON.stringify(curr.regions) &&
            // Correct array value comparison instead of reference check
            JSON.stringify(prev.effectiveDateRange) === JSON.stringify(curr.effectiveDateRange)
          ) {
            return true;
          }
          return false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.emitFilters();
      });

    // Patch form when input filters change (from store)
    effect(() => {
      const currentFilters = this.filters();
      const effectiveDateRange = this.buildDateRange(
        currentFilters.effectiveDateFrom,
        currentFilters.effectiveDateTo
      );

      this.form.patchValue(
        {
          search: currentFilters.search,
          statuses: currentFilters.statuses || [],
          linesOfBusiness: currentFilters.linesOfBusiness || [],
          regions: currentFilters.regions || [],
          effectiveDateRange: effectiveDateRange.length > 0 ? effectiveDateRange : null, // Handle empty array case
        },
        { emitEvent: false } // Don't emit valueChanges when patching from input
      );
    });
  }

  protected emitFilters(): void {
    const formValue: FilterFormValue = this.form.getRawValue();

    // PrimeNG DatePicker returns [Date, null] during mid-selection range clicks!
    // If the array is empty or partial, handle destructuring safely
    const dateRange = formValue.effectiveDateRange || [];
    const from = dateRange[0] || null;
    const to = dateRange[1] || null;

    const filters: PolicyFilters = {
      search: formValue.search || '',
      statuses: formValue.statuses || [],
      linesOfBusiness: formValue.linesOfBusiness || [],
      regions: formValue.regions || [],
      underwriter: '',
      flaggedForReview: null,
      effectiveDateFrom: from ? this.toIsoDateString(from) : null,
      effectiveDateTo: to ? this.toIsoDateString(to) : null,
      expiryDateFrom: null,
      expiryDateTo: null,
    };

    this.filtersChange.emit(filters);
  }

  // FIX: Modified to return a partial array layout [Date] or [Date, Date] 
  // so mid-selection updates don't aggressively drop values back to null
  private buildDateRange(from: IsoDateString | null, to: IsoDateString | null): Date[] {
    const range: Date[] = [];
    if (from) range.push(this.parseIsoDateString(from));
    if (to) range.push(this.parseIsoDateString(to));
    return range;
  }

  protected onClearClick(): void {
    this.clearFilters.emit();
  }

  private parseIsoDateString(dateString: IsoDateString): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private toIsoDateString(date: Date): IsoDateString {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}` as IsoDateString;
  }
  
}
