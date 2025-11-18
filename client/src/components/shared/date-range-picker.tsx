import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/date-utils";

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function DateRangePicker({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: DateRangePickerProps) {
  
  return (
    <div className="flex gap-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Fecha Inicio:</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-40 justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
              data-testid="filter-start-date"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate && parseLocalDate(startDate) ? format(parseLocalDate(startDate)!, "dd/MM/yyyy") : startDate ? "Fecha inválida" : "Seleccionar"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate ? parseLocalDate(startDate) : undefined}
              onSelect={(date) => {
                if (date) {
                  // Format as yyyy-MM-dd in local timezone
                  onStartDateChange(format(date, 'yyyy-MM-dd'));
                } else {
                  onStartDateChange('');
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Fecha Fin:</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-40 justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
              data-testid="filter-end-date"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate && parseLocalDate(endDate) ? format(parseLocalDate(endDate)!, "dd/MM/yyyy") : endDate ? "Fecha inválida" : "Seleccionar"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate ? parseLocalDate(endDate) : undefined}
              onSelect={(date) => {
                if (date) {
                  // Format as yyyy-MM-dd in local timezone
                  onEndDateChange(format(date, 'yyyy-MM-dd'));
                } else {
                  onEndDateChange('');
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
