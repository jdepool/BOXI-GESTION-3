import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Truck, DollarSign, CalendarIcon, User, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Helper function to safely parse YYYY-MM-DD as local date
const parseLocalDate = (dateString: string) => {
  if (!dateString) return undefined;
  return parse(dateString, 'yyyy-MM-dd', new Date());
};

// Helper function to format Date to YYYY-MM-DD in local timezone
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to extract YYYY-MM-DD from database timestamp (prevents timezone shift)
const extractDateFromTimestamp = (timestamp: string | Date) => {
  if (!timestamp) return '';
  // If it's a string like "2025-10-16T00:00:00.000Z", extract just the date part
  const dateStr = timestamp.toString();
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
};
import type { Sale, Banco } from "@shared/schema";

interface FleteData {
  montoFleteUsd: string;
  fechaFlete: string;
  pagoFleteUsd: string;
  referenciaFlete: string;
  montoFleteBs: string;
  bancoReceptorFlete: string;
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
    pagoFleteUsd: "",
    referenciaFlete: "",
    montoFleteBs: "",
    bancoReceptorFlete: ""
  });

  const prevOpenRef = useRef(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all sales from the same order
  const { data: orderSales = [] } = useQuery<Sale[]>({
    queryKey: ['/api/sales', { ordenExacto: sale?.orden }],
    enabled: !!sale?.orden,
    select: (data: any) => data?.data || [],
  });

  // Load banks data
  const { data: allBancos = [] } = useQuery<Array<{ id: string; banco: string; tipo: string }>>({
    queryKey: ["/api/admin/bancos"],
  });
  
  // Filter to show only Receptor banks (for incoming payments)
  const bancos = allBancos.filter(banco => banco.tipo === "Receptor");

  // Update flete mutation
  const updateFleteMutation = useMutation({
    mutationFn: async (data: FleteData) => {
      if (!sale?.orden) throw new Error("Order number is required");
      
      return apiRequest("PATCH", `/api/sales/${encodeURIComponent(sale.orden)}/flete`, data);
    },
    onSuccess: () => {
      toast({
        title: "Flete actualizado",
        description: "Los datos del flete han sido guardados correctamente",
      });
      // Invalidate all sales queries to ensure cache refresh
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return Array.isArray(query.queryKey) && 
                 typeof query.queryKey[0] === 'string' && 
                 query.queryKey[0].startsWith('/api/sales');
        }
      });
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

  // Initialize form only when modal opens (not on sale data updates while open)
  useEffect(() => {
    // Only initialize when modal transitions from closed to open
    const isOpening = !prevOpenRef.current && open;
    
    if (sale && isOpening) {
      const fechaValue = sale.fechaFlete ? extractDateFromTimestamp(sale.fechaFlete) : formatLocalDate(new Date());
      setFleteData({
        montoFleteUsd: sale.montoFleteUsd ? sale.montoFleteUsd.toString() : "",
        fechaFlete: fechaValue,
        pagoFleteUsd: sale.pagoFleteUsd ? sale.pagoFleteUsd.toString() : "",
        referenciaFlete: sale.referenciaFlete || "",
        montoFleteBs: sale.montoFleteBs ? sale.montoFleteBs.toString() : "",
        bancoReceptorFlete: sale.bancoReceptorFlete || ""
      });
    }
    
    // Update ref to track current open state
    prevOpenRef.current = open;
  }, [sale, open]);

  const resetForm = () => {
    setFleteData({
      montoFleteUsd: "",
      fechaFlete: "",
      pagoFleteUsd: "",
      referenciaFlete: "",
      montoFleteBs: "",
      bancoReceptorFlete: ""
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

  const validateFleteFields = () => {
    // Require Pago Flete USD, Banco Receptor, and Referencia
    if (!fleteData.pagoFleteUsd || parseFloat(fleteData.pagoFleteUsd) <= 0) {
      toast({
        title: "Campo requerido",
        description: "Debe ingresar el Pago Flete USD",
        variant: "destructive"
      });
      return false;
    }
    
    if (!fleteData.bancoReceptorFlete) {
      toast({
        title: "Campo requerido",
        description: "Debe seleccionar el Banco Receptor",
        variant: "destructive"
      });
      return false;
    }
    
    if (!fleteData.referenciaFlete || fleteData.referenciaFlete.trim() === '') {
      toast({
        title: "Campo requerido",
        description: "Debe ingresar la Referencia",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleSave = () => {
    if (!sale) return;

    // Validate before saving
    if (!validateFleteFields()) {
      return;
    }

    updateFleteMutation.mutate(fleteData);
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Pago Flete
          </DialogTitle>
          <DialogDescription>
            Complete la información de pago del flete. Pago Flete USD, Banco Receptor y Referencia son obligatorios.
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
              <div>
                <div className="space-y-1">
                  {orderSales.length > 0 ? (
                    orderSales.map((orderSale, index) => (
                      <div key={index} className="text-sm" data-testid={`sku-item-${index}`}>
                        {orderSale.sku || 'N/A'} × {orderSale.cantidad}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm" data-testid="sku-item-0">
                      {sale.sku || 'N/A'} × {sale.cantidad}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="font-medium">Fecha:</span>
                <span>{format(new Date(sale.fecha), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{sale.canal}</Badge>
                <Badge variant="secondary">{sale.tipo || 'Inmediato'}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Flete Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Información de Pago
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Fecha Pago Flete */}
              <div className="space-y-2">
                <Label htmlFor="fechaFlete">Fecha Pago Flete</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fleteData.fechaFlete && "text-muted-foreground"
                      )}
                      data-testid="input-fecha-flete"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fleteData.fechaFlete ? format(parseLocalDate(fleteData.fechaFlete) || new Date(), "dd/MM/yyyy") : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseLocalDate(fleteData.fechaFlete)}
                      onSelect={(date) => {
                        if (date) {
                          setFleteData({ ...fleteData, fechaFlete: formatLocalDate(date) });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* 2. Pago Flete USD */}
              <div className="space-y-2">
                <Label htmlFor="pagoFleteUsd">Pago Flete USD</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pagoFleteUsd"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={fleteData.pagoFleteUsd}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty, numbers, and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFleteData(prev => ({ ...prev, pagoFleteUsd: value }));
                      }
                    }}
                    className="pl-10"
                    data-testid="input-pago-flete-usd"
                  />
                </div>
              </div>

              {/* 3. Banco Receptor */}
              <div className="space-y-2">
                <Label htmlFor="bancoReceptorFlete">Banco Receptor</Label>
                <Select
                  value={fleteData.bancoReceptorFlete}
                  onValueChange={(value) => {
                    setFleteData((prev) => ({
                      ...prev,
                      bancoReceptorFlete: value
                    }));
                  }}
                >
                  <SelectTrigger data-testid="select-banco-receptor-flete">
                    <SelectValue placeholder="Seleccionar banco receptor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(bancos as Banco[]).map((banco: Banco) => (
                      <SelectItem key={banco.id} value={banco.id}>
                        {banco.banco}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Referencia */}
              <div className="space-y-2">
                <Label htmlFor="referenciaFlete">Referencia</Label>
                <Input
                  id="referenciaFlete"
                  type="text"
                  placeholder="Referencia de pago últimos 8 números"
                  value={fleteData.referenciaFlete}
                  onChange={handleInputChange('referenciaFlete')}
                  data-testid="input-referencia-flete"
                />
              </div>

              {/* 5. Monto Bs (si el pago es en Bs) */}
              <div className="space-y-2">
                <Label htmlFor="montoFleteBs">Monto Bs (si el pago es en Bs)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-sm text-muted-foreground font-semibold">Bs</span>
                  <Input
                    id="montoFleteBs"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={fleteData.montoFleteBs}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty, numbers, and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFleteData(prev => ({ ...prev, montoFleteBs: value }));
                      }
                    }}
                    className="pl-10"
                    data-testid="input-monto-flete-bs"
                  />
                </div>
              </div>

              {/* 6. Monto USD (si el pago es en USD) */}
              <div className="space-y-2">
                <Label htmlFor="montoFleteUsd">Monto USD (si el pago es en USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="montoFleteUsd"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={fleteData.montoFleteUsd}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty, numbers, and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFleteData(prev => ({ ...prev, montoFleteUsd: value }));
                      }
                    }}
                    className="pl-10"
                    data-testid="input-monto-flete-usd"
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