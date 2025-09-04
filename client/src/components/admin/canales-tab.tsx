import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Canal } from "@shared/schema";

const canalesPredefinidos = [
  { nombre: "Cashea", activo: "true" },
  { nombre: "Shopify", activo: "true" },
  { nombre: "Treble", activo: "true" },
  { nombre: "Manual", activo: "true" }
];

export function CanalesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCanal, setEditingCanal] = useState<Canal | null>(null);
  const [formData, setFormData] = useState({ nombre: "", activo: "true" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: canales = [], isLoading } = useQuery({
    queryKey: ["/api/admin/canales"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { nombre: string; activo: string }) =>
      apiRequest("POST", "/api/admin/canales", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canales"] });
      setIsDialogOpen(false);
      setFormData({ nombre: "", activo: "true" });
      toast({ title: "Canal creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear canal", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string; activo: string } }) =>
      apiRequest("PUT", `/api/admin/canales/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canales"] });
      setIsDialogOpen(false);
      setEditingCanal(null);
      setFormData({ nombre: "", activo: "true" });
      toast({ title: "Canal actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar canal", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/canales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canales"] });
      toast({ title: "Canal eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar canal", variant: "destructive" });
    },
  });

  const loadPredefinedCanales = async () => {
    try {
      for (const canal of canalesPredefinidos) {
        await createMutation.mutateAsync(canal);
      }
      toast({ title: "Canales predefinidos cargados exitosamente" });
    } catch (error) {
      toast({ title: "Error al cargar canales predefinidos", variant: "destructive" });
    }
  };

  const handleEdit = (canal: Canal) => {
    setEditingCanal(canal);
    setFormData({
      nombre: canal.nombre,
      activo: canal.activo,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCanal) {
      updateMutation.mutate({
        id: editingCanal.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setEditingCanal(null);
    setFormData({ nombre: "", activo: "true" });
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gestión de Canales
          </h3>
          <p className="text-sm text-muted-foreground">
            Administra los canales de venta disponibles en el sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canales.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadPredefinedCanales}
              disabled={createMutation.isPending}
              data-testid="load-predefined-canales"
            >
              Cargar Canales Predefinidos
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="add-canal">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Canal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCanal ? "Editar Canal" : "Nuevo Canal"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="nombre" className="text-right">
                      Nombre:
                    </Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      className="col-span-3"
                      required
                      data-testid="input-canal-nombre"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="activo" className="text-right">
                      Estado:
                    </Label>
                    <div className="col-span-3">
                      <Select
                        value={formData.activo}
                        onValueChange={(value) =>
                          setFormData({ ...formData, activo: value })
                        }
                      >
                        <SelectTrigger data-testid="select-canal-activo">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Activo</SelectItem>
                          <SelectItem value="false">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    data-testid="cancel-canal"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="save-canal"
                  >
                    {editingCanal ? "Actualizar" : "Crear"}
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
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  Cargando canales...
                </TableCell>
              </TableRow>
            ) : canales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  No hay canales registrados
                </TableCell>
              </TableRow>
            ) : (
              canales.map((canal: Canal) => (
                <TableRow key={canal.id}>
                  <TableCell className="font-medium">{canal.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={canal.activo === "true" ? "default" : "secondary"}>
                      {canal.activo === "true" ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canal.createdAt ? new Date(canal.createdAt).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(canal)}
                        data-testid={`edit-canal-${canal.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(canal.id)}
                        data-testid={`delete-canal-${canal.id}`}
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