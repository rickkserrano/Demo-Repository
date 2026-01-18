import { normalizeDate } from '../date-utils';
import {
  DateRangeBehavior,
  OpenContext,
  PickContext,
  BehaviorResult,
} from '../date-range-behavior';
import { ActiveField } from '../date-range-types';

export class IndependentCalendarBehavior implements DateRangeBehavior {
  getOpenAnchor(_ctx: OpenContext) {
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
      return { nextRange: { start: clicked, end: null }, nextActiveField: 'start' };
    }

    if (start && !end) {
      const next =
        clicked.getTime() < start.getTime()
          ? { start: clicked, end: null }
          : { start, end: clicked };

      return { nextRange: next, nextActiveField: 'end' };
    }

    return { nextRange: { start: clicked, end: null }, nextActiveField: 'start' };
  }
}
