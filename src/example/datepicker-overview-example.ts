import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateRangePickerComponent, DateRange } from './date-range-picker.component';
import { DateRangePickerProto3Component } from './date-range-picker-proto3.component';
import { addDays, normalizeDate } from './date-utils';

function lastNDays(n: number): DateRange {
  const today = normalizeDate(new Date());
  return { start: addDays(today, -(n - 1)), end: today };
}

@Component({
  selector: 'datepicker-overview-example',
  standalone: true,
  imports: [CommonModule, DateRangePickerComponent, DateRangePickerProto3Component],
  templateUrl: './datepicker-overview-example.html',
})
export class DatepickerOverviewExample {
  range1: DateRange = lastNDays(90);
  range2: DateRange = lastNDays(90);
  range3: DateRange = lastNDays(90);
}
