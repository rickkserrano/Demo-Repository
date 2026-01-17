import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DateRangePickerComponent,
  DateRange,
} from './date-range-picker.component';

@Component({
  selector: 'datepicker-overview-example',
  standalone: true,
  imports: [CommonModule, DateRangePickerComponent],
  templateUrl: './datepicker-overview-example.html',
})
export class DatepickerOverviewExample {
  range: DateRange = { start: null, end: null };

  onRangeChange(next: DateRange) {
    this.range = next;
  }
}
