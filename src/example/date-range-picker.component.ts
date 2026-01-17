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
  isSameMonth,
  monthLabel,
  monthName,
  normalizeDate,
  startOfMonth,
  yearOptions,
} from './date-utils';

export type DateRange = { start: Date | null; end: Date | null };

type QuickKey = 'last7' | 'last30' | 'last90' | 'thisYear' | 'lastYear';
type ActivePreset = QuickKey | 'custom' | null;

const QUICK_BASE: { key: QuickKey; label: string }[] = [
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'last90', label: 'Last 90 days' },
  { key: 'thisYear', label: 'This year' },
];

const QUICK_WITH_LAST_YEAR: { key: QuickKey; label: string }[] = [
  ...QUICK_BASE,
  { key: 'lastYear', label: 'Last year' },
];

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

function sameDate(a: Date | null, b: Date | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return normalizeDate(a).getTime() === normalizeDate(b).getTime();
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
            [class.invalid]="showStartInvalid()"
            [value]="value?.start ? (value.start | date:'MM/dd/yyyy') : ''"
            placeholder="MM/DD/YYYY"
            readonly
            (click)="open()"
          />
          <div class="fieldError" *ngIf="startFieldMessage()">
            {{ startFieldMessage() }}
          </div>
        </div>

        <div class="field">
          <div class="fieldLabel">End date</div>
          <input
            [class.invalid]="showEndInvalid()"
            [value]="value?.end ? (value.end | date:'MM/dd/yyyy') : ''"
            placeholder="MM/DD/YYYY"
            readonly
            (click)="open()"
          />
          <div class="fieldError" *ngIf="endFieldMessage()">
            {{ endFieldMessage() }}
          </div>
        </div>
      </div>

      <!-- General error ONLY when both are missing -->
      <div class="generalError" *ngIf="generalMessage() && !isOpen()">
        {{ generalMessage() }}
      </div>

      <div class="panel" *ngIf="isOpen()">
        <div class="left">
          <div class="sectionTitle">Select Range</div>

          <div class="quickList">
            <button
              class="quickBtn"
              type="button"
              *ngFor="let q of quick"
              [class.active]="activePreset() === q.key"
              (click)="onQuickSelect(q.key)"
            >
              {{ q.label }}
            </button>

            <!-- Custom (informational only, not clickable) -->
            <div class="quickBtn custom" [class.active]="activePreset() === 'custom'">
              Custom
            </div>
          </div>
        </div>

        <div class="right">
          <div class="calStack">
            <!-- TOP CALENDAR -->
            <div class="cal">
              <div class="calHeader">
                <button class="iconBtn" type="button" (click)="prevMonth('top')" aria-label="Previous month">←</button>

                <div class="headerCenter">
                  <select
                    class="select"
                    [ngModel]="topMonthIndex()"
                    (ngModelChange)="setMonthIndex('top', $event)"
                  >
                    <option *ngFor="let m of months; let i=index" [ngValue]="i">{{ m }}</option>
                  </select>

                  <select
                    class="select"
                    [ngModel]="topYearValue()"
                    (ngModelChange)="setYearValue('top', $event)"
                  >
                    <option *ngFor="let y of topYears()" [ngValue]="y">{{ y }}</option>
                  </select>
                </div>

                <button class="iconBtn" type="button" (click)="nextMonth('top')" aria-label="Next month">→</button>
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
                <button class="iconBtn" type="button" (click)="prevMonth('bottom')" aria-label="Previous month">←</button>

                <div class="headerCenter">
                  <select
                    class="select"
                    [ngModel]="bottomMonthIndex()"
                    (ngModelChange)="setMonthIndex('bottom', $event)"
                  >
                    <option *ngFor="let m of months; let i=index" [ngValue]="i">{{ m }}</option>
                  </select>

                  <select
                    class="select"
                    [ngModel]="bottomYearValue()"
                    (ngModelChange)="setYearValue('bottom', $event)"
                  >
                    <option *ngFor="let y of bottomYears()" [ngValue]="y">{{ y }}</option>
                  </select>
                </div>

                <button class="iconBtn" type="button" (click)="nextMonth('bottom')" aria-label="Next month">→</button>
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

          <!-- General error ONLY when both missing (while open) -->
          <div class="footerError" *ngIf="generalMessage() && isOpen()">
            {{ generalMessage() }}
          </div>

          <div class="hint" *ngIf="isOpen()">
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

    input {
      height:36px;
      border:1px solid #d1d5db;
      border-radius:10px;
      padding:0 10px;
      cursor:pointer;
      outline:none;
      background:#fff;
    }

    input.invalid {
      border-color:#ef4444;
      box-shadow:0 0 0 3px rgba(239, 68, 68, 0.12);
    }

    .fieldError {
      font-size:12px;
      color:#b91c1c;
      margin-top:4px;
    }

    .generalError {
      margin-top:8px;
      font-size:12px;
      color:#b91c1c;
    }

    .panel {
      position:absolute; z-index:20; top:64px; left:0;
      width:min(980px, 100%);
      border:1px solid #e5e7eb; border-radius:14px;
      background:#fff; display:grid; grid-template-columns:260px 1fr;
      overflow:hidden; box-shadow:0 18px 45px rgba(0,0,0,.12);
    }

    .left { border-right:1px solid #f3f4f6; padding:14px; background:#fafafa; }
    .sectionTitle { font-size:13px; font-weight:600; margin-bottom:10px; }
    .quickList { display:flex; flex-direction:column; gap:8px; }

    .quickBtn {
      text-align:left;
      border:1px solid #e5e7eb;
      border-radius:10px;
      padding:10px;
      background:#fff;
      cursor:pointer;
      user-select:none;
    }
    .quickBtn:hover { background:#f9fafb; }
    .quickBtn.active {
      border-color:#111827;
      box-shadow:0 0 0 2px rgba(17,24,39,.10);
      background:#f3f4f6;
      font-weight:600;
    }

    .quickBtn.custom {
      cursor:default;
      background:#fff;
      color:#374151;
    }
    .quickBtn.custom:hover { background:#fff; }

    .right { padding:14px; }

    .calStack { display:flex; flex-direction:column; gap:14px; }
    .cal { border:1px solid #e5e7eb; border-radius:12px; padding:10px; }

    .calHeader { display:grid; grid-template-columns:36px 1fr 36px; align-items:center; gap:8px; }
    .headerCenter { display:flex; gap:8px; justify-content:center; align-items:center; flex-wrap:wrap; }
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
    .btn {
      height:34px;
      border-radius:10px;
      border:1px solid #111827;
      background:#111827;
      color:#fff;
      padding:0 12px;
      cursor:pointer;
    }
    .btn.ghost { background:transparent; color:#111827; }

    .footerError {
      margin-top:10px;
      font-size:12px;
      color:#b91c1c;
    }

    .hint { margin-top:10px; font-size:12px; color:#374151; }

    /* ✅ Responsive improvements (mobile) */
    @media (max-width: 720px) {
      /* =========================
         Inputs (mantener 2 en fila)
         ========================= */
      .inputs {
        flex-direction: row;
        gap: 8px;
      }
      .field { flex: 1; }
    
      input {
        height: 32px;
        padding: 0 8px;
        font-size: 12px;
      }
    
      /* =========================
         Panel fullscreen (sin cambiar layout)
         ========================= */
      .panel {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
        overflow: hidden;
    
        /* left (ranges) + right (calendars) */
        grid-template-columns: 150px 1fr;
      }
    
      /* =========================
         Left: Select Range vertical (sin scroll horizontal)
         ========================= */
      .left {
        padding: 8px;
        background: #fafafa;
        border-right: 1px solid #f3f4f6;
        border-bottom: none;
    
        overflow-y: auto;
        overflow-x: hidden;
      }
    
      .sectionTitle {
        font-size: 12px;
        margin-bottom: 6px;
      }
    
      .quickList {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
        overflow: visible;
        padding-bottom: 0;
      }
    
      .quickBtn {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        min-width: 0;
    
        padding: 7px 8px;
        border-radius: 10px;
        font-size: 12px;
    
        white-space: normal;
        word-break: break-word;
      }
    
      /* =========================
         Right: Calendarios (2 en vertical), compactos
         ========================= */
      .right {
        padding: 8px;
        overflow: hidden;
    
        display: grid;
        grid-template-rows: 1fr auto auto; /* calendars / footer / hint+errors */
        min-height: 0;
      }
    
      /* Mantener vertical; que esta zona sea scrolleable si hace falta */
      .calStack {
        display: flex;
        flex-direction: column;
        gap: 10px;
    
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
    
        padding-bottom: 6px;
        min-height: 0;
      }
    
      .cal {
        padding: 8px;
        border-radius: 12px;
      }
    
      .calHeader {
        gap: 6px;
      }
    
      .headerCenter {
        gap: 6px;
        flex-wrap: nowrap;
      }
    
      .select {
        height: 28px;
        font-size: 12px;
        padding: 0 6px;
        border-radius: 9px;
      }
    
      .iconBtn {
        width: 28px;
        height: 28px;
        border-radius: 9px;
      }
    
      .calMonthLabel {
        margin-top: 6px;
        font-size: 11px;
      }
    
      .dow,
      .grid {
        gap: 3px;
        margin-top: 6px;
      }
    
      .dowCell {
        font-size: 10px;
      }
    
      .cell {
        height: 24px;          /* clave para que quepa */
        border-radius: 8px;
        font-size: 12px;
        padding: 0;
      }
    
      /* =========================
         Footer sticky + más compacto
         ========================= */
      .footer {
        position: sticky;
        bottom: 0;
        background: #fff;
    
        padding-top: 8px;
        margin-top: 8px;
        gap: 8px;
      }
    
      .btn {
        height: 32px;
        padding: 0 10px;
        border-radius: 10px;
        font-size: 12px;
      }
    
      .hint {
        margin-top: 6px;
        font-size: 11px;
      }
    }
    
  `],
})
export class DateRangePickerComponent {
  private _value!: DateRange;

  @Input({ required: true })
  set value(v: DateRange) {
    this._value = v;

    // If parent sends a valid range again, remove errors + update highlight.
    if (v?.start && v?.end) {
      this.showError.set(false);
      const p = this.detectPreset(v);
      if (p) this.activePreset.set(p);
    }
  }
  get value(): DateRange {
    return this._value;
  }

  @Output() valueChange = new EventEmitter<DateRange>();

  @Input() autoCloseOnQuickSelect = false;

  /** Prototype 1 default: "independent" | Prototype 2: "dependent" */
  @Input() calendarMode: 'independent' | 'dependent' = 'independent';

  /** Prototype 1 default: false | Prototype 2: true */
  @Input() includeLastYear = false;

  get quick() {
    return this.includeLastYear ? QUICK_WITH_LAST_YEAR : QUICK_BASE;
  }

  dow = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  months = Array.from({ length: 12 }, (_, i) => monthName(i));

  private today = normalizeDate(new Date());

  isOpen = signal(false);

  // User has tried to leave invalid (Clear or Close invalid)
  private showError = signal(false);

  // Which quick preset is highlighted
  activePreset = signal<ActivePreset>('last90'); // default report behavior

  // Validation signals
  missingStart = computed(() => !this.value?.start);
  missingEnd = computed(() => !this.value?.end);

  showStartInvalid = computed(() => this.showError() && this.missingStart());
  showEndInvalid = computed(() => this.showError() && this.missingEnd());

  startFieldMessage = computed(() => {
    if (!this.showError()) return '';
    if (this.missingStart() && !this.missingEnd()) return 'Please select a start date.';
    return '';
  });

  endFieldMessage = computed(() => {
    if (!this.showError()) return '';
    if (!this.missingStart() && this.missingEnd()) return 'Please select an end date.';
    return '';
  });

  generalMessage = computed(() => {
    if (!this.showError()) return '';
    if (this.missingStart() && this.missingEnd()) return 'Please select a start and end date.';
    return '';
  });

  topMonth = signal<Date>(startOfMonth(this.today));
  bottomMonth = signal<Date>(startOfMonth(addMonths(this.today, 1)));

  topGrid = computed(() => buildMonthGrid(this.topMonth()));
  bottomGrid = computed(() => buildMonthGrid(this.bottomMonth()));

  topYears = computed(() => yearOptions(this.topMonth().getFullYear(), 6));
  bottomYears = computed(() => yearOptions(this.bottomMonth().getFullYear(), 6));

  topMonthIndex = computed(() => this.topMonth().getMonth());
  bottomMonthIndex = computed(() => this.bottomMonth().getMonth());
  topYearValue = computed(() => this.topMonth().getFullYear());
  bottomYearValue = computed(() => this.bottomMonth().getFullYear());

  constructor(private host: ElementRef<HTMLElement>) {}

  private ensureDifferentMonths(changed: 'top' | 'bottom') {
    // Prototype 2 behavior: ALWAYS consecutive months
    if (this.calendarMode === 'dependent') {
      if (changed === 'top') {
        const top = this.topMonth();
        this.bottomMonth.set(startOfMonth(addMonths(top, 1)));
      } else {
        const bottom = this.bottomMonth();
        this.topMonth.set(startOfMonth(addMonths(bottom, -1)));
      }
      return;
    }

    // Prototype 1 behavior: only prevent same-month collision
    const top = this.topMonth();
    const bottom = this.bottomMonth();
    if (!isSameMonth(top, bottom)) return;

    if (changed === 'top') this.bottomMonth.set(startOfMonth(addMonths(top, 1)));
    else this.topMonth.set(startOfMonth(addMonths(bottom, -1)));
  }

  private isSelectingRange(range: DateRange): boolean {
    return !!(range.start && !range.end);
  }

  private detectPreset(range: DateRange): ActivePreset {
    const s = range.start ? normalizeDate(range.start) : null;
    const e = range.end ? normalizeDate(range.end) : null;
    if (!s || !e) return null;

    const candidates = this.includeLastYear ? QUICK_WITH_LAST_YEAR : QUICK_BASE;
    for (const c of candidates) {
      const r = calcQuickRange(c.key, this.today);
      if (sameDate(r.start, s) && sameDate(r.end, e)) return c.key;
    }
    return 'custom';
  }

  // Used ONLY for open / clear / quick select.
  private syncCalendarsToRange(range: DateRange) {
    const s = range.start ? normalizeDate(range.start) : null;
    const e = range.end ? normalizeDate(range.end) : null;

    if (this.isSelectingRange(range)) {
      this.ensureDifferentMonths('bottom');
      return;
    }

    // Empty => reset to current + next month
    if (!s && !e) {
      this.topMonth.set(startOfMonth(this.today));
      this.bottomMonth.set(startOfMonth(addMonths(this.today, 1)));
      this.ensureDifferentMonths('bottom');
      return;
    }

    // Prototype 2: anchor month and force consecutive
    if (this.calendarMode === 'dependent') {
      const anchor = s ?? e ?? this.today;
      const top = startOfMonth(anchor);
      this.topMonth.set(top);
      this.bottomMonth.set(startOfMonth(addMonths(top, 1)));
      return;
    }

    // Prototype 1 behavior
    if (s && e) {
      if (isSameMonth(s, e)) {
        this.topMonth.set(startOfMonth(s));
        this.bottomMonth.set(startOfMonth(addMonths(s, 1)));
      } else {
        this.topMonth.set(startOfMonth(s));
        this.bottomMonth.set(startOfMonth(e));
        this.ensureDifferentMonths('bottom');
      }
    }
  }

  open() {
    this.isOpen.set(true);
    this.syncCalendarsToRange(this.value);

    const p = this.detectPreset(this.value);
    if (p) this.activePreset.set(p);
  }

  // ✅ FIX: defer validation to next microtask so parent Input has time to update
  close() {
    this.isOpen.set(false);

    queueMicrotask(() => {
      const hasStart = !!this.value?.start;
      const hasEnd = !!this.value?.end;
      this.showError.set(!(hasStart && hasEnd));
    });
  }

  clear() {
    const next: DateRange = { start: null, end: null };
    this.valueChange.emit(next);

    this.showError.set(true);
    this.activePreset.set(null);

    this.isOpen.set(true);
    this.syncCalendarsToRange(next);
  }

  onQuickSelect(key: QuickKey) {
    const next = calcQuickRange(key, this.today);
    this.valueChange.emit(next);

    this.showError.set(false);
    this.activePreset.set(key);

    this.syncCalendarsToRange(next);

    if (this.autoCloseOnQuickSelect) this.isOpen.set(false);
  }

  prevMonth(which: 'top' | 'bottom') {
    if (which === 'top') {
      this.topMonth.set(startOfMonth(addMonths(this.topMonth(), -1)));
      this.ensureDifferentMonths('top');
    } else {
      this.bottomMonth.set(startOfMonth(addMonths(this.bottomMonth(), -1)));
      this.ensureDifferentMonths('bottom');
    }
  }

  nextMonth(which: 'top' | 'bottom') {
    if (which === 'top') {
      this.topMonth.set(startOfMonth(addMonths(this.topMonth(), 1)));
      this.ensureDifferentMonths('top');
    } else {
      this.bottomMonth.set(startOfMonth(addMonths(this.bottomMonth(), 1)));
      this.ensureDifferentMonths('bottom');
    }
  }

  setMonthIndex(which: 'top' | 'bottom', monthIndex: number) {
    const cur = which === 'top' ? this.topMonth() : this.bottomMonth();
    const next = startOfMonth(new Date(cur.getFullYear(), Number(monthIndex), 1));
    if (which === 'top') {
      this.topMonth.set(next);
      this.ensureDifferentMonths('top');
    } else {
      this.bottomMonth.set(next);
      this.ensureDifferentMonths('bottom');
    }
  }

  setYearValue(which: 'top' | 'bottom', year: number) {
    const cur = which === 'top' ? this.topMonth() : this.bottomMonth();
    const next = startOfMonth(new Date(Number(year), cur.getMonth(), 1));
    if (which === 'top') {
      this.topMonth.set(next);
      this.ensureDifferentMonths('top');
    } else {
      this.bottomMonth.set(next);
      this.ensureDifferentMonths('bottom');
    }
  }

  pickDate(d: Date) {
    const clicked = normalizeDate(d);
    const start = this.value.start ? normalizeDate(this.value.start) : null;
    const end = this.value.end ? normalizeDate(this.value.end) : null;

    if (!start) {
      this.valueChange.emit({ start: clicked, end: null });
      return;
    }

    if (start && !end) {
      const next =
        clicked.getTime() < start.getTime()
          ? { start: clicked, end: null }
          : { start, end: clicked };

      this.valueChange.emit(next);

      if (next.start && next.end) {
        this.showError.set(false);
        const p = this.detectPreset(next);
        this.activePreset.set(p ?? 'custom');
      }
      return;
    }

    this.valueChange.emit({ start: clicked, end: null });
  }

  inRange(d: Date): boolean {
    const s = this.value.start ? normalizeDate(this.value.start) : null;
    const e = this.value.end ? normalizeDate(this.value.end) : null;
    if (!s || !e) return false;
    const n = normalizeDate(d).getTime();
    return n >= s.getTime() && n <= e.getTime();
  }

  isStart(d: Date): boolean {
    return !!(
      this.value.start &&
      isSameDay(normalizeDate(d), normalizeDate(this.value.start))
    );
  }

  isEnd(d: Date): boolean {
    return !!(
      this.value.end &&
      isSameDay(normalizeDate(d), normalizeDate(this.value.end))
    );
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
