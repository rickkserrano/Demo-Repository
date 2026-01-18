import { normalizeDate } from '../date-utils';
import {
  DateRangeBehavior,
  OpenContext,
  PickContext,
  BehaviorResult,
} from '../date-range-behavior';
import { ActiveField } from '../date-range-types';

export class DependentCalendarBehavior implements DateRangeBehavior {
  getOpenAnchor(ctx: OpenContext) {
    if (ctx.range.start && ctx.range.end) {
      return ctx.clickedField === 'start' ? ctx.range.start : ctx.range.end;
    }
    return null;
  }

  clear(): { nextRange: { start: null; end: null }; nextActiveField: ActiveField } {
    return { nextRange: { start: null, end: null }, nextActiveField: 'start' };
  }

  pickDate(ctx: PickContext): BehaviorResult {
    const clicked = normalizeDate(ctx.clickedDate);
    const start = ctx.range.start ? normalizeDate(ctx.range.start) : null;
    const end = ctx.range.end ? normalizeDate(ctx.range.end) : null;

    if (!start) {
      return { nextRange: { start: clicked, end: null }, nextActiveField: 'end' };
    }

    if (start && !end) {
      if (clicked.getTime() < start.getTime()) {
        return { nextRange: { start: clicked, end: null }, nextActiveField: 'end' };
      }
      return { nextRange: { start, end: clicked }, nextActiveField: 'end' };
    }

    if (start && end) {
      if (ctx.activeField === 'start') {
        if (clicked.getTime() > end.getTime()) {
          return { nextRange: { start, end: clicked }, nextActiveField: 'end' };
        }
        return { nextRange: { start: clicked, end }, nextActiveField: 'start' };
      } else {
        if (clicked.getTime() < start.getTime()) {
          return { nextRange: { start: clicked, end }, nextActiveField: 'start' };
        }
        return { nextRange: { start, end: clicked }, nextActiveField: 'end' };
      }
    }

    return { nextRange: { start: clicked, end: null }, nextActiveField: 'end' };
  }
}
