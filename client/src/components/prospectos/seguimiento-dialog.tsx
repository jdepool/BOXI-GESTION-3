import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Prospecto, SeguimientoConfig } from "@shared/schema";

interface SeguimientoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospecto: Prospecto | null;
  onSave: (data: {
    fechaSeguimiento1?: string | null;
    respuestaSeguimiento1?: string;
    fechaSeguimiento2?: string | null;
    respuestaSeguimiento2?: string;
    fechaSeguimiento3?: string | null;
    respuestaSeguimiento3?: string;
  }) => void;
  onMarkAsPerdido?: (prospectoId: string, seguimientoData: {
    fechaSeguimiento1?: string | null;
    respuestaSeguimiento1?: string;
    fechaSeguimiento2?: string | null;
    respuestaSeguimiento2?: string;
    fechaSeguimiento3?: string | null;
    respuestaSeguimiento3?: string;
  }) => void;
  isSaving?: boolean;
}

export default function SeguimientoDialog({
  open,
  onOpenChange,
  prospecto,
  onSave,
  onMarkAsPerdido,
  isSaving,
}: SeguimientoDialogProps) {
  const [fecha1, setFecha1] = useState<Date | undefined>();
  const [respuesta1, setRespuesta1] = useState("");
  const [fecha2, setFecha2] = useState<Date | undefined>();
  const [respuesta2, setRespuesta2] = useState("");
  const [fecha3, setFecha3] = useState<Date | undefined>();
  const [respuesta3, setRespuesta3] = useState("");
  const [showPerdidoConfirm, setShowPerdidoConfirm] = useState(false);
  
  // Track manual edits during current session to prevent overwriting user changes
  const [manuallyEditedFecha1, setManuallyEditedFecha1] = useState(false);
  const [manuallyEditedFecha2, setManuallyEditedFecha2] = useState(false);
  const [manuallyEditedFecha3, setManuallyEditedFecha3] = useState(false);

  // Track if we've initialized for current prospecto to prevent config loading from resetting dates
  const initializedProspectoId = useRef<string | null>(null);
  
  // Track previous config values to detect when config loads
  const previousDiasFase = useRef<{ fase1: number; fase2: number; fase3: number } | null>(null);

  // Fetch seguimiento config
  const { data: config, isLoading: configLoading } = useQuery<SeguimientoConfig>({
    queryKey: ["/api/admin/seguimiento-config"],
  });

  // Use config values or defaults
  const diasFase1 = config?.diasFase1 ?? 2;
  const diasFase2 = config?.diasFase2 ?? 4;
  const diasFase3 = config?.diasFase3 ?? 7;

  useEffect(() => {
    // Only initialize once per prospecto opening to prevent config changes from resetting user edits
    if (prospecto && open && initializedProspectoId.current !== prospecto.id && !configLoading) {
      initializedProspectoId.current = prospecto.id;
      // Helper to parse date string (YYYY-MM-DD or ISO timestamp) to Date object
      const parseDate = (dateValue: string | Date | null | undefined): Date | undefined => {
        if (!dateValue) return undefined;
        if (dateValue instanceof Date) return dateValue;
        
        // Extract YYYY-MM-DD part (works for both YYYY-MM-DD and ISO timestamps)
        const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toString();
        const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        
        // Validate format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return undefined;
        
        const [year, month, day] = dateOnly.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      // Load existing data or calculate default dates
      if (prospecto.fechaSeguimiento1) {
        setFecha1(parseDate(prospecto.fechaSeguimiento1));
        setManuallyEditedFecha1(true); // Saved date = manually set
      } else {
        // Default: diasFase1 days after registration
        const registrationDate = parseDate(prospecto.fechaCreacion);
        if (registrationDate) {
          setFecha1(addDays(registrationDate, diasFase1));
          setManuallyEditedFecha1(false);
        }
      }
      setRespuesta1(prospecto.respuestaSeguimiento1 || "");

      // If fecha2 is saved, treat it as manually edited to prevent overwriting
      if (prospecto.fechaSeguimiento2) {
        setFecha2(parseDate(prospecto.fechaSeguimiento2));
        setManuallyEditedFecha2(true);
      } else if (prospecto.fechaSeguimiento1) {
        // Default: diasFase2 days after first follow-up
        const fecha1Date = parseDate(prospecto.fechaSeguimiento1);
        if (fecha1Date) {
          setFecha2(addDays(fecha1Date, diasFase2));
          setManuallyEditedFecha2(false);
        }
      } else {
        // Calculate from registration + diasFase1 + diasFase2
        const registrationDate = parseDate(prospecto.fechaCreacion);
        if (registrationDate) {
          setFecha2(addDays(registrationDate, diasFase1 + diasFase2));
          setManuallyEditedFecha2(false);
        }
      }
      setRespuesta2(prospecto.respuestaSeguimiento2 || "");

      // If fecha3 is saved, treat it as manually edited to prevent overwriting
      if (prospecto.fechaSeguimiento3) {
        setFecha3(parseDate(prospecto.fechaSeguimiento3));
        setManuallyEditedFecha3(true);
      } else if (prospecto.fechaSeguimiento2) {
        // Default: diasFase3 days after second follow-up
        const fecha2Date = parseDate(prospecto.fechaSeguimiento2);
        if (fecha2Date) {
          setFecha3(addDays(fecha2Date, diasFase3));
          setManuallyEditedFecha3(false);
        }
      } else {
        // Calculate from registration + diasFase1 + diasFase2 + diasFase3
        const registrationDate = parseDate(prospecto.fechaCreacion);
        if (registrationDate) {
          setFecha3(addDays(registrationDate, diasFase1 + diasFase2 + diasFase3));
          setManuallyEditedFecha3(false);
        }
      }
      setRespuesta3(prospecto.respuestaSeguimiento3 || "");
    }
    
    // Reset initialization tracking when dialog closes
    if (!open) {
      initializedProspectoId.current = null;
    }
  }, [prospecto, open, config, configLoading, diasFase1, diasFase2, diasFase3]);

  // Handle config loading: update dates when config values change from defaults
  // but only if user hasn't manually edited them
  useEffect(() => {
    if (open && initializedProspectoId.current === prospecto?.id && previousDiasFase.current) {
      const configChanged = 
        previousDiasFase.current.fase1 !== diasFase1 ||
        previousDiasFase.current.fase2 !== diasFase2 ||
        previousDiasFase.current.fase3 !== diasFase3;
      
      if (configChanged && prospecto) {
        // Config has loaded with different values - recalculate dates if not manually edited
        const parseDate = (isoDate: string | Date): Date => {
          if (typeof isoDate === 'string') {
            const dateOnly = isoDate.split('T')[0];
            const [year, month, day] = dateOnly.split('-').map(Number);
            return new Date(year, month - 1, day);
          }
          return isoDate;
        };
        
        // Track if we updated fecha1/fecha2 in this config change
        let updatedFecha1: Date | undefined;
        let updatedFecha2: Date | undefined;
        
        // Update fecha1 if diasFase1 changed and not manually edited
        if (previousDiasFase.current.fase1 !== diasFase1 && !manuallyEditedFecha1) {
          const registrationDate = parseDate(prospecto.fechaCreacion);
          updatedFecha1 = addDays(registrationDate, diasFase1);
          setFecha1(updatedFecha1);
        }
        
        // Update fecha2 if diasFase2 changed and not manually edited
        // Use updatedFecha1 if we just set it, otherwise use current fecha1
        if (!manuallyEditedFecha2) {
          const baseFecha1 = updatedFecha1 || fecha1;
          if (baseFecha1) {
            updatedFecha2 = addDays(baseFecha1, diasFase2);
            setFecha2(updatedFecha2);
          }
        }
        
        // Update fecha3 if diasFase3 changed and not manually edited
        // Use updatedFecha2 if we just set it, otherwise use current fecha2
        if (!manuallyEditedFecha3) {
          const baseFecha2 = updatedFecha2 || fecha2;
          if (baseFecha2) {
            setFecha3(addDays(baseFecha2, diasFase3));
          }
        }
      }
    }
    
    // Update previous values
    previousDiasFase.current = { fase1: diasFase1, fase2: diasFase2, fase3: diasFase3 };
  }, [diasFase1, diasFase2, diasFase3, open, prospecto, fecha1, fecha2, manuallyEditedFecha1, manuallyEditedFecha2, manuallyEditedFecha3]);

  // Cascading recalculation: when fecha1 changes (user edit), update fecha2 and fecha3
  // Only when fecha1 itself changes, not when config values change
  useEffect(() => {
    if (fecha1 && open && initializedProspectoId.current === prospecto?.id) {
      // Only recalculate if the user hasn't manually edited fecha2 during this session
      if (!manuallyEditedFecha2) {
        const newFecha2 = addDays(fecha1, diasFase2);
        setFecha2(newFecha2);
        
        // Also update fecha3 based on the new fecha2 if not manually edited
        if (!manuallyEditedFecha3) {
          setFecha3(addDays(newFecha2, diasFase3));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha1, open, manuallyEditedFecha1, manuallyEditedFecha2, manuallyEditedFecha3]);

  // Cascading recalculation: when fecha2 changes, update fecha3
  // Only when fecha2 itself changes, not when config values change
  useEffect(() => {
    if (fecha2 && open && initializedProspectoId.current === prospecto?.id) {
      // Only recalculate if the user hasn't manually edited fecha3 during this session
      if (!manuallyEditedFecha3) {
        setFecha3(addDays(fecha2, diasFase3));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha2, open, manuallyEditedFecha3]);

  // Wrapper functions to track manual edits
  const handleFecha1Change = (date: Date | undefined) => {
    setFecha1(date);
    setManuallyEditedFecha1(true);
  };

  const handleFecha2Change = (date: Date | undefined) => {
    setFecha2(date);
    setManuallyEditedFecha2(true);
  };

  const handleFecha3Change = (date: Date | undefined) => {
    setFecha3(date);
    setManuallyEditedFecha3(true);
  };

  // Helper to format Date as YYYY-MM-DD without timezone conversion
  const formatDateOnly = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSave = () => {
    onSave({
      fechaSeguimiento1: fecha1 ? formatDateOnly(fecha1) : null,
      respuestaSeguimiento1: respuesta1 || "",
      fechaSeguimiento2: fecha2 ? formatDateOnly(fecha2) : null,
      respuestaSeguimiento2: respuesta2 || "",
      fechaSeguimiento3: fecha3 ? formatDateOnly(fecha3) : null,
      respuestaSeguimiento3: respuesta3 || "",
    });
  };

  const handleMarkAsPerdido = () => {
    if (prospecto && onMarkAsPerdido) {
      const seguimientoData = {
        fechaSeguimiento1: fecha1 ? formatDateOnly(fecha1) : null,
        respuestaSeguimiento1: respuesta1 || "",
        fechaSeguimiento2: fecha2 ? formatDateOnly(fecha2) : null,
        respuestaSeguimiento2: respuesta2 || "",
        fechaSeguimiento3: fecha3 ? formatDateOnly(fecha3) : null,
        respuestaSeguimiento3: respuesta3 || "",
      };
      onMarkAsPerdido(prospecto.id, seguimientoData);
      setShowPerdidoConfirm(false);
    }
  };

  if (!prospecto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seguimiento - {prospecto.prospecto} - {prospecto.nombre}</DialogTitle>
        </DialogHeader>

        {configLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando configuración...
          </div>
        ) : (
        <>
          <div className="space-y-6 py-4">
          {/* Phase 1 */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-sm">Seguimiento 1</h3>
            <p className="text-xs text-muted-foreground">
              ({diasFase1} {diasFase1 === 1 ? 'día' : 'días'} después del registro)
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
                    onSelect={handleFecha1Change}
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
              ({diasFase2} {diasFase2 === 1 ? 'día' : 'días'} después del seguimiento 1)
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
              ({diasFase3} {diasFase3 === 1 ? 'día' : 'días'} después del seguimiento 2)
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

        <div className="flex justify-between gap-2">
          <Button
            variant="destructive"
            onClick={() => setShowPerdidoConfirm(true)}
            disabled={isSaving}
            data-testid="button-mark-perdido"
          >
            Perdido
          </Button>
          <div className="flex gap-2">
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
        </div>
        </>
        )}
      </DialogContent>

      <AlertDialog open={showPerdidoConfirm} onOpenChange={setShowPerdidoConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como Perdido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará el prospecto "{prospecto.nombre}" como Perdido. 
              Los prospectos perdidos podrán consultarse posteriormente a través de un reporte dedicado.
              ¿Está seguro que desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-perdido">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMarkAsPerdido}
              data-testid="button-confirm-perdido"
              className="bg-red-600 hover:bg-red-700"
            >
              Marcar como Perdido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
