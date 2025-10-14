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
import type { TipoEgreso } from "@shared/schema";

export function TiposEgresosTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoEgreso | null>(null);
  const [formData, setFormData] = useState({ nombre: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["/api/admin/tipos-egresos"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { nombre: string }) =>
      apiRequest("POST", "/api/admin/tipos-egresos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tipos-egresos"] });
      setIsDialogOpen(false);
      setFormData({ nombre: "" });
      toast({ title: "Tipo de egreso creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear tipo de egreso", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string } }) =>
      apiRequest("PUT", `/api/admin/tipos-egresos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tipos-egresos"] });
      setIsDialogOpen(false);
      setEditingTipo(null);
      setFormData({ nombre: "" });
      toast({ title: "Tipo de egreso actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar tipo de egreso", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/tipos-egresos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tipos-egresos"] });
      toast({ title: "Tipo de egreso eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar tipo de egreso", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTipo) {
      updateMutation.mutate({ id: editingTipo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (tipo: TipoEgreso) => {
    setEditingTipo(tipo);
    setFormData({ nombre: tipo.nombre });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTipo(null);
    setFormData({ nombre: "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Tipos de Egresos</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de categorías de gastos y egresos de la empresa
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-tipo-egreso-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Tipo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTipo ? "Editar Tipo de Egreso" : "Agregar Tipo de Egreso"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre del Tipo de Egreso</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Gastos de oficina"
                    required
                    data-testid="input-tipo-nombre"
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
                    data-testid="submit-tipo-egreso"
                  >
                    {editingTipo ? "Actualizar" : "Crear"}
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
              <TableHead>Tipo de Egreso</TableHead>
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
            ) : (tipos as TipoEgreso[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                  No hay tipos de egresos registrados. Usa "Agregar Tipo" para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              (tipos as TipoEgreso[]).map((tipo: TipoEgreso) => (
                <TableRow key={tipo.id} data-testid={`tipo-egreso-row-${tipo.id}`}>
                  <TableCell className="font-medium">{tipo.nombre}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(tipo)}
                        data-testid={`edit-tipo-egreso-${tipo.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(tipo.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`delete-tipo-egreso-${tipo.id}`}
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