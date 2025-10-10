import { useState, useEffect } from "react";
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
import { Truck, DollarSign, CalendarIcon, FileText, User, Phone, Mail, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";

// Helper function to safely parse YYYY-MM-DD as local date
const parseLocalDate = (dateString: string) => {
  if (!dateString) return undefined;
  return parse(dateString, 'yyyy-MM-dd', new Date());
};
import type { Sale, Banco } from "@shared/schema";

interface FleteData {
  montoFleteUsd: string;
  fechaFlete: string;
  referenciaFlete: string;
  montoFleteVes: string;
  bancoReceptorFlete: string;
  fleteGratis: boolean;
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
    montoFleteVes: "",
    bancoReceptorFlete: "",
    fleteGratis: false
  });


  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all sales from the same order
  const { data: orderSales = [] } = useQuery<Sale[]>({
    queryKey: ['/api/sales', { orden: sale?.orden }],
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
      // Invalidate all sales queries to ensure cache refresh
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === '/api/sales' 
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

  // Initialize form when sale changes
  useEffect(() => {
    if (sale && open) {
      const fechaValue = sale.fechaFlete ? format(new Date(sale.fechaFlete), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      setFleteData({
        montoFleteUsd: sale.montoFleteUsd ? sale.montoFleteUsd.toString() : "",
        fechaFlete: fechaValue,
        referenciaFlete: sale.referenciaFlete || "",
        montoFleteVes: sale.montoFleteVes ? sale.montoFleteVes.toString() : "",
        bancoReceptorFlete: sale.bancoReceptorFlete || "",
        fleteGratis: sale.fleteGratis || false
      });
    }
  }, [sale, open]);

  const resetForm = () => {
    setFleteData({
      montoFleteUsd: "",
      fechaFlete: "",
      referenciaFlete: "",
      montoFleteVes: "",
      bancoReceptorFlete: "",
      fleteGratis: false
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

  const handleCheckboxChange = (checked: boolean) => {
    setFleteData((prev) => ({
      ...prev,
      fleteGratis: checked
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
            Pago Flete
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
              <div className="space-y-2">
                <Label htmlFor="montoFleteUsd">Monto USD (si el pago es en USD)</Label>
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
                          setFleteData({ ...fleteData, fechaFlete: format(date, "yyyy-MM-dd") });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
                <Label htmlFor="montoFleteVes">Monto Bs (si el pago es en Bs)</Label>
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
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Seleccionar banco receptor" />
                    </div>
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
            </div>

            {/* Flete Gratis Section */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fleteGratis"
                  checked={fleteData.fleteGratis}
                  onCheckedChange={handleCheckboxChange}
                  data-testid="checkbox-flete-gratis"
                />
                <Label htmlFor="fleteGratis" className="text-lg font-semibold text-green-600">
                  FLETE GRATIS
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Si está marcado y la orden está en estado "A Despachar", puede ser procesada en Despachos.
              </p>
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