import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Asesor } from "@shared/schema";

export function AsesorTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsesor, setEditingAsesor] = useState<Asesor | null>(null);
  const [formData, setFormData] = useState({ nombre: "", activo: true });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: asesores = [], isLoading } = useQuery<Asesor[]>({
    queryKey: ["/api/admin/asesores"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { nombre: string; activo: boolean }) =>
      apiRequest("POST", "/api/admin/asesores", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/asesores"] });
      setIsDialogOpen(false);
      setFormData({ nombre: "", activo: true });
      toast({ title: "Asesor creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear asesor", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string; activo: boolean } }) =>
      apiRequest("PUT", `/api/admin/asesores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/asesores"] });
      setIsDialogOpen(false);
      setEditingAsesor(null);
      setFormData({ nombre: "", activo: true });
      toast({ title: "Asesor actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar asesor", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/asesores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/asesores"] });
      toast({ title: "Asesor eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar asesor", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAsesor) {
      updateMutation.mutate({ id: editingAsesor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (asesor: Asesor) => {
    setEditingAsesor(asesor);
    setFormData({ nombre: asesor.nombre, activo: asesor.activo });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingAsesor(null);
    setFormData({ nombre: "", activo: true });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Asesores</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de asesores de ventas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="add-asesor-button">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Asesor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAsesor ? "Editar Asesor" : "Agregar Asesor"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre del Asesor</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  required
                  data-testid="input-nombre"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  data-testid="switch-activo"
                />
                <Label htmlFor="activo">Activo</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="cancel-button"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="save-button"
                >
                  {editingAsesor ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  Cargando asesores...
                </TableCell>
              </TableRow>
            ) : asesores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No hay asesores registrados
                </TableCell>
              </TableRow>
            ) : (
              asesores.map((asesor) => (
                <TableRow key={asesor.id} data-testid={`asesor-row-${asesor.id}`}>
                  <TableCell className="font-medium">{asesor.nombre}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        asesor.activo
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {asesor.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {asesor.createdAt ? new Date(asesor.createdAt).toLocaleDateString("es-ES") : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(asesor)}
                        data-testid={`edit-asesor-${asesor.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("¿Estás seguro de que quieres eliminar este asesor?")) {
                            deleteMutation.mutate(asesor.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        data-testid={`delete-asesor-${asesor.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
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