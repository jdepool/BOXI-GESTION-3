import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Shield, Package } from "lucide-react";

type Inventario = {
  id: string;
  almacen: string;
  producto: string;
  stockActual: number;
  stockReservado: number;
  stockMinimo: number;
  costoUnitario: number | null;
  precio: number | null;
};

export default function GuestInventario() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInventario, setSelectedInventario] = useState<Inventario | null>(null);
  const [formData, setFormData] = useState({
    stockActual: 0,
    stockReservado: 0,
    stockMinimo: 0,
  });

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

  // Fetch inventario data using guest token
  const { data: inventarioData, isLoading } = useQuery<{ data: Inventario[] }>({
    queryKey: ["/api/guest/inventario", { search: searchQuery }],
    enabled: !!token,
    queryFn: async () => {
      const url = new URL("/api/guest/inventario", window.location.origin);
      if (searchQuery) {
        url.searchParams.set("search", searchQuery);
      }
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch inventario data");
      }
      return response.json();
    },
  });

  // Update inventario mutation
  const updateInventarioMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Inventario> }) => {
      const response = await fetch(`/api/guest/inventario/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update inventario");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest/inventario"] });
      toast({
        title: "Actualizado",
        description: "El inventario ha sido actualizado exitosamente.",
      });
      setSelectedInventario(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el inventario",
        variant: "destructive",
      });
    },
  });

  const handleEditInventario = (inventario: Inventario) => {
    setSelectedInventario(inventario);
    setFormData({
      stockActual: inventario.stockActual,
      stockReservado: inventario.stockReservado,
      stockMinimo: inventario.stockMinimo,
    });
  };

  const handleSaveInventario = () => {
    if (!selectedInventario) return;
    updateInventarioMutation.mutate({
      id: selectedInventario.id,
      data: formData,
    });
  };

  if (!token) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Guest Mode Banner */}
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Shield className="h-4 w-4" />
        <AlertTitle>Modo Invitado - Inventario</AlertTitle>
        <AlertDescription>
          Estás usando acceso de invitado con permisos limitados. Puedes editar niveles de stock pero no costos ni precios.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <Label>Buscar por Producto o Almacén</Label>
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-inventario"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : !inventarioData || inventarioData.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontró inventario
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Almacén</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Stock Actual</TableHead>
                  <TableHead>Stock Reservado</TableHead>
                  <TableHead>Stock Mínimo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventarioData.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell data-testid={`text-almacen-${item.id}`}>{item.almacen}</TableCell>
                    <TableCell data-testid={`text-producto-${item.id}`}>{item.producto}</TableCell>
                    <TableCell data-testid={`text-stock-actual-${item.id}`}>{item.stockActual}</TableCell>
                    <TableCell data-testid={`text-stock-reservado-${item.id}`}>{item.stockReservado}</TableCell>
                    <TableCell data-testid={`text-stock-minimo-${item.id}`}>{item.stockMinimo}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditInventario(item)}
                        data-testid={`button-edit-inventario-${item.id}`}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Editar Stock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selectedInventario} onOpenChange={(open) => !open && setSelectedInventario(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Inventario</DialogTitle>
          </DialogHeader>
          {selectedInventario && (
            <div className="space-y-4">
              <div>
                <Label>Almacén</Label>
                <Input value={selectedInventario.almacen} disabled />
              </div>
              <div>
                <Label>Producto</Label>
                <Input value={selectedInventario.producto} disabled />
              </div>
              <div>
                <Label>Stock Actual</Label>
                <Input
                  type="number"
                  value={formData.stockActual}
                  onChange={(e) => setFormData({ ...formData, stockActual: parseInt(e.target.value) || 0 })}
                  data-testid="input-stock-actual"
                />
              </div>
              <div>
                <Label>Stock Reservado</Label>
                <Input
                  type="number"
                  value={formData.stockReservado}
                  onChange={(e) => setFormData({ ...formData, stockReservado: parseInt(e.target.value) || 0 })}
                  data-testid="input-stock-reservado"
                />
              </div>
              <div>
                <Label>Stock Mínimo</Label>
                <Input
                  type="number"
                  value={formData.stockMinimo}
                  onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value) || 0 })}
                  data-testid="input-stock-minimo"
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Nota: Los costos y precios no pueden ser editados en modo invitado.
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedInventario(null)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveInventario}
              disabled={updateInventarioMutation.isPending}
              data-testid="button-save"
            >
              {updateInventarioMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
