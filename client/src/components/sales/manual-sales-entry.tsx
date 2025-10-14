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
  const [filters, setFilters] = useState({
    canal: "",
    estadoEntrega: "",
    asesorId: "",
    orden: "",
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get sales that need to be completed (manual and Shopify orders) - exclude Reserva orders
  const { data: incompleteSales, isLoading } = useQuery<SalesResponse>({
    queryKey: ["/api/sales", { 
      ...filters, 
      estadoEntrega: "Pendiente", 
      excludeReservas: true, 
      excludePerdida: true // Always exclude Perdida since we're hardcoded to estadoEntrega: "Pendiente"
    }], // Include both manual and Shopify orders but exclude Reserva orders
  });

  const createManualSaleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sales/manual", data),
    onSuccess: (response) => {
      // Invalidate all sales queries using predicate to ensure all variants are invalidated
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
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

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  if (showForm) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Nueva Venta Manual</h2>
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
    <>
      <div className="bg-card rounded-lg border border-border h-full">
        <SalesTable 
            data={incompleteSales?.data || []} 
            total={incompleteSales?.total || 0}
            limit={filters.limit}
            offset={filters.offset}
            isLoading={isLoading}
            hideFilters={false}
            hidePagination={false}
            showEditActions={true}
            showDeliveryDateColumn={true}
            filters={filters}
            extraExportParams={{ estadoEntrega: "Pendiente", excludeReservas: true }}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onEditSale={(sale) => setEditSale(sale)}
            activeTab="manual"
            onNewManualSale={() => setShowForm(true)}
          />
      </div>

      <EditSaleModal
        open={!!editSale}
        onOpenChange={(open) => {
          if (!open) setEditSale(null);
        }}
        sale={editSale}
      />
    </>
  );
}