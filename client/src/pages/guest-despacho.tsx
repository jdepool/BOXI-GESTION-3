import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Componente SKU</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Transportista</TableHead>
                    <TableHead>Nro. Guía</TableHead>
                    <TableHead>Guía de Despacho</TableHead>
                    <TableHead>Estado Entrega</TableHead>
                    <TableHead>Fecha Despacho</TableHead>
                    <TableHead className="text-center">DESPACHADO</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.data.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell data-testid={`text-orden-${sale.id}`}>{sale.orden}</TableCell>
                      <TableCell data-testid={`text-nombre-${sale.id}`}>{sale.nombre}</TableCell>
                      <TableCell data-testid={`text-product-${sale.id}`}>{sale.product}</TableCell>
                      <TableCell data-testid={`text-sku-${sale.id}`}>{sale.sku || "-"}</TableCell>
                      <TableCell data-testid={`text-componente-sku-${sale.id}`}>{sale.componenteSku || "-"}</TableCell>
                      <TableCell data-testid={`text-cantidad-${sale.id}`}>{sale.cantidadComponente ?? sale.cantidad}</TableCell>
                      <TableCell data-testid={`text-transportista-${sale.id}`}>{sale.transportistaNombre || "-"}</TableCell>
                      <TableCell data-testid={`text-nroguia-${sale.id}`}>{sale.nroGuia || "-"}</TableCell>
                      <TableCell>
                        {sale.dispatchSheetId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const downloadUrl = `/api/dispatch-sheets/${sale.id}/download`;
                              window.open(downloadUrl, '_blank');
                            }}
                            data-testid={`button-download-dispatch-${sale.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {sale.dispatchSheetFileName || "Descargar"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-estado-${sale.id}`}>
                          {sale.estadoEntrega}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-fecha-${sale.id}`}>
                        {sale.fechaDespacho ? format(new Date(sale.fechaDespacho), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={sale.despachado}
                          onCheckedChange={() => handleToggleDespachado(sale)}
                          disabled={updateSaleMutation.isPending}
                          data-testid={`checkbox-despachado-${sale.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditFechaDespacho(sale)}
                          data-testid={`button-edit-fecha-${sale.id}`}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Editar Fecha
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
