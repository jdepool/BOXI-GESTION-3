import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Search, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Sale {
  id: string;
  orden: string;
  product: string;
  sku: string | null;
  cantidad: number;
}

export function CorregirSkusTab() {
  const [ordenSearch, setOrdenSearch] = useState("");
  const [searchedOrder, setSearchedOrder] = useState<string | null>(null);
  const [editedSkus, setEditedSkus] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sales for the searched order
  const { data: orderSales = [], isLoading, refetch } = useQuery<Sale[]>({
    queryKey: ["/api/sales", searchedOrder],
    enabled: !!searchedOrder,
    queryFn: async () => {
      if (!searchedOrder) return [];
      const response = await fetch(`/api/sales?ordenExacto=${encodeURIComponent(searchedOrder)}`);
      if (!response.ok) throw new Error("Failed to fetch order");
      const data = await response.json();
      return data.data || [];
    },
  });

  const correctMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; sku: string }>) =>
      apiRequest("PATCH", "/api/admin/sales/correct-skus", { updates }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales", searchedOrder] });
      setEditedSkus({});
      toast({
        title: "SKUs corregidos exitosamente",
        description: data.message || `${data.updatedCount} SKU(s) actualizados`,
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error al corregir SKUs",
        description: error.message || "Ocurrió un error al corregir los SKUs",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    const trimmedOrder = ordenSearch.trim();
    if (!trimmedOrder) {
      toast({
        title: "Número de orden requerido",
        description: "Por favor ingresa un número de orden",
        variant: "destructive",
      });
      return;
    }
    setSearchedOrder(trimmedOrder);
    setEditedSkus({});
  };

  const handleSkuChange = (saleId: string, newSku: string) => {
    setEditedSkus(prev => ({
      ...prev,
      [saleId]: newSku,
    }));
  };

  const getEffectiveSku = (sale: Sale): string => {
    // Return edited SKU if exists, otherwise return current SKU
    return editedSkus[sale.id] !== undefined ? editedSkus[sale.id] : (sale.sku || "");
  };

  const handleSaveChanges = () => {
    // Build updates array from edited SKUs
    const updates = Object.entries(editedSkus)
      .map(([id, sku]) => ({
        id,
        sku: sku.trim(),
      }))
      .filter(update => update.sku !== "");

    if (updates.length === 0) {
      toast({
        title: "No hay cambios para guardar",
        description: "Edita al menos un SKU antes de guardar",
        variant: "destructive",
      });
      return;
    }

    correctMutation.mutate(updates);
  };

  const hasPendingChanges = Object.keys(editedSkus).length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Corregir SKUs</CardTitle>
          <CardDescription>
            Busca una orden por su número y corrige los SKUs de los productos asociados.
            Los cambios se guardarán en la base de datos de producción.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search input */}
          <div className="flex gap-2">
            <Input
              placeholder="Número de orden (ej: 30013, 20042)"
              value={ordenSearch}
              onChange={(e) => setOrdenSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="flex-1"
              data-testid="input-orden-search"
            />
            <Button 
              onClick={handleSearch}
              disabled={isLoading}
              data-testid="button-search-order"
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>

          {/* Results */}
          {searchedOrder && (
            <>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : orderSales.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No se encontró ninguna orden con el número <strong>{searchedOrder}</strong>.
                    Verifica que el número de orden sea correcto.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Orden <strong>{searchedOrder}</strong> - {orderSales.length} producto(s)
                    </div>
                    {hasPendingChanges && (
                      <Button
                        onClick={handleSaveChanges}
                        disabled={correctMutation.isPending}
                        data-testid="button-save-changes"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {correctMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                    )}
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="w-24 text-center">Cantidad</TableHead>
                          <TableHead className="w-48">SKU Actual</TableHead>
                          <TableHead className="w-48">SKU Corregido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">{sale.product}</TableCell>
                            <TableCell className="text-center">{sale.cantidad}</TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {sale.sku || <em className="text-destructive">Sin SKU</em>}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={getEffectiveSku(sale)}
                                onChange={(e) => handleSkuChange(sale.id, e.target.value)}
                                placeholder="Nuevo SKU"
                                className="font-mono"
                                data-testid={`input-sku-${sale.id}`}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {hasPendingChanges && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Tienes cambios sin guardar. Haz clic en "Guardar Cambios" para aplicarlos.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
