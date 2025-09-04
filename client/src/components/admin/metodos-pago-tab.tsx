import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MetodoPago } from "@shared/schema";

const metodosPagoPredefinidos = [
  "Cashea",
  "Efectivo / TC",
  "Efectivo",
  "Facebank",
  "Luka",
  "Mixto",
  "Mercado pago",
  "Otros",
  "Pago móvil",
  "Paypall",
  "Shopify",
  "Tarjeta Crédito",
  "Tarjeta Débito",
  "Zelle"
];

export function MetodosPagoTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMetodo, setEditingMetodo] = useState<MetodoPago | null>(null);
  const [formData, setFormData] = useState({ nombre: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: metodos = [], isLoading } = useQuery({
    queryKey: ["/api/admin/metodos-pago"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { nombre: string }) =>
      apiRequest("POST", "/api/admin/metodos-pago", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metodos-pago"] });
      setIsDialogOpen(false);
      setFormData({ nombre: "" });
      toast({ title: "Método de pago creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear método de pago", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string } }) =>
      apiRequest("PUT", `/api/admin/metodos-pago/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metodos-pago"] });
      setIsDialogOpen(false);
      setEditingMetodo(null);
      setFormData({ nombre: "" });
      toast({ title: "Método de pago actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar método de pago", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/metodos-pago/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metodos-pago"] });
      toast({ title: "Método de pago eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar método de pago", variant: "destructive" });
    },
  });

  const cargarMetodosPredefinidos = useMutation({
    mutationFn: async () => {
      const promises = metodosPagoPredefinidos.map(nombre =>
        apiRequest("POST", "/api/admin/metodos-pago", { nombre })
      );
      return Promise.allSettled(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metodos-pago"] });
      toast({ title: "Métodos de pago predefinidos cargados exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al cargar métodos predefinidos", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMetodo) {
      updateMutation.mutate({ id: editingMetodo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (metodo: MetodoPago) => {
    setEditingMetodo(metodo);
    setFormData({ nombre: metodo.nombre });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingMetodo(null);
    setFormData({ nombre: "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Métodos de Pago</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de métodos de pago aceptados por la empresa
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => cargarMetodosPredefinidos.mutate()}
            disabled={cargarMetodosPredefinidos.isPending}
            data-testid="load-predefined-metodos"
          >
            Cargar Predefinidos
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-metodo-pago-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Método
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMetodo ? "Editar Método de Pago" : "Agregar Método de Pago"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre del Método de Pago</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Transferencia bancaria"
                    required
                    data-testid="input-metodo-nombre"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="submit-metodo-pago"
                  >
                    {editingMetodo ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Método de Pago</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (metodos as MetodoPago[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                  No hay métodos de pago registrados. Usa "Cargar Predefinidos" para agregar los métodos estándar.
                </TableCell>
              </TableRow>
            ) : (
              (metodos as MetodoPago[]).map((metodo: MetodoPago) => (
                <TableRow key={metodo.id} data-testid={`metodo-pago-row-${metodo.id}`}>
                  <TableCell className="font-medium">{metodo.nombre}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(metodo)}
                        data-testid={`edit-metodo-pago-${metodo.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(metodo.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`delete-metodo-pago-${metodo.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}