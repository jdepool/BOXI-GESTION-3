import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Producto } from "@shared/schema";

const productosPredefinidos = [
  { nombre: "Boxi Hibryd Pillow", categoria: "Pillow" },
  { nombre: "Boxi Original Pillow", categoria: "Pillow" },
  { nombre: "Boxi Seat", categoria: "Seat" },
  { nombre: "Evolve 100x190", categoria: "Colchón" },
  { nombre: "Evolve 120x190", categoria: "Colchón" },
  { nombre: "Evolve 140x190", categoria: "Colchón" },
  { nombre: "Evolve 160x190", categoria: "Colchón" },
  { nombre: "Evolve 200x200", categoria: "Colchón" },
  { nombre: "Evolve 80x190", categoria: "Colchón" },
  { nombre: "Legend 100x190", categoria: "Colchón" },
  { nombre: "Legend 120x190", categoria: "Colchón" },
  { nombre: "Legend 140x190", categoria: "Colchón" },
  { nombre: "Legend 160x190", categoria: "Colchón" },
  { nombre: "Legend 200x200", categoria: "Colchón" },
  { nombre: "Legend 80x190", categoria: "Colchón" },
  { nombre: "One 100x190", categoria: "Colchón" },
  { nombre: "One 120x190", categoria: "Colchón" },
  { nombre: "One 140x190", categoria: "Colchón" },
  { nombre: "One 160x190", categoria: "Colchón" },
  { nombre: "One 200x200", categoria: "Colchón" },
  { nombre: "One 80x190", categoria: "Colchón" },
  { nombre: "Original 100x190", categoria: "Colchón" },
  { nombre: "Original 120x190", categoria: "Colchón" },
  { nombre: "Original 140x190", categoria: "Colchón" },
  { nombre: "Original 160x190", categoria: "Colchón" },
  { nombre: "Original 200x200", categoria: "Colchón" },
  { nombre: "Original 80x190", categoria: "Colchón" },
  { nombre: "Original 100x200", categoria: "Colchón" },
  { nombre: "Original 180x200", categoria: "Colchón" },
  { nombre: "Topper Firme", categoria: "Topper" },
  { nombre: "Topper Boxi 200x200", categoria: "Topper" },
  { nombre: "Bed 140x190", categoria: "Bed" },
  { nombre: "Bed 80x190", categoria: "Bed" },
  { nombre: "Bed 100x200", categoria: "Bed" }
];

const categorias = ["Colchón", "Seat", "Pillow", "Topper", "Bed"];

export function ProductosTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({ nombre: "", sku: "", categoria: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ["/api/admin/productos"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { nombre: string; sku?: string; categoria: string }) =>
      apiRequest("POST", "/api/admin/productos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/productos"] });
      setIsDialogOpen(false);
      setFormData({ nombre: "", sku: "", categoria: "" });
      toast({ title: "Producto creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear producto", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string; sku?: string; categoria: string } }) =>
      apiRequest("PUT", `/api/admin/productos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/productos"] });
      setIsDialogOpen(false);
      setEditingProducto(null);
      setFormData({ nombre: "", sku: "", categoria: "" });
      toast({ title: "Producto actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar producto", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/productos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/productos"] });
      toast({ title: "Producto eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar producto", variant: "destructive" });
    },
  });

  const cargarProductosPredefinidos = useMutation({
    mutationFn: async () => {
      const promises = productosPredefinidos.map(producto =>
        apiRequest("POST", "/api/admin/productos", producto)
      );
      return Promise.allSettled(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/productos"] });
      toast({ title: "Productos predefinidos cargados exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al cargar productos predefinidos", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalize SKU - convert empty string to undefined to maintain database NULL semantics
    const normalizedData = {
      ...formData,
      sku: formData.sku.trim() || undefined
    };
    
    if (editingProducto) {
      updateMutation.mutate({ id: editingProducto.id, data: normalizedData });
    } else {
      createMutation.mutate(normalizedData);
    }
  };

  const openEditDialog = (producto: Producto) => {
    setEditingProducto(producto);
    setFormData({ nombre: producto.nombre, sku: producto.sku || "", categoria: producto.categoria });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingProducto(null);
    setFormData({ nombre: "", sku: "", categoria: "" });
    setIsDialogOpen(true);
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
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
          <h2 className="text-lg font-semibold">Productos</h2>
          <p className="text-sm text-muted-foreground">
            Catálogo completo de productos BoxiSleep
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => cargarProductosPredefinidos.mutate()}
            disabled={cargarProductosPredefinidos.isPending}
            data-testid="load-predefined-productos"
          >
            Cargar Predefinidos
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-producto-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProducto ? "Editar Producto" : "Agregar Producto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre del Producto</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Evolve 140x190"
                    required
                    data-testid="input-producto-nombre"
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ej: BOX-EVO-140190"
                    data-testid="input-producto-sku"
                  />
                </div>
                <div>
                  <Label htmlFor="categoria">Categoría</Label>
                  <Select 
                    value={formData.categoria} 
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger data-testid="select-categoria">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    data-testid="submit-producto"
                  >
                    {editingProducto ? "Actualizar" : "Crear"}
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
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (productos as Producto[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No hay productos registrados. Usa "Cargar Predefinidos" para agregar el catálogo completo.
                </TableCell>
              </TableRow>
            ) : (
              (productos as Producto[]).map((producto: Producto) => (
                <TableRow key={producto.id} data-testid={`producto-row-${producto.id}`}>
                  <TableCell className="font-medium">{producto.nombre}</TableCell>
                  <TableCell className="font-mono text-sm">{producto.sku || <span className="text-muted-foreground">Sin SKU</span>}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getCategoriaColor(producto.categoria)}>
                      {producto.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(producto)}
                        data-testid={`edit-producto-${producto.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(producto.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`delete-producto-${producto.id}`}
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