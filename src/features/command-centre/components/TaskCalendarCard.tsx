'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon, CalendarDays, ExternalLink } from 'lucide-react';
import { Button } from '@/components/base-ui/button';
import { Calendar } from '@/components/base-ui/calendar';
import { Card, CardContent, CardFooter } from '@/components/base-ui/card';
import { fetchTasks, Task } from '../../../services/consoleApiServices';
import { ConsoleView } from '../../../types/console';

export type CalendarEvent = {
  id: string;
  className: string;
  from: string;
  title: string;
  to: string;
  priority?: string;
  status?: string;
};

interface TaskCalendarCardProps {
  onNavigate?: (view: ConsoleView) => void;
}

export function TaskCalendarCard({ onNavigate }: TaskCalendarCardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real tasks from http://localhost:3000/hr/tasks via REST service
  useEffect(() => {
    let isMounted = true;
    async function loadTasks() {
      setIsLoading(true);
      try {
        const data = await fetchTasks('all');
        if (isMounted && Array.isArray(data)) {
          setTasks(data);
        }
      } catch (err) {
        console.warn('Failed to load tasks for calendar:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadTasks();
    const timer = setInterval(loadTasks, 60_000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Today reference dates for mock/fallback events
  const fallbackEvents = useMemo<CalendarEvent[]>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    return [
      {
        id: 'fb-1',
        className: 'bg-sky-50 text-sky-950 after:bg-sky-500 dark:bg-sky-950/30 dark:text-sky-100',
        title: 'Weekly Production Planning',
        from: `${todayStr}T09:00:00`,
        to: `${todayStr}T10:00:00`,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS'
      },
      {
        id: 'fb-2',
        className: 'bg-emerald-50 text-emerald-950 after:bg-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-100',
        title: 'QC & PDI Batch Verification',
        from: `${todayStr}T11:30:00`,
        to: `${todayStr}T12:30:00`,
        priority: 'HIGH',
        status: 'DONE'
      },
      {
        id: 'fb-3',
        className: 'bg-amber-50 text-amber-950 after:bg-amber-500 dark:bg-amber-950/30 dark:text-amber-100',
        title: 'Vendor Bill Reconciliation',
        from: `${todayStr}T14:00:00`,
        to: `${todayStr}T15:00:00`,
        priority: 'LOW',
        status: 'TODO'
      }
    ];
  }, []);

  // Map real tasks into CalendarEvent format
  const allEvents = useMemo<CalendarEvent[]>(() => {
    if (!tasks || tasks.length === 0) {
      return fallbackEvents;
    }

    return tasks.map((task, index) => {
      let className = 'bg-amber-50 text-amber-950 after:bg-amber-500 dark:bg-amber-950/30 dark:text-amber-100';
      if (task.status === 'DONE') {
        className = 'bg-emerald-50 text-emerald-950 after:bg-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-100';
      } else if (task.priority === 'URGENT' || task.priority === 'HIGH') {
        className = 'bg-rose-50 text-rose-950 after:bg-rose-500 dark:bg-rose-950/30 dark:text-rose-100';
      } else if (task.status === 'IN_PROGRESS' || task.priority === 'MEDIUM') {
        className = 'bg-sky-50 text-sky-950 after:bg-sky-500 dark:bg-sky-950/30 dark:text-sky-100';
      }

      // Determine time
      let fromIso = task.dueDate || task.createdAt || new Date().toISOString();
      let toIso = fromIso;
      try {
        const fromDate = new Date(fromIso);
        const toDate = new Date(fromDate.getTime() + 60 * 60 * 1000);
        toIso = toDate.toISOString();
      } catch {
        // keep fallback
      }

      return {
        id: task.id || `task-${index}`,
        title: task.title,
        from: fromIso,
        to: toIso,
        className,
        priority: task.priority,
        status: task.status
      };
    });
  }, [tasks, fallbackEvents]);

  // Set of dates with events for dot indicators
  const eventDateSet = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach((ev) => {
      try {
        const d = new Date(ev.from);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        set.add(key);
      } catch {
        // ignore
      }
    });
    return set;
  }, [allEvents]);

  // Filter events for the selected date
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return allEvents.slice(0, 3);

    const selY = selectedDate.getFullYear();
    const selM = selectedDate.getMonth();
    const selD = selectedDate.getDate();

    const matched = allEvents.filter((ev) => {
      try {
        const evDate = new Date(ev.from);
        return (
          evDate.getFullYear() === selY &&
          evDate.getMonth() === selM &&
          evDate.getDate() === selD
        );
      } catch {
        return false;
      }
    });

    return matched;
  }, [allEvents, selectedDate]);

  const handleOpenTasks = () => {
    if (onNavigate) {
      onNavigate('tasks');
    } else {
      window.location.href = '/hr/tasks';
    }
  };

  return (
    <div className="flex flex-col">
      <Card className="w-full rounded-2xl border-border/60 py-4 shadow-sm bg-white dark:bg-slate-900/60">
        <CardContent className="px-4">
          <Calendar
            mode="single"
            defaultMonth={selectedDate}
            selected={selectedDate}
            onSelect={setSelectedDate}
            eventDates={eventDateSet}
            classNames={{
              today: '!bg-transparent',
              day_button: '!ring-0 !ring-offset-0 focus:!ring-0 focus-visible:!ring-0'
            }}
            className="w-full !bg-transparent p-0 !ring-0 !ring-offset-0 focus:!ring-0 focus-visible:!ring-0 [&_*]:!ring-0 [&_*]:!ring-offset-0 [&_*]:focus:!ring-0 [&_*]:focus-visible:!ring-0 [&_.rdp-day_today]:!bg-transparent"
            required
          />
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 border-t border-border/60 px-4 pt-4!">
          <div className="flex w-full items-center justify-between px-1">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span>
                {selectedDate?.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                title="Add Task in HR module"
                onClick={handleOpenTasks}
              >
                <PlusIcon className="size-4" />
                <span className="sr-only">Add Event</span>
              </Button>
              <button
                type="button"
                onClick={handleOpenTasks}
                title="View in HR Tasks"
                className="p-1 text-xs text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label="Open HR Tasks"
              >
                <ExternalLink className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
            {eventsForSelectedDate.length > 0 ? (
              eventsForSelectedDate.map((event) => (
                <div
                  key={event.id}
                  onClick={handleOpenTasks}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleOpenTasks();
                  }}
                  className={`relative rounded-lg p-2.5 pl-6 text-sm cursor-pointer transition-transform active:scale-[0.99] after:absolute after:inset-y-2.5 after:left-2 after:w-1 after:rounded-full ${event.className}`}
                >
                  <div className="font-medium leading-snug">{event.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDateRange(new Date(event.from), new Date(event.to))}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <div className="rounded-lg border border-dashed border-border/80 p-3 text-center text-xs text-muted-foreground">
                  No tasks on this date.
                </div>
                {allEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    onClick={handleOpenTasks}
                    role="button"
                    tabIndex={0}
                    className={`relative rounded-lg p-2.5 pl-6 text-sm cursor-pointer transition-transform active:scale-[0.99] after:absolute after:inset-y-2.5 after:left-2 after:w-1 after:rounded-full ${event.className}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium leading-snug">{event.title}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                        Upcoming
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDateRange(new Date(event.from), new Date(event.to))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
      <p className="mt-3 text-center text-xs text-muted-foreground" role="region">
        Calendar with agenda list
      </p>
    </div>
  );
}

function formatDateRange(from: Date, to: Date): string {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'All Day';
  }

  const timeFormat = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const sameDay = from.toDateString() === to.toDateString();
  if (sameDay) {
    return `${timeFormat.format(from)} - ${timeFormat.format(to)}`;
  }

  const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  });

  return `${dateFormat.format(from)} - ${dateFormat.format(to)}`;
}

export default TaskCalendarCard;
