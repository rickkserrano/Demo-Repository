import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { addDays, normalizeDate } from './date-utils';
import { DateRangePickerComponent, DateRange } from './date-range-picker.component';

function defaultLast90Days(): DateRange {
  const today = normalizeDate(new Date());
  return {
    start: addDays(today, -(90 - 1)), // inclusive
    end: today,
  };
}

@Component({
  selector: 'datepicker-overview-example',
  standalone: true,
  imports: [CommonModule, DateRangePickerComponent],
  templateUrl: './datepicker-overview-example.html',
})
export class DatepickerOverviewExample {
  // Prototype 1 (existing behavior) — default last 90 days
  range: DateRange = defaultLast90Days();

  // Prototype 2 (dependent calendars + last year) — default last 90 days
  range2: DateRange = defaultLast90Days();

  onRangeChange(next: DateRange) {
    this.range = next;
  }

  onRange2Change(next: DateRange) {
    this.range2 = next;
  }
}
//