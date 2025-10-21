import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Prospecto } from "@shared/schema";

interface ConvertProspectoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospecto: Prospecto | null;
}

export default function ConvertProspectoDialog({
  open,
  onOpenChange,
  prospecto,
}: ConvertProspectoDialogProps) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<"inmediata" | "reserva">("inmediata");

  const convertMutation = useMutation({
    mutationFn: async (data: { tipo: string; prospectoId: string }) => {
      return apiRequest("POST", "/api/prospectos/convert", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospectos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({
        title: "Prospecto convertido",
        description: `El prospecto ha sido convertido en una venta ${tipo === "inmediata" ? "inmediata" : "reserva"} exitosamente.`,
      });
      handleClose();
    },
    onError: (error: any) => {
      console.error("Failed to convert prospecto:", error);
      toast({
        title: "Error",
        description: "No se pudo convertir el prospecto. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setTipo("inmediata");
    onOpenChange(false);
  };

  const handleConvert = () => {
    if (!prospecto) return;
    convertMutation.mutate({ tipo, prospectoId: prospecto.id });
  };

  if (!prospecto) return null;

  // Parse products if available
  let products: any[] = [];
  try {
    products = prospecto.products ? JSON.parse(prospecto.products) : [];
  } catch (e) {
    products = [];
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Convertir Prospecto en Venta
          </DialogTitle>
          <DialogDescription>
            Selecciona el tipo de venta y confirma la conversión. El prospecto se eliminará y la información aparecerá en la pestaña correspondiente.
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
                    Inmediata - Venta lista para procesar
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reserva" id="reserva" data-testid="radio-reserva" />
                  <Label htmlFor="reserva" className="cursor-pointer">
                    Reserva - Venta pendiente de entrega futura
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
                Información del Cliente
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
            </CardContent>
          </Card>

          {/* Products Preview */}
          {products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Productos ({products.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {products.map((product, index) => (
                    <div key={index} className="flex justify-between text-sm border-b pb-2">
                      <span>
                        {product.producto} {product.sku && `(${product.sku})`} x{product.cantidad}
                      </span>
                      <span className="font-medium">${product.totalUsd}</span>
                    </div>
                  ))}
                  {prospecto.totalUsd && (
                    <div className="flex justify-between font-medium text-base pt-2">
                      <span>Total:</span>
                      <span>${prospecto.totalUsd}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={convertMutation.isPending}
            data-testid="button-cancel-convert"
          >
            Cancelar
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleConvert}
            disabled={convertMutation.isPending}
            data-testid="button-confirm-convert"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            {convertMutation.isPending ? "Convirtiendo..." : "Convertir en Venta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
