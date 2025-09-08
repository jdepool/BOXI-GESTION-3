import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Edit, Package, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Sale } from "@shared/schema";

export function EdicionOrdenesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Sale | null>(null);
  const [formData, setFormData] = useState({
    estadoEntrega: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch orders with A Despachar status
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/sales", { estadoEntrega: "A Despachar" }],
    queryFn: () => 
      fetch("/api/sales?estadoEntrega=A Despachar")
        .then(res => res.json())
        .then(data => data.data || []),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { estadoEntrega: string } }) =>
      apiRequest("PUT", `/api/sales/${id}`, data),
    onSuccess: () => {
      // Invalidate all sales-related queries and metrics
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/metrics"] });
      setIsDialogOpen(false);
      setEditingOrder(null);
      setFormData({ estadoEntrega: "" });
      toast({ title: "Orden actualizada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar orden", variant: "destructive" });
    },
  });

  const handleEdit = (order: Sale) => {
    setEditingOrder(order);
    setFormData({
      estadoEntrega: order.estadoEntrega,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    updateOrderMutation.mutate({
      id: editingOrder.id,
      data: {
        estadoEntrega: formData.estadoEntrega,
      },
    });
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "A Despachar":
        return "default";
      case "DELIVERED":
        return "secondary";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Edición de Órdenes
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las órdenes pendientes por despacho (A Despachar)
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {orders.length} órdenes pendientes
          </Badge>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Total USD</TableHead>
              <TableHead>Estado Entrega</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  Cargando órdenes...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  No hay órdenes pendientes por despacho
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order: Sale) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orden}</TableCell>
                  <TableCell>{order.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.canal}</Badge>
                  </TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(order.fecha)}
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(order.totalUsd)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.estadoEntrega)}>
                      {order.estadoEntrega}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(order)}
                      data-testid={`edit-order-${order.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Orden</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 py-4">
              {editingOrder && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Orden:</Label>
                    <div className="col-span-3 font-semibold">
                      {editingOrder.orden}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Cliente:</Label>
                    <div className="col-span-3">
                      {editingOrder.nombre}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="estadoEntrega" className="text-right">
                      Estado de Entrega:
                    </Label>
                    <div className="col-span-3">
                      <Select
                        value={formData.estadoEntrega}
                        onValueChange={(value) =>
                          setFormData({ ...formData, estadoEntrega: value })
                        }
                      >
                        <SelectTrigger data-testid="select-estado-entrega">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A Despachar">A Despachar</SelectItem>
                          <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                          <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                          <SelectItem value="IN TRANSIT">IN TRANSIT</SelectItem>
                          <SelectItem value="PROCESSING">PROCESSING</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                data-testid="cancel-edit-order"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateOrderMutation.isPending}
                data-testid="save-order-changes"
              >
                {updateOrderMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}