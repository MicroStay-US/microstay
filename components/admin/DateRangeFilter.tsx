'use client';

import { useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useDateRange, DateRangePreset } from '@/contexts/DateRangeContext';
import { format } from 'date-fns';

export function DateRangeFilter() {
  const { dateRange, preset, setPreset } = useDateRange();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>(dateRange.start);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(dateRange.end);

  const presets: { value: DateRangePreset; label: string }[] = [
    // { value: 'today', label: 'Today' },
    // { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last3months', label: 'Last 3 Months' },
    { value: 'lastyear', label: 'Last Year' },
    { value: 'alltime', label: 'All Time' },
    // { value: 'thisMonth', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const handlePresetClick = (value: DateRangePreset) => {
    if (value === 'custom') {
      setShowCustomPicker(true);
    } else {
      setPreset(value);
      setShowCustomPicker(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      setPreset('custom', { start: customStart, end: customEnd });
      setShowCustomPicker(false);
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting as ${format}`);
  };

  return (
    <div className="sticky top-[73px] z-40 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {presets.map((p) => (
            <Button
              key={p.value}
              variant={preset === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(p.value)}
              className={`
                text-xs font-bold whitespace-nowrap h-8
                ${preset === p.value 
                  ? 'bg-orange-100/50 text-orange-700 border border-orange-200 hover:bg-orange-100 dark:bg-black dark:border-transparent' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-ms-orange dark:hover:text-ms-orange-light'}
              `}
            >
              {p.label}
            </Button>
          ))}

          {showCustomPicker && (
            <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-gray-200 text-gray-700">
                  <Calendar className="h-3 w-3 mr-2 text-gray-400" />
                  {customStart && customEnd
                    ? `${format(customStart, 'MMM d')} - ${format(customEnd, 'MMM d')}`
                    : 'Select dates'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4 bg-white border-gray-200 shadow-xl rounded-xl" align="start">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</div>
                    <CalendarComponent
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 dark:bg-zinc-800/20 dark:border-zinc-600"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date</div>
                    <CalendarComponent
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 dark:bg-zinc-800/20 dark:border-zinc-600"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-zinc-700 border-gray-100">
                  <Button variant="outline" size="sm" onClick={() => setShowCustomPicker(false)} className="font-bold border-gray-200 text-gray-600">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApplyCustomRange}
                    disabled={!customStart || !customEnd}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6"
                  >
                    Apply Range
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            className="h-8 text-xs font-bold border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <Download className="h-3 w-3 mr-1.5 text-gray-400" />
            CSV Export
          </Button>
          <div className="text-[11px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100 ml-2 dark:bg-transparent dark:border-zinc-500">
            {format(dateRange.start, 'MMM d, yyyy')} — {format(dateRange.end, 'MMM d, yyyy')}
          </div>
        </div>
      </div>
    </div>
  );
}
