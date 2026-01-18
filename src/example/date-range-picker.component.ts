import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  addDays,
  addMonths,
  buildMonthGrid,
  isSameDay,
  monthLabel,
  monthName,
  normalizeDate,
  startOfMonth,
  yearOptions,
} from './date-utils';

export type DateRange = { start: Date | null; end: Date | null };
type ActiveField = 'start' | 'end';

type QuickKey =
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisYear'
  | 'lastYear';

function calcQuickRange(key: QuickKey, today: Date): DateRange {
  const t = normalizeDate(today);

  if (key === 'thisYear') {
    return { start: new Date(t.getFullYear(), 0, 1), end: t };
  }
  if (key === 'lastYear') {
    const y = t.getFullYear() - 1;
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
  }

  const days = key === 'last7' ? 7 : key === 'last30' ? 30 : 90;
  const start = addDays(t, -(days - 1)); // inclusive
  return { start, end: t };
}

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="drp">
      <div class="inputs">
        <div class="field">
          <div class="fieldLabel">Start date</div>
          <input
            [value]="value?.start ? (value.start | date:'MM/dd/yyyy') : ''"
            placeholder="MM/DD/YYYY"
            readonly
            (click)="open('start')"
          />
        </div>

        <div class="field">
          <div class="fieldLabel">End date</div>
          <input
            [value]="value?.end ? (value.end | date:'MM/dd/yyyy') : ''"
            placeholder="MM/DD/YYYY"
            readonly
            (click)="open('end')"
          />
        </div>
      </div>

      <div class="panel" *ngIf="isOpen()">
        <div class="left">
          <div class="sectionTitle">Select Range</div>
          <div class="quickList">
          <button class="quickBtn" type="button" *ngFor="let q of quick()" (click)="onQuickSelect(q.key)">

              {{ q.label }}
            </button>
          </div>
        </div>

        <div class="right">
          <div class="calStack">
            <!-- TOP CALENDAR -->
            <div class="cal">
              <div class="calHeader">
                <button class="iconBtn" type="button" (click)="prevMonth('top')">←</button>

                <div class="headerCenter">
                  <select class="select" [ngModel]="topMonthIndex()" (ngModelChange)="setMonthIndex('top', $event)">
                    <option *ngFor="let m of months; let i=index" [ngValue]="i">{{ m }}</option>
                  </select>

                  <select class="select" [ngModel]="topYearValue()" (ngModelChange)="setYearValue('top', $event)">
                    <option *ngFor="let y of topYears()" [ngValue]="y">{{ y }}</option>
                  </select>
                </div>

                <button class="iconBtn" type="button" (click)="nextMonth('top')">→</button>
              </div>

              <div class="calMonthLabel">{{ label(topMonth()) }}</div>

              <div class="dow">
                <div class="dowCell" *ngFor="let d of dow">{{ d }}</div>
              </div>

              <div class="grid">
                <ng-container *ngFor="let cell of topGrid()">
                  <div *ngIf="cell === null" class="cell empty"></div>
                  <button
                    *ngIf="cell !== null"
                    type="button"
                    class="cell"
                    [class.inRange]="inRange(cell)"
                    [class.start]="isStart(cell)"
                    [class.end]="isEnd(cell)"
                    (click)="pickDate(cell)"
                  >
                    {{ cell.getDate() }}
                  </button>
                </ng-container>
              </div>
            </div>

            <!-- BOTTOM CALENDAR -->
            <div class="cal">
              <div class="calHeader">
                <button class="iconBtn" type="button" (click)="prevMonth('bottom')">←</button>

                <div class="headerCenter">
                  <select class="select" [ngModel]="bottomMonthIndex()" (ngModelChange)="setMonthIndex('bottom', $event)">
                    <option *ngFor="let m of months; let i=index" [ngValue]="i">{{ m }}</option>
                  </select>

                  <select class="select" [ngModel]="bottomYearValue()" (ngModelChange)="setYearValue('bottom', $event)">
                    <option *ngFor="let y of bottomYears()" [ngValue]="y">{{ y }}</option>
                  </select>
                </div>

                <button class="iconBtn" type="button" (click)="nextMonth('bottom')">→</button>
              </div>

              <div class="calMonthLabel">{{ label(bottomMonth()) }}</div>

              <div class="dow">
                <div class="dowCell" *ngFor="let d of dow">{{ d }}</div>
              </div>

              <div class="grid">
                <ng-container *ngFor="let cell of bottomGrid()">
                  <div *ngIf="cell === null" class="cell empty"></div>
                  <button
                    *ngIf="cell !== null"
                    type="button"
                    class="cell"
                    [class.inRange]="inRange(cell)"
                    [class.start]="isStart(cell)"
                    [class.end]="isEnd(cell)"
                    (click)="pickDate(cell)"
                  >
                    {{ cell.getDate() }}
                  </button>
                </ng-container>
              </div>
            </div>
          </div>

          <div class="footer">
            <button class="btn ghost" type="button" (click)="clear()">Clear</button>
            <button class="btn" type="button" (click)="close()">Close</button>
          </div>

          <div class="hint">
            <ng-container *ngIf="!value.start">Click a date to set <b>Start</b>.</ng-container>
            <ng-container *ngIf="value.start && !value.end">Now click a date to set <b>End</b>.</ng-container>
            <ng-container *ngIf="value.start && value.end">Range selected. Click any date to start a new selection.</ng-container>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drp { position: relative; }
    .inputs { display:flex; gap:12px; }
    .field { display:flex; flex-direction:column; gap:6px; flex:1; }
    .fieldLabel { font-size:12px; color:#6b7280; }
    input { height:36px; border:1px solid #d1d5db; border-radius:10px; padding:0 10px; cursor:pointer; }

    .panel {
      position:absolute; z-index:20; top:52px; left:0;
      width:min(980px, 100%);
      border:1px solid #e5e7eb; border-radius:14px;
      background:#fff; display:grid; grid-template-columns:260px 1fr;
      overflow:hidden; box-shadow:0 18px 45px rgba(0,0,0,.12);
    }

    .left { border-right:1px solid #f3f4f6; padding:14px; background:#fafafa; }
    .sectionTitle { font-size:13px; font-weight:600; margin-bottom:10px; }
    .quickList { display:flex; flex-direction:column; gap:8px; }
    .quickBtn { text-align:left; border:1px solid #e5e7eb; border-radius:10px; padding:10px; background:#fff; cursor:pointer; }
    .quickBtn:hover { background:#f9fafb; }

    .right { padding:14px; }

    .calStack { display:flex; flex-direction:column; gap:14px; }
    .cal { border:1px solid #e5e7eb; border-radius:12px; padding:10px; }

    .calHeader { display:grid; grid-template-columns:36px 1fr 36px; align-items:center; gap:8px; }
    .headerCenter { display:flex; gap:8px; justify-content:center; align-items:center; }
    .select { height:32px; border:1px solid #d1d5db; border-radius:10px; padding:0 8px; background:#fff; }
    .iconBtn { height:32px; width:32px; border:1px solid #d1d5db; border-radius:10px; background:#fff; cursor:pointer; }

    .calMonthLabel { margin-top:8px; font-size:12px; color:#6b7280; }

    .dow, .grid { display:grid; grid-template-columns:repeat(7, 1fr); gap:4px; margin-top:8px; }
    .dowCell { font-size:11px; color:#6b7280; text-align:center; }

    .cell {
      height:32px; border-radius:10px;
      border:1px solid transparent; background:#f9fafb;
      cursor:pointer;
    }
    .cell:hover { border-color:#d1d5db; }
    .cell.empty { background:transparent; cursor:default; }

    .cell.inRange { background:#e5e7eb; }
    .cell.start, .cell.end { background:#111827; color:#fff; }

    .footer { display:flex; justify-content:flex-end; gap:10px; margin-top:12px; }
    .btn { height:34px; border-radius:10px; border:1px solid #111827; background:#111827; color:#fff; padding:0 12px; cursor:pointer; }
    .btn.ghost { background:transparent; color:#111827; }

    .hint { margin-top:10px; font-size:12px; color:#374151; }
  `],
})
export class DateRangePickerComponent {
  /** Prototype 1 = independent calendars, Prototype 2 = dependent (consecutive months) */
  @Input() prototype: 1 | 2 = 1;

  @Input({ required: true }) value!: DateRange;
  @Output() valueChange = new EventEmitter<DateRange>();

  private today = normalizeDate(new Date());

  isOpen = signal(false);
  activeField = signal<ActiveField>('start');

  // months
  topMonth = signal<Date>(startOfMonth(this.today));
  bottomMonth = signal<Date>(startOfMonth(addMonths(this.today, 1)));

  topGrid = computed(() => buildMonthGrid(this.topMonth()));
  bottomGrid = computed(() => buildMonthGrid(this.bottomMonth()));

  topMonthIndex = computed(() => this.topMonth().getMonth());
  bottomMonthIndex = computed(() => this.bottomMonth().getMonth());
  topYearValue = computed(() => this.topMonth().getFullYear());
  bottomYearValue = computed(() => this.bottomMonth().getFullYear());

  topYears = computed(() => yearOptions(this.topMonth().getFullYear(), 6));
  bottomYears = computed(() => yearOptions(this.bottomMonth().getFullYear(), 6));

  dow = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  months = Array.from({ length: 12 }, (_, i) => monthName(i));

  quick = computed((): Array<{ key: QuickKey; label: string }> => {
    const base: Array<{ key: QuickKey; label: string }> = [
      { key: 'last7', label: 'Last 7 days' },
      { key: 'last30', label: 'Last 30 days' },
      { key: 'last90', label: 'Last 90 days' },
      { key: 'thisYear', label: 'This year' },
    ];
  
    if (this.prototype === 2) {
      base.push({ key: 'lastYear', label: 'Last year' });
    }
  
    return base;
  });
  

  constructor(private host: ElementRef<HTMLElement>) {}

  ngOnInit() {
    // default last 90 days
    const r = calcQuickRange('last90', this.today);
    this.valueChange.emit(r);
  }

  open(field: ActiveField) {
    this.activeField.set(field);
    this.isOpen.set(true);

    // Prototype 2: al abrir, si hay fechas, anclar al mes del campo clickeado
    if (this.prototype === 2) {
      const anchor = field === 'start' ? this.value?.start : this.value?.end;
      if (anchor) {
        this.topMonth.set(startOfMonth(anchor));
        this.bottomMonth.set(startOfMonth(addMonths(this.topMonth(), 1)));
      } else {
        // default: mes actual + siguiente
        this.topMonth.set(startOfMonth(this.today));
        this.bottomMonth.set(startOfMonth(addMonths(this.today, 1)));
      }
    }
  }

  close() {
    this.isOpen.set(false);
  }

  clear() {
    this.valueChange.emit({ start: null, end: null });
  }

  onQuickSelect(key: QuickKey) {
    const r = calcQuickRange(key, this.today);
    this.valueChange.emit(r);
  }

  // Prototype 2: mantener meses consecutivos
  private syncDependent(changed: 'top' | 'bottom') {
    if (this.prototype !== 2) return;

    if (changed === 'top') {
      this.bottomMonth.set(startOfMonth(addMonths(this.topMonth(), 1)));
    } else {
      this.topMonth.set(startOfMonth(addMonths(this.bottomMonth(), -1)));
    }
  }

  prevMonth(which: 'top' | 'bottom') {
    if (which === 'top') this.topMonth.set(startOfMonth(addMonths(this.topMonth(), -1)));
    else this.bottomMonth.set(startOfMonth(addMonths(this.bottomMonth(), -1)));
    this.syncDependent(which);
  }

  nextMonth(which: 'top' | 'bottom') {
    if (which === 'top') this.topMonth.set(startOfMonth(addMonths(this.topMonth(), 1)));
    else this.bottomMonth.set(startOfMonth(addMonths(this.bottomMonth(), 1)));
    this.syncDependent(which);
  }

  setMonthIndex(which: 'top' | 'bottom', monthIndex: number) {
    const cur = which === 'top' ? this.topMonth() : this.bottomMonth();
    const next = startOfMonth(new Date(cur.getFullYear(), Number(monthIndex), 1));
    if (which === 'top') this.topMonth.set(next);
    else this.bottomMonth.set(next);
    this.syncDependent(which);
  }

  setYearValue(which: 'top' | 'bottom', year: number) {
    const cur = which === 'top' ? this.topMonth() : this.bottomMonth();
    const next = startOfMonth(new Date(Number(year), cur.getMonth(), 1));
    if (which === 'top') this.topMonth.set(next);
    else this.bottomMonth.set(next);
    this.syncDependent(which);
  }

  pickDate(clicked: Date) {
    const c = normalizeDate(clicked);
    const start = this.value?.start ? normalizeDate(this.value.start) : null;
    const end = this.value?.end ? normalizeDate(this.value.end) : null;

    // Base behavior (simple range)
    if (!start) {
      this.valueChange.emit({ start: c, end: null });
      this.activeField.set('end');
      return;
    }

    if (start && !end) {
      if (c.getTime() < start.getTime()) {
        this.valueChange.emit({ start: c, end: null });
        this.activeField.set('end');
        return;
      }
      this.valueChange.emit({ start, end: c });
      return;
    }

    // start + end exist: start new selection
    this.valueChange.emit({ start: c, end: null });
    this.activeField.set('end');
  }

  inRange(d: Date): boolean {
    const s = this.value?.start ? normalizeDate(this.value.start) : null;
    const e = this.value?.end ? normalizeDate(this.value.end) : null;
    if (!s || !e) return false;
    const n = normalizeDate(d).getTime();
    return n >= s.getTime() && n <= e.getTime();
  }

  isStart(d: Date): boolean {
    const s = this.value?.start;
    return !!(s && isSameDay(normalizeDate(d), normalizeDate(s)));
  }

  isEnd(d: Date): boolean {
    const e = this.value?.end;
    return !!(e && isSameDay(normalizeDate(d), normalizeDate(e)));
  }

  label(d: Date): string {
    return monthLabel(d);
  }

  @HostListener('document:mousedown', ['$event'])
  onDocMouseDown(ev: MouseEvent) {
    if (!this.isOpen()) return;
    const el = this.host.nativeElement;
    if (ev.target instanceof Node && !el.contains(ev.target)) {
      this.close();
    }
  }
}
