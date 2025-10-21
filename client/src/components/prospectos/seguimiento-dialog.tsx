import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDays, format } from "date-fns";
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
  const [fecha1, setFecha1] = useState("");
  const [respuesta1, setRespuesta1] = useState("");
  const [fecha2, setFecha2] = useState("");
  const [respuesta2, setRespuesta2] = useState("");
  const [fecha3, setFecha3] = useState("");
  const [respuesta3, setRespuesta3] = useState("");

  useEffect(() => {
    if (prospecto && open) {
      // Helper to extract YYYY-MM-DD from ISO timestamp
      const extractDate = (isoDate: string | Date) => {
        const dateStr = typeof isoDate === 'string' ? isoDate : isoDate.toISOString();
        return dateStr.split('T')[0]; // Extract YYYY-MM-DD
      };

      // Load existing data or calculate default dates
      if (prospecto.fechaSeguimiento1) {
        setFecha1(extractDate(prospecto.fechaSeguimiento1));
      } else {
        // Default: 2 days after registration
        const registrationDate = extractDate(prospecto.fechaCreacion);
        const defaultFecha1 = addDays(new Date(registrationDate), 2);
        setFecha1(format(defaultFecha1, "yyyy-MM-dd"));
      }
      setRespuesta1(prospecto.respuestaSeguimiento1 || "");

      if (prospecto.fechaSeguimiento2) {
        setFecha2(extractDate(prospecto.fechaSeguimiento2));
      } else if (prospecto.fechaSeguimiento1) {
        // Default: 4 days after first follow-up
        const fecha1 = extractDate(prospecto.fechaSeguimiento1);
        const defaultFecha2 = addDays(new Date(fecha1), 4);
        setFecha2(format(defaultFecha2, "yyyy-MM-dd"));
      } else {
        // Calculate from registration + 2 days + 4 days
        const registrationDate = extractDate(prospecto.fechaCreacion);
        const defaultFecha2 = addDays(new Date(registrationDate), 6);
        setFecha2(format(defaultFecha2, "yyyy-MM-dd"));
      }
      setRespuesta2(prospecto.respuestaSeguimiento2 || "");

      if (prospecto.fechaSeguimiento3) {
        setFecha3(extractDate(prospecto.fechaSeguimiento3));
      } else if (prospecto.fechaSeguimiento2) {
        // Default: 7 days after second follow-up
        const fecha2 = extractDate(prospecto.fechaSeguimiento2);
        const defaultFecha3 = addDays(new Date(fecha2), 7);
        setFecha3(format(defaultFecha3, "yyyy-MM-dd"));
      } else {
        // Calculate from registration + 2 + 4 + 7 days
        const registrationDate = extractDate(prospecto.fechaCreacion);
        const defaultFecha3 = addDays(new Date(registrationDate), 13);
        setFecha3(format(defaultFecha3, "yyyy-MM-dd"));
      }
      setRespuesta3(prospecto.respuestaSeguimiento3 || "");
    }
  }, [prospecto, open]);

  const handleSave = () => {
    onSave({
      fechaSeguimiento1: fecha1 ? new Date(fecha1) : null,
      respuestaSeguimiento1: respuesta1 || "",
      fechaSeguimiento2: fecha2 ? new Date(fecha2) : null,
      respuestaSeguimiento2: respuesta2 || "",
      fechaSeguimiento3: fecha3 ? new Date(fecha3) : null,
      respuestaSeguimiento3: respuesta3 || "",
    });
  };

  if (!prospecto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seguimiento - {prospecto.prospecto}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Phase 1 */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold text-sm">Seguimiento 1</h3>
            <p className="text-xs text-muted-foreground">
              (2 días después del registro)
            </p>
            <div className="space-y-2">
              <Label htmlFor="fecha1">Fecha de Contacto</Label>
              <Input
                id="fecha1"
                type="date"
                value={fecha1}
                onChange={(e) => setFecha1(e.target.value)}
                data-testid="input-fecha-seguimiento1"
              />
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
              <Label htmlFor="fecha2">Fecha de Contacto</Label>
              <Input
                id="fecha2"
                type="date"
                value={fecha2}
                onChange={(e) => setFecha2(e.target.value)}
                data-testid="input-fecha-seguimiento2"
              />
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
              <Label htmlFor="fecha3">Fecha de Contacto</Label>
              <Input
                id="fecha3"
                type="date"
                value={fecha3}
                onChange={(e) => setFecha3(e.target.value)}
                data-testid="input-fecha-seguimiento3"
              />
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
