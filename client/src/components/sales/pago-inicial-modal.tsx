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
  fechaPagoInicial?: Date | string | null;
  bancoReceptorInicial?: string | null;
  referenciaInicial?: string | null;
  montoInicialBs?: string | number | null;
  montoInicialUsd?: string | number | null;
  estadoPagoInicial?: string | null;
}

interface Banco {
  id: string;
  banco: string;
  tipo: string;
}

interface PagoInicialModalProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PagoInicialModal({ sale, open, onOpenChange }: PagoInicialModalProps) {
  const { toast } = useToast();
  
  const [pagoData, setPagoData] = useState({
    fechaPagoInicial: new Date() as Date | null,
    pagoInicialUsd: "",
    bancoReceptorInicial: "",
    referenciaInicial: "",
    montoInicialBs: "",
    montoInicialUsd: "",
  });

  const [errors, setErrors] = useState({
    pagoInicialUsd: false,
    bancoReceptorInicial: false,
    referenciaInicial: false,
  });

  // Fetch banks for the dropdown
  const { data: allBanks = [] } = useQuery<Banco[]>({
    queryKey: ["/api/admin/bancos"],
  });
  
  // Filter to show only Receptor banks (for incoming payments)
  const banks = allBanks.filter(bank => bank.tipo === "Receptor");

  // Initialize form data when sale changes
  useEffect(() => {
    if (sale) {
      setPagoData({
        fechaPagoInicial: sale.fechaPagoInicial ? new Date(sale.fechaPagoInicial) : new Date(),
        pagoInicialUsd: sale.pagoInicialUsd?.toString() || "",
        bancoReceptorInicial: sale.bancoReceptorInicial || "",
        referenciaInicial: sale.referenciaInicial || "",
        montoInicialBs: sale.montoInicialBs?.toString() || "",
        montoInicialUsd: sale.montoInicialUsd?.toString() || "",
      });
    }
  }, [sale]);

  // Reset errors when modal opens
  useEffect(() => {
    if (open) {
      setErrors({
        pagoInicialUsd: false,
        bancoReceptorInicial: false,
        referenciaInicial: false,
      });
    }
  }, [open]);

  const updatePagoMutation = useMutation({
    mutationFn: async (data: typeof pagoData) => {
      if (!sale?.id) throw new Error("Sale ID is required");

      const payload = {
        fechaPagoInicial: data.fechaPagoInicial?.toISOString() || null,
        pagoInicialUsd: data.pagoInicialUsd ? parseFloat(data.pagoInicialUsd) : null,
        bancoReceptorInicial: data.bancoReceptorInicial || null,
        referenciaInicial: data.referenciaInicial || null,
        montoInicialBs: data.montoInicialBs ? parseFloat(data.montoInicialBs) : null,
        montoInicialUsd: data.montoInicialUsd ? parseFloat(data.montoInicialUsd) : null,
      };

      return apiRequest("PATCH", `/api/sales/${encodeURIComponent(sale.orden)}/pago-inicial`, payload);
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
    setPagoData((prev) => ({ ...prev, fechaPagoInicial: date || null }));
  };

  const validateFields = () => {
    const newErrors = {
      pagoInicialUsd: !pagoData.pagoInicialUsd || parseFloat(pagoData.pagoInicialUsd) <= 0,
      bancoReceptorInicial: !pagoData.bancoReceptorInicial || pagoData.bancoReceptorInicial.trim() === "",
      referenciaInicial: !pagoData.referenciaInicial || pagoData.referenciaInicial.trim() === "",
    };

    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some(error => error);
    
    if (hasErrors) {
      toast({
        title: "Campos obligatorios incompletos",
        description: "Por favor completa: Pago Inicial/Total USD, Banco Receptor y Referencia",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSave = () => {
    // First check mandatory fields
    if (!validateFields()) {
      return;
    }

    // Check for warning: at least one monto field should be filled
    const hasMontoData = pagoData.montoInicialBs || pagoData.montoInicialUsd;
    
    if (!hasMontoData) {
      toast({
        title: "No has incluído el Monto pagado",
        description: "Considera agregar el monto pagado en Bs o USD",
        variant: "default",
      });
    }

    // Proceed with save even if warning was shown
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
                <Label htmlFor="fechaPagoInicial">Fecha Pago Inicial/Total</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !pagoData.fechaPagoInicial && "text-muted-foreground"
                      )}
                      data-testid="input-fecha-pago"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pagoData.fechaPagoInicial ? format(pagoData.fechaPagoInicial, "dd/MM/yyyy") : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pagoData.fechaPagoInicial || undefined}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagoInicialUsd" className={errors.pagoInicialUsd ? "text-destructive" : ""}>
                  Pago Inicial/Total USD *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pagoInicialUsd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={pagoData.pagoInicialUsd}
                    onChange={handleInputChange("pagoInicialUsd")}
                    className={cn("pl-10", errors.pagoInicialUsd && "border-destructive focus-visible:ring-destructive")}
                    data-testid="input-pago-inicial-usd"
                  />
                </div>
                {errors.pagoInicialUsd && (
                  <p className="text-sm text-destructive">Este campo es obligatorio</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bancoReceptorInicial" className={errors.bancoReceptorInicial ? "text-destructive" : ""}>
                  Banco Receptor *
                </Label>
                <Select
                  value={pagoData.bancoReceptorInicial}
                  onValueChange={handleSelectChange("bancoReceptorInicial")}
                >
                  <SelectTrigger 
                    id="bancoReceptorInicial"
                    data-testid="select-banco-pago"
                    className={cn(errors.bancoReceptorInicial && "border-destructive focus:ring-destructive")}
                  >
                    <SelectValue placeholder="Seleccionar banco receptor" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.banco}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bancoReceptorInicial && (
                  <p className="text-sm text-destructive">Debes seleccionar un banco</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenciaInicial" className={errors.referenciaInicial ? "text-destructive" : ""}>
                  Referencia *
                </Label>
                <Input
                  id="referenciaInicial"
                  placeholder="Referencia de pago últimos 8 números"
                  value={pagoData.referenciaInicial}
                  onChange={handleInputChange("referenciaInicial")}
                  className={cn(errors.referenciaInicial && "border-destructive focus-visible:ring-destructive")}
                  data-testid="input-referencia-pago"
                />
                {errors.referenciaInicial && (
                  <p className="text-sm text-destructive">Este campo es obligatorio</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="montoInicialBs">Monto Bs (si el pago es en Bs)</Label>
                <Input
                  id="montoInicialBs"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={pagoData.montoInicialBs}
                  onChange={handleInputChange("montoInicialBs")}
                  data-testid="input-monto-bs-pago"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="montoInicialUsd">Monto USD (si el pago es en USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="montoInicialUsd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={pagoData.montoInicialUsd}
                    onChange={handleInputChange("montoInicialUsd")}
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
