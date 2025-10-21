import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, User } from "lucide-react";
import type { Prospecto } from "@shared/schema";

interface ConvertProspectoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospecto: Prospecto | null;
  onConvert: (tipo: "inmediata" | "reserva", prospecto: Prospecto) => void;
}

export default function ConvertProspectoDialog({
  open,
  onOpenChange,
  prospecto,
  onConvert,
}: ConvertProspectoDialogProps) {
  const [tipo, setTipo] = useState<"inmediata" | "reserva">("inmediata");

  const handleClose = () => {
    setTipo("inmediata");
    onOpenChange(false);
  };

  const handleConvert = () => {
    if (!prospecto) return;
    onConvert(tipo, prospecto);
    handleClose();
  };

  if (!prospecto) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Convertir Prospecto en Venta
          </DialogTitle>
          <DialogDescription>
            Selecciona el tipo de venta. El formulario se abrirá pre-llenado con la información del prospecto para que puedas agregar los productos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de Venta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipo de Venta *</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={tipo} onValueChange={(value) => setTipo(value as "inmediata" | "reserva")} data-testid="radio-tipo">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inmediata" id="inmediata" data-testid="radio-inmediata" />
                  <Label htmlFor="inmediata" className="cursor-pointer">
                    Inmediata - Abrir formulario de Venta Manual
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reserva" id="reserva" data-testid="radio-reserva" />
                  <Label htmlFor="reserva" className="cursor-pointer">
                    Reserva - Abrir formulario de Reserva Manual
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Customer Info Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Información del Cliente (Pre-llenada)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Nombre:</span> {prospecto.nombre}
                </div>
                <div>
                  <span className="font-medium">Teléfono:</span> {prospecto.telefono}
                </div>
                {prospecto.cedula && (
                  <div>
                    <span className="font-medium">Cédula:</span> {prospecto.cedula}
                  </div>
                )}
                {prospecto.email && (
                  <div>
                    <span className="font-medium">Email:</span> {prospecto.email}
                  </div>
                )}
                {prospecto.canal && (
                  <div>
                    <span className="font-medium">Canal:</span> {prospecto.canal}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Esta información se copiará al formulario. Podrás agregar productos antes de guardar la venta.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            data-testid="button-cancel-convert"
          >
            Cancelar
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleConvert}
            data-testid="button-confirm-convert"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Abrir Formulario
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
