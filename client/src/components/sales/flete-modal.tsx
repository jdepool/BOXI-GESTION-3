import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Truck, DollarSign, CalendarIcon, FileText, User, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Sale } from "@shared/schema";

interface FleteData {
  montoFleteUsd: string;
  fechaFlete: string;
  referenciaFlete: string;
  montoFleteVes: string;
}

interface FleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}

export default function FleteModal({ open, onOpenChange, sale }: FleteModalProps) {
  const [fleteData, setFleteData] = useState<FleteData>({
    montoFleteUsd: "",
    fechaFlete: "",
    referenciaFlete: "",
    montoFleteVes: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update flete mutation
  const updateFleteMutation = useMutation({
    mutationFn: async (data: { saleId: string; flete: FleteData }) => {
      const response = await fetch(`/api/sales/${data.saleId}/flete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data.flete)
      });
      if (!response.ok) {
        throw new Error('Failed to update flete');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Flete actualizado",
        description: "Los datos del flete han sido guardados correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos del flete",
        variant: "destructive"
      });
    }
  });

  // Initialize form when sale changes
  useEffect(() => {
    if (sale && open) {
      setFleteData({
        montoFleteUsd: sale.montoFleteUsd ? sale.montoFleteUsd.toString() : "",
        fechaFlete: sale.fechaFlete ? format(new Date(sale.fechaFlete), 'yyyy-MM-dd') : "",
        referenciaFlete: sale.referenciaFlete || "",
        montoFleteVes: sale.montoFleteVes ? sale.montoFleteVes.toString() : ""
      });
    }
  }, [sale, open]);

  const resetForm = () => {
    setFleteData({
      montoFleteUsd: "",
      fechaFlete: "",
      referenciaFlete: "",
      montoFleteVes: ""
    });
  };

  const handleInputChange = (field: keyof FleteData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFleteData((prev) => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSave = () => {
    if (!sale) return;

    updateFleteMutation.mutate({
      saleId: sale.id,
      flete: fleteData
    });
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Datos del Flete
          </DialogTitle>
          <DialogDescription>
            Puedes guardar solo con el monto en US$ y completar los demás datos después. El ícono del camión se pondrá naranja una vez guardado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sale Information */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">Cliente:</span>
                <span>{sale.nombre}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">Total USD:</span>
                <span>${sale.totalUsd}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="font-medium">Fecha:</span>
                <span>{format(new Date(sale.fecha), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{sale.canal}</Badge>
                <Badge variant="secondary">{sale.estadoEntrega}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Flete Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Información del Flete
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="montoFleteUsd">Monto en US$</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="montoFleteUsd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={fleteData.montoFleteUsd}
                    onChange={handleInputChange('montoFleteUsd')}
                    className="pl-10"
                    data-testid="input-monto-flete-usd"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaFlete">Fecha</Label>
                <div className="relative">
                  <Input
                    id="fechaFlete"
                    type="text"
                    value={fleteData.fechaFlete ? format(new Date(fleteData.fechaFlete), "dd/MM/yyyy") : ""}
                    placeholder="Seleccionar fecha"
                    readOnly
                    className="pr-10 cursor-default"
                    data-testid="input-fecha-flete"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0 hover:bg-muted"
                        data-testid="button-calendar-trigger"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end" side="bottom">
                      <Calendar
                        mode="single"
                        selected={fleteData.fechaFlete ? new Date(fleteData.fechaFlete) : undefined}
                        onSelect={(date) => {
                          setFleteData((prev) => ({
                            ...prev,
                            fechaFlete: date ? format(date, 'yyyy-MM-dd') : ""
                          }));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenciaFlete">Referencia</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="referenciaFlete"
                    type="text"
                    placeholder="Referencia del flete"
                    value={fleteData.referenciaFlete}
                    onChange={handleInputChange('referenciaFlete')}
                    className="pl-10"
                    data-testid="input-referencia-flete"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="montoFleteVes">Monto en VES</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-sm text-muted-foreground font-semibold">Bs</span>
                  <Input
                    id="montoFleteVes"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={fleteData.montoFleteVes}
                    onChange={handleInputChange('montoFleteVes')}
                    className="pl-10"
                    data-testid="input-monto-flete-ves"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-flete"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateFleteMutation.isPending}
              data-testid="button-save-flete"
            >
              {updateFleteMutation.isPending ? "Guardando..." : "Guardar Flete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}