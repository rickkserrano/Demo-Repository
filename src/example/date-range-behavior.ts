import { ActiveField, DateRange } from './date-range-types';

export type OpenContext = {
  range: DateRange;
  clickedField: ActiveField;
  today: Date;
};

export type PickContext = {
  range: DateRange;
  clickedDate: Date;
  activeField: ActiveField;
};

export type BehaviorResult = {
  nextRange: DateRange;
  nextActiveField: ActiveField;
};

export type CalendarAnchor = Date | null;

export interface DateRangeBehavior {
  /** Decide a qué mes anclar el calendario superior al abrir (si aplica). */
  getOpenAnchor(ctx: OpenContext): CalendarAnchor;

  /** Aplica la lógica cuando el usuario selecciona un día. */
  pickDate(ctx: PickContext): BehaviorResult;

  /** Clear: resetea rango y devuelve el field activo inicial. */
  clear(): { nextRange: DateRange; nextActiveField: ActiveField };
}
