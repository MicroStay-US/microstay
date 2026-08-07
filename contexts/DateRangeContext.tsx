'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

export type DateRangePreset = 'last7days' | 'last30days' | 'last3months' | 'lastyear' | 'alltime' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangeContextType {
  dateRange: DateRange;
  preset: DateRangePreset;
  setDateRange: (range: DateRange) => void;
  setPreset: (preset: DateRangePreset, customRange?: DateRange) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<DateRangePreset>('last30days');
  const [dateRange, setDateRangeState] = useState<DateRange>({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  });

  const setPreset = (newPreset: DateRangePreset, customRange?: DateRange) => {
    setPresetState(newPreset);

    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (newPreset) {
      // case 'today':
      //   start = startOfDay(now);
      //   break;
      // case 'yesterday':
      //   start = startOfDay(subDays(now, 1));
      //   end = endOfDay(subDays(now, 1));
      //   break;
      case 'last7days':
        start = startOfDay(subDays(now, 7));
        break;
      case 'last30days':
        start = startOfDay(subDays(now, 30));
        break;
      case 'last3months':
        start = startOfDay(subDays(now, 90));
        break;
      case 'lastyear':
        start = startOfDay(subDays(now, 365));
        break;
      case 'alltime':
        start = new Date(0);
        break;
      // case 'thisMonth':
      //   start = startOfMonth(now);
      //   end = endOfMonth(now);
      //   break;
      case 'custom':
        if (customRange) {
          start = customRange.start;
          end = customRange.end;
        } else {
          return;
        }
        break;
      default:
        start = startOfDay(subDays(now, 30));
    }

    setDateRangeState({ start, end });
  };

  const setDateRange = (range: DateRange) => {
    setDateRangeState(range);
    setPresetState('custom');
  };

  return (
    <DateRangeContext.Provider value={{ dateRange, preset, setDateRange, setPreset }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}
