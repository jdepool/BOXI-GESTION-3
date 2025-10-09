import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CalendarIcon, DollarSign, User, CreditCard } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Sale {
  id: string;
  nombre: string;
  orden: string;
  fecha: Date;
  canal: string;
  totalUsd: string | number;
  totalOrderUsd?: string | number | null;
  tipo: string;
  estadoEntrega: string;
  pagoInicialUsd?: string | number | null;
  bancoId?: string | null;
  referencia?: string | null;
  montoBs?: string | number | null;
  montoUsd?: string | number | null;
  estadoPagoInicial?: string | null;
}

interface Banco {
  id: string;
  banco: string;
}

interface PagoInicialModalProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PagoInicialModal({ sale, open, onOpenChange }: PagoInicialModalProps) {
  const { toast } = useToast();
  
  const [pagoData, setPagoData] = useState({
    fecha: new Date() as Date | null,
    pagoInicialUsd: "",
    bancoId: "none",
    referencia: "",
    montoBs: "",
    montoUsd: "",
  });

  // Fetch banks for the dropdown
  const { data: banks = [] } = useQuery<Banco[]>({
    queryKey: ["/api/admin/bancos"],
  });

  // Initialize form data when sale changes
  useEffect(() => {
    if (sale) {
      setPagoData({
        fecha: new Date(),
        pagoInicialUsd: sale.pagoInicialUsd?.toString() || "",
        bancoId: sale.bancoId || "none",
        referencia: sale.referencia || "",
        montoBs: sale.montoBs?.toString() || "",
        montoUsd: sale.montoUsd?.toString() || "",
      });
    }
  }, [sale]);

  const updatePagoMutation = useMutation({
    mutationFn: async (data: typeof pagoData) => {
      if (!sale?.id) throw new Error("Sale ID is required");

      const payload = {
        fecha: data.fecha?.toISOString() || null,
        pagoInicialUsd: data.pagoInicialUsd ? parseFloat(data.pagoInicialUsd) : null,
        bancoId: data.bancoId && data.bancoId !== "none" ? data.bancoId : null,
        referencia: data.referencia || null,
        montoBs: data.montoBs ? parseFloat(data.montoBs) : null,
        montoUsd: data.montoUsd ? parseFloat(data.montoUsd) : null,
      };

      return apiRequest("PATCH", `/api/sales/${sale.orden}/pago-inicial`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/sales');
      }});
      toast({ title: "Pago inicial actualizado exitosamente" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar pago inicial",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof typeof pagoData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPagoData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelectChange = (field: keyof typeof pagoData) => (value: string) => {
    setPagoData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setPagoData((prev) => ({ ...prev, fecha: date || null }));
  };

  const handleSave = () => {
    updatePagoMutation.mutate(pagoData);
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pago Inicial/Total
          </DialogTitle>
          <DialogDescription>
            Registra la información del pago inicial o pago total de la orden
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
                <span className="font-medium">Total Order USD:</span>
                <span>${sale.totalOrderUsd || sale.totalUsd}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Orden:</span>
                <span>{sale.orden}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{sale.canal}</Badge>
                <Badge variant="secondary">{sale.tipo}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Información de Pago
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha Pago Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !pagoData.fecha && "text-muted-foreground"
                      )}
                      data-testid="input-fecha-pago"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pagoData.fecha ? format(pagoData.fecha, "dd/MM/yyyy") : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pagoData.fecha || undefined}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagoInicialUsd">Pago Inicial/Total USD</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pagoInicialUsd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={pagoData.pagoInicialUsd}
                    onChange={handleInputChange("pagoInicialUsd")}
                    className="pl-10"
                    data-testid="input-pago-inicial-usd"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bancoId">Banco</Label>
                <Select
                  value={pagoData.bancoId}
                  onValueChange={handleSelectChange("bancoId")}
                >
                  <SelectTrigger data-testid="select-banco-pago">
                    <SelectValue placeholder="Seleccionar banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin banco</SelectItem>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.banco}
                      </SelectItem>
                    ))}
                    <SelectItem value="otro">Otro ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referencia">Referencia</Label>
                <Input
                  id="referencia"
                  placeholder="Número de referencia"
                  value={pagoData.referencia}
                  onChange={handleInputChange("referencia")}
                  data-testid="input-referencia-pago"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="montoBs">Monto en Bs (Opcional)</Label>
                <Input
                  id="montoBs"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={pagoData.montoBs}
                  onChange={handleInputChange("montoBs")}
                  data-testid="input-monto-bs-pago"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="montoUsd">Monto en USD (Opcional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="montoUsd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={pagoData.montoUsd}
                    onChange={handleInputChange("montoUsd")}
                    className="pl-10"
                    data-testid="input-monto-usd-pago"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updatePagoMutation.isPending}
              data-testid="button-cancel-pago"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={updatePagoMutation.isPending}
              data-testid="button-save-pago"
            >
              {updatePagoMutation.isPending ? "Guardando..." : "Guardar Pago"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
