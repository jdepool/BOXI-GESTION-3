import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Categoria } from "@shared/schema";

const categoriasPredefinidas = [
  "Colchón",
  "Seat", 
  "Pillow",
  "Topper",
  "Bed"
];

export function CategoriasTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({ nombre: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ["/api/admin/categorias"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { nombre: string }) =>
      apiRequest("POST", "/api/admin/categorias", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categorias"] });
      setIsDialogOpen(false);
      setFormData({ nombre: "" });
      toast({ title: "Categoría creada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear categoría", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string } }) =>
      apiRequest("PUT", `/api/admin/categorias/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categorias"] });
      setIsDialogOpen(false);
      setEditingCategoria(null);
      setFormData({ nombre: "" });
      toast({ title: "Categoría actualizada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar categoría", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/categorias/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categorias"] });
      toast({ title: "Categoría eliminada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar categoría", variant: "destructive" });
    },
  });

  const cargarCategoriasPredefinidas = useMutation({
    mutationFn: async () => {
      const promises = categoriasPredefinidas.map(nombre =>
        apiRequest("POST", "/api/admin/categorias", { nombre })
      );
      return Promise.allSettled(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categorias"] });
      toast({ title: "Categorías predefinidas cargadas exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al cargar categorías predefinidas", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategoria) {
      updateMutation.mutate({ id: editingCategoria.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormData({ nombre: categoria.nombre });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCategoria(null);
    setFormData({ nombre: "" });
    setIsDialogOpen(true);
  };

  const getCategoriaColor = (nombre: string) => {
    switch (nombre) {
      case "Colchón": return "bg-blue-100 text-blue-800";
      case "Pillow": return "bg-green-100 text-green-800";
      case "Seat": return "bg-purple-100 text-purple-800";
      case "Topper": return "bg-orange-100 text-orange-800";
      case "Bed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Categorías</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de categorías de productos
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => cargarCategoriasPredefinidas.mutate()}
            disabled={cargarCategoriasPredefinidas.isPending}
            data-testid="load-predefined-categorias"
          >
            Cargar Predefinidas
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-categoria-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategoria ? "Editar Categoría" : "Agregar Categoría"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre de la Categoría</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Colchón"
                    required
                    data-testid="input-categoria-nombre"
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
                    data-testid="submit-categoria"
                  >
                    {editingCategoria ? "Actualizar" : "Crear"}
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
              <TableHead>Categoría</TableHead>
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
            ) : (categorias as Categoria[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                  No hay categorías registradas. Usa "Cargar Predefinidas" para agregar las categorías estándar.
                </TableCell>
              </TableRow>
            ) : (
              (categorias as Categoria[]).map((categoria: Categoria) => (
                <TableRow key={categoria.id} data-testid={`categoria-row-${categoria.id}`}>
                  <TableCell>
                    <Badge variant="outline" className={getCategoriaColor(categoria.nombre)}>
                      {categoria.nombre}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(categoria)}
                        data-testid={`edit-categoria-${categoria.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(categoria.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`delete-categoria-${categoria.id}`}
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