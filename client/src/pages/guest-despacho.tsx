import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Calendar, Shield, Download } from "lucide-react";
import { format } from "date-fns";

type Sale = {
  id: string;
  orden: string;
  nombre: string;
  product: string;
  sku: string | null;
  cantidad: number;
  componenteSku: string | null;
  cantidadComponente: number;
  transportistaNombre: string | null;
  nroGuia: string | null;
  fechaDespacho: string | null;
  despachado: boolean;
  estadoEntrega: string;
  dispatchSheetId: string | null;
  dispatchSheetFileName: string | null;
};

export default function GuestDespacho() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [newFechaDespacho, setNewFechaDespacho] = useState("");

  const handleDispatchSheetDownload = async (dispatchSheetId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/dispatch-sheets/${dispatchSheetId}/download`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (!tokenParam) {
      toast({
        title: "Error de Acceso",
        description: "Token de acceso no proporcionado",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    setToken(tokenParam);
  }, [navigate, toast]);

  // Fetch sales data using guest token
  const { data: salesData, isLoading } = useQuery<{ data: Sale[] }>({
    queryKey: ["/api/guest/sales", { search: searchQuery }],
    enabled: !!token,
    queryFn: async () => {
      const url = new URL("/api/guest/sales", window.location.origin);
      if (searchQuery) {
        url.searchParams.set("search", searchQuery);
      }
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch sales data");
      }
      return response.json();
    },
  });

  // Update fecha despacho mutation
  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { fechaDespacho?: string; despachado?: boolean } }) => {
      const response = await fetch(`/api/guest/sales/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update sale");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest/sales"] });
      toast({
        title: "Actualizado",
        description: "Los datos han sido actualizados exitosamente.",
      });
      setSelectedSale(null);
      setNewFechaDespacho("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar",
        variant: "destructive",
      });
    },
  });

  const handleEditFechaDespacho = (sale: Sale) => {
    setSelectedSale(sale);
    setNewFechaDespacho(sale.fechaDespacho || "");
  };

  const handleSaveFechaDespacho = () => {
    if (!selectedSale) return;
    updateSaleMutation.mutate({
      id: selectedSale.id,
      updates: { fechaDespacho: newFechaDespacho },
    });
  };

  const handleToggleDespachado = (sale: Sale) => {
    updateSaleMutation.mutate({
      id: sale.id,
      updates: { despachado: !sale.despachado },
    });
  };

  if (!token) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Guest Mode Banner */}
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
        <Shield className="h-4 w-4" />
        <AlertTitle>Modo Invitado - Despacho</AlertTitle>
        <AlertDescription>
          Estás usando acceso de invitado con permisos limitados. Puedes editar la fecha de despacho y marcar órdenes como despachadas.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <Label>Buscar por Orden o Nombre</Label>
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-sales"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : !salesData || salesData.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron ventas
            </div>
          ) : (
            <div className="relative border rounded-lg">
              <div className="overflow-x-auto max-w-full">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left text-xs font-medium whitespace-nowrap">Orden</th>
                        <th className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap">Nombre</th>
                        <th className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap">Producto</th>
                        <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">SKU</th>
                        <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">Comp SKU</th>
                        <th className="px-2 py-2 text-center text-xs font-medium whitespace-nowrap">Cant</th>
                        <th className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap">Transportista</th>
                        <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">Nro Guía</th>
                        <th className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap">Guía PDF</th>
                        <th className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap">Estado</th>
                        <th className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap">Fecha Desp.</th>
                        <th className="px-3 py-2 text-center text-xs font-medium whitespace-nowrap bg-amber-50 dark:bg-amber-950">
                          <div className="font-bold">DESPACHADO</div>
                        </th>
                        <th className="sticky right-0 z-10 bg-muted/50 px-3 py-2 text-right text-xs font-medium whitespace-nowrap">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {salesData.data.map((sale) => (
                        <tr key={sale.id} className="hover:bg-muted/50">
                          <td className="sticky left-0 z-10 bg-background px-3 py-2 text-sm whitespace-nowrap font-medium" data-testid={`text-orden-${sale.id}`}>
                            {sale.orden}
                          </td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap" data-testid={`text-nombre-${sale.id}`}>
                            {sale.nombre}
                          </td>
                          <td className="px-3 py-2 text-sm max-w-[200px] truncate" data-testid={`text-product-${sale.id}`} title={sale.product}>
                            {sale.product}
                          </td>
                          <td className="px-2 py-2 text-sm whitespace-nowrap text-muted-foreground" data-testid={`text-sku-${sale.id}`}>
                            {sale.sku || "-"}
                          </td>
                          <td className="px-2 py-2 text-sm whitespace-nowrap text-muted-foreground" data-testid={`text-componente-sku-${sale.id}`}>
                            {sale.componenteSku || "-"}
                          </td>
                          <td className="px-2 py-2 text-sm text-center whitespace-nowrap" data-testid={`text-cantidad-${sale.id}`}>
                            {sale.cantidadComponente ?? sale.cantidad}
                          </td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap" data-testid={`text-transportista-${sale.id}`}>
                            {sale.transportistaNombre || "-"}
                          </td>
                          <td className="px-2 py-2 text-sm whitespace-nowrap" data-testid={`text-nroguia-${sale.id}`}>
                            {sale.nroGuia || "-"}
                          </td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap">
                            {sale.dispatchSheetId ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={() => handleDispatchSheetDownload(sale.dispatchSheetId!, sale.dispatchSheetFileName || "guia.pdf")}
                                data-testid={`button-download-dispatch-${sale.id}`}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap">
                            <Badge variant="outline" className="text-xs" data-testid={`badge-estado-${sale.id}`}>
                              {sale.estadoEntrega}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap" data-testid={`text-fecha-${sale.id}`}>
                            {sale.fechaDespacho ? format(new Date(sale.fechaDespacho), "dd/MM/yyyy") : "-"}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap bg-amber-50 dark:bg-amber-950">
                            <Checkbox
                              checked={sale.despachado}
                              onCheckedChange={() => handleToggleDespachado(sale)}
                              disabled={updateSaleMutation.isPending}
                              data-testid={`checkbox-despachado-${sale.id}`}
                            />
                          </td>
                          <td className="sticky right-0 z-10 bg-background px-3 py-2 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              onClick={() => handleEditFechaDespacho(sale)}
                              data-testid={`button-edit-fecha-${sale.id}`}
                            >
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              <span className="text-xs">Editar</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center py-2 border-t bg-muted/30">
                ← Desliza horizontalmente para ver todas las columnas →
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fecha de Despacho</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div>
                <Label>Orden</Label>
                <Input value={selectedSale.orden} disabled />
              </div>
              <div>
                <Label>Nombre</Label>
                <Input value={selectedSale.nombre} disabled />
              </div>
              <div>
                <Label>Fecha de Despacho</Label>
                <Input
                  type="date"
                  value={newFechaDespacho}
                  onChange={(e) => setNewFechaDespacho(e.target.value)}
                  data-testid="input-nueva-fecha"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedSale(null)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveFechaDespacho}
              disabled={updateSaleMutation.isPending}
              data-testid="button-save"
            >
              {updateSaleMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
