import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Ban } from "lucide-react";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Sale, SeguimientoConfig } from "@shared/schema";

interface SeguimientoDialogOrdenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  allOrderItems?: Sale[]; // All items in the same order for display
  onSave: (data: {
    fechaSeguimiento1?: string | null;
    respuestaSeguimiento1?: string;
    fechaSeguimiento2?: string | null;
    respuestaSeguimiento2?: string;
    fechaSeguimiento3?: string | null;
    respuestaSeguimiento3?: string;
  }) => void;
  isSaving?: boolean;
}

export default function SeguimientoDialogOrden({
  open,
  onOpenChange,
  sale,
  allOrderItems = [],
  onSave,
  isSaving,
}: SeguimientoDialogOrdenProps) {
  const { toast } = useToast();
  
  const [fecha1, setFecha1] = useState<Date | undefined>();
  const [respuesta1, setRespuesta1] = useState("");
  const [fecha2, setFecha2] = useState<Date | undefined>();
  const [respuesta2, setRespuesta2] = useState("");
  const [fecha3, setFecha3] = useState<Date | undefined>();
  const [respuesta3, setRespuesta3] = useState("");
  
  // Track manual edits during current session to prevent overwriting user changes
  const [manuallyEditedFecha1, setManuallyEditedFecha1] = useState(false);
  const [manuallyEditedFecha2, setManuallyEditedFecha2] = useState(false);
  const [manuallyEditedFecha3, setManuallyEditedFecha3] = useState(false);

  // Perdida confirmation dialog state
  const [perdidaConfirmOpen, setPerdidaConfirmOpen] = useState(false);

  // Track if we've initialized for current sale to prevent config loading from resetting dates
  const initializedSaleId = useRef<string | null>(null);
  
  // Track previous config values to detect when config loads
  const previousDiasFase = useRef<{ fase1: number; fase2: number; fase3: number } | null>(null);

  // Fetch seguimiento config for 'ordenes' tipo
  const { data: config, isLoading: configLoading } = useQuery<SeguimientoConfig>({
    queryKey: ["/api/admin/seguimiento-config", "ordenes"],
  });

  // Mutation to mark an order as Perdida
  const markAsPerdidaMutation = useMutation({
    mutationFn: async (orderNumber: string) => {
      return apiRequest("PUT", `/api/sales/orders/${encodeURIComponent(orderNumber)}/mark-perdida`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({ 
        title: "Orden marcada como perdida",
        description: "La orden ha sido marcada como perdida y se ocultará de las vistas principales."
      });
      onOpenChange(false); // Close the seguimiento dialog after marking as perdida
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo marcar la orden como perdida",
        variant: "destructive",
      });
    },
  });

  // Use config values or defaults
  const diasFase1 = config?.diasFase1 ?? 2;
  const diasFase2 = config?.diasFase2 ?? 4;
  const diasFase3 = config?.diasFase3 ?? 7;

  useEffect(() => {
    // Only initialize once per sale opening to prevent config changes from resetting user edits
    if (sale && open && initializedSaleId.current !== sale.id && !configLoading) {
      initializedSaleId.current = sale.id;
      
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
      if (sale.fechaSeguimiento1) {
        setFecha1(parseDate(sale.fechaSeguimiento1));
        setManuallyEditedFecha1(true); // Saved date = manually set
      } else {
        // Default: diasFase1 days after order date
        const orderDate = parseDate(sale.fecha);
        setFecha1(addDays(orderDate, diasFase1));
        setManuallyEditedFecha1(false);
      }
      setRespuesta1(sale.respuestaSeguimiento1 || "");

      // If fecha2 is saved, treat it as manually edited to prevent overwriting
      if (sale.fechaSeguimiento2) {
        setFecha2(parseDate(sale.fechaSeguimiento2));
        setManuallyEditedFecha2(true);
      } else if (sale.fechaSeguimiento1) {
        // Default: diasFase2 days after first follow-up
        const fecha1Date = parseDate(sale.fechaSeguimiento1);
        setFecha2(addDays(fecha1Date, diasFase2));
        setManuallyEditedFecha2(false);
      } else {
        // Calculate from order date + diasFase1 + diasFase2
        const orderDate = parseDate(sale.fecha);
        setFecha2(addDays(orderDate, diasFase1 + diasFase2));
        setManuallyEditedFecha2(false);
      }
      setRespuesta2(sale.respuestaSeguimiento2 || "");

      // If fecha3 is saved, treat it as manually edited to prevent overwriting
      if (sale.fechaSeguimiento3) {
        setFecha3(parseDate(sale.fechaSeguimiento3));
        setManuallyEditedFecha3(true);
      } else if (sale.fechaSeguimiento2) {
        // Default: diasFase3 days after second follow-up
        const fecha2Date = parseDate(sale.fechaSeguimiento2);
        setFecha3(addDays(fecha2Date, diasFase3));
        setManuallyEditedFecha3(false);
      } else {
        // Calculate from order date + diasFase1 + diasFase2 + diasFase3
        const orderDate = parseDate(sale.fecha);
        setFecha3(addDays(orderDate, diasFase1 + diasFase2 + diasFase3));
        setManuallyEditedFecha3(false);
      }
      setRespuesta3(sale.respuestaSeguimiento3 || "");
    }
    
    // Reset initialization tracking when dialog closes
    if (!open) {
      initializedSaleId.current = null;
    }
  }, [sale, open, config, configLoading, diasFase1, diasFase2, diasFase3]);

  // Handle config loading: update dates when config values change from defaults
  // but only if user hasn't manually edited them
  useEffect(() => {
    if (open && initializedSaleId.current === sale?.id && previousDiasFase.current) {
      const configChanged = 
        previousDiasFase.current.fase1 !== diasFase1 ||
        previousDiasFase.current.fase2 !== diasFase2 ||
        previousDiasFase.current.fase3 !== diasFase3;
      
      if (configChanged && sale) {
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
          const orderDate = parseDate(sale.fecha);
          updatedFecha1 = addDays(orderDate, diasFase1);
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
  }, [diasFase1, diasFase2, diasFase3, open, sale, fecha1, fecha2, manuallyEditedFecha1, manuallyEditedFecha2, manuallyEditedFecha3]);

  // Cascading recalculation: when fecha1 changes (user edit), update fecha2 and fecha3
  useEffect(() => {
    if (fecha1 && open && initializedSaleId.current === sale?.id) {
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
  useEffect(() => {
    if (fecha2 && open && initializedSaleId.current === sale?.id) {
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

  if (!sale) return null;

  // Prepare order summary
  const orderItems = allOrderItems.length > 0 ? allOrderItems : [sale];
  const totalOrderValue = orderItems.reduce((sum, item) => sum + Number(item.totalUsd || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seguimiento - Orden {sale.orden}</DialogTitle>
        </DialogHeader>

        {configLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando configuración...
          </div>
        ) : (
        <>
          {/* Order Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-semibold">Cliente:</span> {sale.nombre}
              </div>
              <div>
                <span className="font-semibold">Orden:</span> {sale.orden || "N/A"}
              </div>
              <div className="col-span-2">
                <span className="font-semibold">Productos:</span>
                <ul className="list-disc list-inside ml-2 mt-1">
                  {orderItems.map((item, idx) => (
                    <li key={idx}>
                      {item.product} {item.sku ? `(${item.sku})` : ""} - Cantidad: {item.cantidad} - ${Number(item.totalUsd || 0).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              {orderItems.length > 1 && (
                <div className="col-span-2">
                  <span className="font-semibold">Total de la Orden:</span> ${totalOrderValue.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 py-4">
          {/* Phase 1 */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-sm">Seguimiento 1</h3>
            <p className="text-xs text-muted-foreground">
              ({diasFase1} {diasFase1 === 1 ? 'día' : 'días'} después de la fecha de orden)
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
                placeholder="Anotar respuesta del cliente..."
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
                placeholder="Anotar respuesta del cliente..."
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
                placeholder="Anotar respuesta del cliente..."
                rows={3}
                data-testid="textarea-respuesta-seguimiento3"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <Button
            variant="destructive"
            onClick={() => setPerdidaConfirmOpen(true)}
            disabled={isSaving || markAsPerdidaMutation.isPending}
            data-testid="button-perdida-seguimiento"
          >
            <Ban className="h-4 w-4 mr-1" />
            Perdida
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

      {/* Perdida Confirmation Dialog */}
      <AlertDialog open={perdidaConfirmOpen} onOpenChange={setPerdidaConfirmOpen}>
        <AlertDialogContent data-testid="perdida-confirm-dialog-seguimiento">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar orden perdida?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea marcar esta orden como perdida? Esta acción ocultará todas las ventas de esta orden de las vistas principales.
              {sale && (
                <div className="mt-2 text-sm font-medium">
                  Orden: {sale.orden} - {sale.nombre}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="perdida-cancel-seguimiento">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="perdida-confirm-seguimiento"
              onClick={() => {
                if (sale?.orden) {
                  markAsPerdidaMutation.mutate(sale.orden);
                }
                setPerdidaConfirmOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
