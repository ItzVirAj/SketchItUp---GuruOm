import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarProps {
  mode?: 'single';
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  defaultMonth?: Date;
  className?: string;
  classNames?: Record<string, string>;
  required?: boolean;
  eventDates?: Set<string>;
}

export function Calendar({
  selected,
  onSelect,
  defaultMonth,
  className = '',
  eventDates
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => defaultMonth || selected || new Date()
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthName = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonth);
  }, [currentMonth]);

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Calculate days for the month grid
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      dateKey: string;
    }> = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = new Date(year, month - 1, d);
      const dateKey = toDateKey(date);
      days.push({ date, dayNumber: d, isCurrentMonth: false, dateKey });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateKey = toDateKey(date);
      days.push({ date, dayNumber: d, isCurrentMonth: true, dateKey });
    }

    // Next month padding days to complete 35 or 42 cells (5 or 6 weeks)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      const dateKey = toDateKey(date);
      days.push({ date, dayNumber: d, isCurrentMonth: false, dateKey });
    }

    return days;
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const todayKey = toDateKey(new Date());
  const selectedKey = selected ? toDateKey(selected) : '';

  return (
    <div className={`select-none p-1 ${className}`}>
      {/* Month navigation header */}
      <div className="flex items-center justify-between pb-3 pt-1">
        <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 pl-1">
          {monthName}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">
        {daysOfWeek.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {calendarDays.map((cell) => {
          const isSelected = cell.dateKey === selectedKey;
          const isToday = cell.dateKey === todayKey;
          const hasEvent = eventDates?.has(cell.dateKey);

          return (
            <div key={cell.dateKey} className="relative flex items-center justify-center py-0.5">
              <button
                type="button"
                onClick={() => {
                  onSelect?.(cell.date);
                  if (!cell.isCurrentMonth) {
                    setCurrentMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                  }
                }}
                className={`relative flex size-8 items-center justify-center rounded-full text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 font-semibold text-white shadow-xs dark:bg-white dark:text-slate-900'
                    : isToday
                    ? 'font-bold text-sky-600 dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : cell.isCurrentMonth
                    ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80'
                    : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span>{cell.dayNumber}</span>
                {hasEvent && !isSelected && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-sky-500 dark:bg-sky-400" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
