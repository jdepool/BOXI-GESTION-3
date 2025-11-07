import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SaleWithMissingSku {
  id: string;
  orden: string | null;
  product: string | null;
  sku: string | null;
  suggestedSku: string | null;
}

export function EnriquecerSkusTab() {
  const [editedSkus, setEditedSkus] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: salesWithMissingSku = [], isLoading } = useQuery<SaleWithMissingSku[]>({
    queryKey: ["/api/admin/sales/missing-skus"],
  });

  const enrichMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; sku: string }>) =>
      apiRequest("PATCH", "/api/admin/sales/enrich-skus", { updates }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales/missing-skus"] });
      setEditedSkus({});
      toast({
        title: "SKUs actualizados exitosamente",
        description: data.message || `${data.updatedCount} SKU(s) actualizados`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar SKUs",
        description: error.message || "Ocurrió un error al actualizar los SKUs",
        variant: "destructive",
      });
    },
  });

  const handleSkuChange = (saleId: string, newSku: string) => {
    setEditedSkus(prev => ({
      ...prev,
      [saleId]: newSku,
    }));
  };

  const getEffectiveSku = (sale: SaleWithMissingSku): string => {
    // Return edited SKU if exists, otherwise return suggested SKU
    return editedSkus[sale.id] ?? sale.suggestedSku ?? "";
  };

  const handleApplySingle = (sale: SaleWithMissingSku) => {
    const effectiveSku = getEffectiveSku(sale);
    
    if (!effectiveSku || effectiveSku.trim() === "") {
      toast({
        title: "SKU vacío",
        description: "Por favor ingresa un SKU válido",
        variant: "destructive",
      });
      return;
    }

    enrichMutation.mutate([{ id: sale.id, sku: effectiveSku }]);
  };

  const handleApplyAll = () => {
    const updates = salesWithMissingSku
      .map(sale => {
        const effectiveSku = getEffectiveSku(sale);
        return effectiveSku && effectiveSku.trim() !== ""
          ? { id: sale.id, sku: effectiveSku }
          : null;
      })
      .filter((update): update is { id: string; sku: string } => update !== null);

    if (updates.length === 0) {
      toast({
        title: "No hay SKUs para aplicar",
        description: "Asegúrate de que haya SKUs sugeridos o ingresados manualmente",
        variant: "destructive",
      });
      return;
    }

    enrichMutation.mutate(updates);
  };

  const hasPendingChanges = Object.keys(editedSkus).length > 0;
  const skusWithSuggestions = salesWithMissingSku.filter(
    sale => sale.suggestedSku || editedSkus[sale.id]
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Enriquecer SKUs</CardTitle>
          <CardDescription>
            Actualiza los SKUs de órdenes que tienen valores NULL. Los SKUs sugeridos se calculan automáticamente 
            basándose en el nombre del producto. Puedes editar manualmente cualquier SKU antes de aplicarlo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salesWithMissingSku.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ¡Excelente! No hay órdenes con SKU NULL. Todas las órdenes tienen SKU asignado.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">{salesWithMissingSku.length}</span> órdenes con SKU NULL
                  {skusWithSuggestions > 0 && (
                    <> • <span className="font-semibold">{skusWithSuggestions}</span> con SKU sugerido o editado</>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleApplyAll}
                    disabled={enrichMutation.isPending || skusWithSuggestions === 0}
                    data-testid="button-apply-all-skus"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Aplicar Todos ({skusWithSuggestions})
                  </Button>
                </div>
              </div>

              {hasPendingChanges && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Tienes {Object.keys(editedSkus).length} SKU(s) editados manualmente. 
                    Haz clic en "Aplicar" para guardarlos en la base de datos.
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Orden</TableHead>
                      <TableHead className="min-w-[250px]">Producto</TableHead>
                      <TableHead className="w-[120px]">SKU Actual</TableHead>
                      <TableHead className="w-[120px]">SKU Sugerido</TableHead>
                      <TableHead className="w-[200px]">SKU Editable</TableHead>
                      <TableHead className="w-[100px]">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesWithMissingSku.map((sale) => {
                      const effectiveSku = getEffectiveSku(sale);
                      const isEdited = sale.id in editedSkus;

                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-sm" data-testid={`text-orden-${sale.id}`}>
                            {sale.orden || "-"}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate" title={sale.product || ""} data-testid={`text-product-${sale.id}`}>
                            {sale.product || "-"}
                          </TableCell>
                          <TableCell data-testid={`text-sku-actual-${sale.id}`}>
                            <span className="text-muted-foreground italic">NULL</span>
                          </TableCell>
                          <TableCell data-testid={`text-sku-suggested-${sale.id}`}>
                            {sale.suggestedSku ? (
                              <span className="font-mono text-sm text-green-600 dark:text-green-400">
                                {sale.suggestedSku}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={effectiveSku}
                              onChange={(e) => handleSkuChange(sale.id, e.target.value)}
                              placeholder="Ingresa SKU"
                              className={isEdited ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}
                              data-testid={`input-sku-${sale.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleApplySingle(sale)}
                              disabled={enrichMutation.isPending || !effectiveSku}
                              data-testid={`button-apply-${sale.id}`}
                            >
                              Aplicar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
