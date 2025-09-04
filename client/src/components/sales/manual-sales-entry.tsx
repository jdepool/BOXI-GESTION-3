import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Save, X } from "lucide-react";
import ManualSalesForm from "./manual-sales-form";
import SalesTable from "./sales-table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SalesResponse {
  data: any[];
  total: number;
  limit: number;
  offset: number;
}

export default function ManualSalesEntry() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get incomplete sales (manual entries that are still in progress)
  const { data: incompleteSales, isLoading } = useQuery<SalesResponse>({
    queryKey: ["/api/sales", { canal: "manual", estadoEntrega: "pendiente" }],
  });

  const createManualSaleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sales/manual", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({
        title: "Venta creada",
        description: "La venta ha sido registrada exitosamente.",
      });
      setShowForm(false);
    },
    onError: (error: any) => {
      console.error('Failed to create manual sale:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la venta. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleFormSubmit = (data: any) => {
    createManualSaleMutation.mutate(data);
  };

  if (showForm) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Nueva Venta Manual</h2>
            <p className="text-sm text-muted-foreground">
              Completa toda la información de la venta
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowForm(false)}
            data-testid="cancel-manual-sale"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
        
        <ManualSalesForm
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
          isSubmitting={createManualSaleMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Ventas por completar</h2>
          <p className="text-sm text-muted-foreground">
            Ingreso manual de datos de ventas y gestión de ventas pendientes
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
          data-testid="add-manual-sale"
        >
          <Plus className="h-4 w-4" />
          Nueva Venta Manual
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border">
        <SalesTable 
          data={incompleteSales?.data || []} 
          total={incompleteSales?.total || 0}
          limit={20}
          offset={0}
          isLoading={isLoading}
          hideFilters={true}
          hidePagination={incompleteSales?.data ? incompleteSales.data.length <= 20 : true}
        />
      </div>
    </div>
  );
}