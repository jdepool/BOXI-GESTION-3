import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Prospecto } from "@shared/schema";

interface SeguimientoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospecto: Prospecto | null;
  onSave: (data: {
    fechaSeguimiento1?: Date | null;
    respuestaSeguimiento1?: string;
    fechaSeguimiento2?: Date | null;
    respuestaSeguimiento2?: string;
    fechaSeguimiento3?: Date | null;
    respuestaSeguimiento3?: string;
  }) => void;
  isSaving?: boolean;
}

export default function SeguimientoDialog({
  open,
  onOpenChange,
  prospecto,
  onSave,
  isSaving,
}: SeguimientoDialogProps) {
  const [fecha1, setFecha1] = useState<Date | undefined>();
  const [respuesta1, setRespuesta1] = useState("");
  const [fecha2, setFecha2] = useState<Date | undefined>();
  const [respuesta2, setRespuesta2] = useState("");
  const [fecha3, setFecha3] = useState<Date | undefined>();
  const [respuesta3, setRespuesta3] = useState("");
  
  // Track manual edits during current session to prevent overwriting user changes
  const [manuallyEditedFecha2, setManuallyEditedFecha2] = useState(false);
  const [manuallyEditedFecha3, setManuallyEditedFecha3] = useState(false);

  useEffect(() => {
    if (prospecto && open) {
      // Helper to parse date from ISO timestamp to Date object without timezone shift
      const parseDate = (isoDate: string | Date): Date => {
        if (typeof isoDate === 'string') {
          const dateOnly = isoDate.split('T')[0];
          const [year, month, day] = dateOnly.split('-').map(Number);
          return new Date(year, month - 1, day);
        }
        return isoDate;
      };

      // Load existing data or calculate default dates
      if (prospecto.fechaSeguimiento1) {
        setFecha1(parseDate(prospecto.fechaSeguimiento1));
      } else {
        // Default: 2 days after registration
        const registrationDate = parseDate(prospecto.fechaCreacion);
        setFecha1(addDays(registrationDate, 2));
      }
      setRespuesta1(prospecto.respuestaSeguimiento1 || "");

      // If fecha2 is saved, treat it as manually edited to prevent overwriting
      if (prospecto.fechaSeguimiento2) {
        setFecha2(parseDate(prospecto.fechaSeguimiento2));
        setManuallyEditedFecha2(true);
      } else if (prospecto.fechaSeguimiento1) {
        // Default: 4 days after first follow-up
        const fecha1Date = parseDate(prospecto.fechaSeguimiento1);
        setFecha2(addDays(fecha1Date, 4));
        setManuallyEditedFecha2(false);
      } else {
        // Calculate from registration + 2 days + 4 days
        const registrationDate = parseDate(prospecto.fechaCreacion);
        setFecha2(addDays(registrationDate, 6));
        setManuallyEditedFecha2(false);
      }
      setRespuesta2(prospecto.respuestaSeguimiento2 || "");

      // If fecha3 is saved, treat it as manually edited to prevent overwriting
      if (prospecto.fechaSeguimiento3) {
        setFecha3(parseDate(prospecto.fechaSeguimiento3));
        setManuallyEditedFecha3(true);
      } else if (prospecto.fechaSeguimiento2) {
        // Default: 7 days after second follow-up
        const fecha2Date = parseDate(prospecto.fechaSeguimiento2);
        setFecha3(addDays(fecha2Date, 7));
        setManuallyEditedFecha3(false);
      } else {
        // Calculate from registration + 2 + 4 + 7 days
        const registrationDate = parseDate(prospecto.fechaCreacion);
        setFecha3(addDays(registrationDate, 13));
        setManuallyEditedFecha3(false);
      }
      setRespuesta3(prospecto.respuestaSeguimiento3 || "");
    }
  }, [prospecto, open]);

  // Cascading recalculation: when fecha1 changes, update fecha2 and fecha3
  useEffect(() => {
    if (fecha1 && open) {
      // Only recalculate if the user hasn't manually edited fecha2 during this session
      if (!manuallyEditedFecha2) {
        const newFecha2 = addDays(fecha1, 4);
        setFecha2(newFecha2);
        
        // Also update fecha3 based on the new fecha2 if not manually edited
        if (!manuallyEditedFecha3) {
          setFecha3(addDays(newFecha2, 7));
        }
      }
    }
  }, [fecha1, open, manuallyEditedFecha2, manuallyEditedFecha3]);

  // Cascading recalculation: when fecha2 changes, update fecha3
  useEffect(() => {
    if (fecha2 && open) {
      // Only recalculate if the user hasn't manually edited fecha3 during this session
      if (!manuallyEditedFecha3) {
        setFecha3(addDays(fecha2, 7));
      }
    }
  }, [fecha2, open, manuallyEditedFecha3]);

  // Wrapper functions to track manual edits
  const handleFecha2Change = (date: Date | undefined) => {
    setFecha2(date);
    setManuallyEditedFecha2(true);
  };

  const handleFecha3Change = (date: Date | undefined) => {
    setFecha3(date);
    setManuallyEditedFecha3(true);
  };

  const handleSave = () => {
    onSave({
      fechaSeguimiento1: fecha1 || null,
      respuestaSeguimiento1: respuesta1 || "",
      fechaSeguimiento2: fecha2 || null,
      respuestaSeguimiento2: respuesta2 || "",
      fechaSeguimiento3: fecha3 || null,
      respuestaSeguimiento3: respuesta3 || "",
    });
  };

  if (!prospecto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seguimiento - {prospecto.prospecto} - {prospecto.nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Phase 1 */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-sm">Seguimiento 1</h3>
            <p className="text-xs text-muted-foreground">
              (2 días después del registro)
            </p>
            <div className="space-y-2">
              <Label>Fecha de Contacto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fecha1 && "text-muted-foreground"
                    )}
                    data-testid="input-fecha-seguimiento1"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fecha1 ? format(fecha1, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fecha1}
                    onSelect={setFecha1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="respuesta1">Respuesta / Notas</Label>
              <Textarea
                id="respuesta1"
                value={respuesta1}
                onChange={(e) => setRespuesta1(e.target.value)}
                placeholder="Anotar respuesta del prospecto..."
                rows={3}
                data-testid="textarea-respuesta-seguimiento1"
              />
            </div>
          </div>

          {/* Phase 2 */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-sm">Seguimiento 2</h3>
            <p className="text-xs text-muted-foreground">
              (4 días después del seguimiento 1)
            </p>
            <div className="space-y-2">
              <Label>Fecha de Contacto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fecha2 && "text-muted-foreground"
                    )}
                    data-testid="input-fecha-seguimiento2"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fecha2 ? format(fecha2, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fecha2}
                    onSelect={handleFecha2Change}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="respuesta2">Respuesta / Notas</Label>
              <Textarea
                id="respuesta2"
                value={respuesta2}
                onChange={(e) => setRespuesta2(e.target.value)}
                placeholder="Anotar respuesta del prospecto..."
                rows={3}
                data-testid="textarea-respuesta-seguimiento2"
              />
            </div>
          </div>

          {/* Phase 3 */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-sm">Seguimiento 3</h3>
            <p className="text-xs text-muted-foreground">
              (7 días después del seguimiento 2)
            </p>
            <div className="space-y-2">
              <Label>Fecha de Contacto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fecha3 && "text-muted-foreground"
                    )}
                    data-testid="input-fecha-seguimiento3"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fecha3 ? format(fecha3, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fecha3}
                    onSelect={handleFecha3Change}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="respuesta3">Respuesta / Notas</Label>
              <Textarea
                id="respuesta3"
                value={respuesta3}
                onChange={(e) => setRespuesta3(e.target.value)}
                placeholder="Anotar respuesta del prospecto..."
                rows={3}
                data-testid="textarea-respuesta-seguimiento3"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            data-testid="button-cancel-seguimiento"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            data-testid="button-save-seguimiento"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
