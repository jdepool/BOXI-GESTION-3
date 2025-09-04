import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Save, X, Edit } from "lucide-react";
import ManualSalesForm from "./manual-sales-form";
import SalesTable from "./sales-table";
import EditSaleModal from "./edit-sale-modal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";

interface SalesResponse {
  data: any[];
  total: number;
  limit: number;
  offset: number;
}

export default function ManualSalesEntry() {
  const [showForm, setShowForm] = useState(false);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get manual sales (all manual entries)
  const { data: incompleteSales, isLoading } = useQuery<SalesResponse>({
    queryKey: ["/api/sales", { canal: "manual" }],
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
          <h2 className="text-lg font-semibold text-foreground">Ventas Manuales</h2>
          <p className="text-sm text-muted-foreground">
            Todas las ventas ingresadas manualmente - puedes editarlas aquí
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
          showEditActions={true}
          onEditSale={(sale) => setEditSale(sale)}
        />
      </div>

      <EditSaleModal
        open={!!editSale}
        onOpenChange={(open) => {
          if (!open) setEditSale(null);
        }}
        sale={editSale}
      />
    </div>
  );
}