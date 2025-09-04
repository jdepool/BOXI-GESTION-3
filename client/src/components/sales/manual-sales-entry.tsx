import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Save, X } from "lucide-react";
import ManualSalesForm from "./manual-sales-form";
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !incompleteSales?.data || incompleteSales.data.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No hay ventas pendientes
              </h3>
              <p className="text-muted-foreground mb-6">
                Aquí aparecerán las ventas que requieran información adicional o estén pendientes de completar.
              </p>
              <Button 
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2"
                data-testid="add-first-manual-sale"
              >
                <Plus className="h-4 w-4" />
                Crear Primera Venta Manual
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {incompleteSales.data.map((sale: any) => (
            <Card key={sale.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Orden #{sale.orden}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {new Date(sale.fecha).toLocaleDateString('es-ES')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <p className="font-medium">{sale.nombre}</p>
                  <p className="text-muted-foreground">{sale.email}</p>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">${Number(sale.totalUsd).toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Producto:</span>
                  <span className="font-medium truncate ml-2">{sale.product}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                    {sale.estadoEntrega}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}