import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Producto, Categoria } from "@shared/schema";

export function ProductosTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({ 
    nombre: "", 
    sku: "", 
    marcaId: "NONE",
    categoriaId: "NONE",
    subcategoriaId: "NONE",
    caracteristicaId: "NONE"
  });
  
  // Excel upload state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasBackup, setHasBackup] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ["/api/admin/productos"],
  });

  const { data: clasificaciones = [] } = useQuery<Categoria[]>({
    queryKey: ["/api/admin/categorias"],
  });

  // Filter classifications by type
  const marcas = (clasificaciones as Categoria[]).filter(c => c.tipo === "Marca");
  const categorias = (clasificaciones as Categoria[]).filter(c => c.tipo === "Categoría");
  const subcategorias = (clasificaciones as Categoria[]).filter(c => c.tipo === "Subcategoría");
  const caracteristicas = (clasificaciones as Categoria[]).filter(c => c.tipo === "Característica");

  const createMutation = useMutation({
    mutationFn: (data: { nombre: string; sku?: string; marcaId?: string; categoriaId?: string; subcategoriaId?: string; caracteristicaId?: string }) =>
      apiRequest("POST", "/api/admin/productos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/productos"] });
      setIsDialogOpen(false);
      setFormData({ nombre: "", sku: "", marcaId: "NONE", categoriaId: "NONE", subcategoriaId: "NONE", caracteristicaId: "NONE" });
      toast({ title: "Producto creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear producto", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string; sku?: string; marcaId?: string; categoriaId?: string; subcategoriaId?: string; caracteristicaId?: string } }) =>
      apiRequest("PUT", `/api/admin/productos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/productos"] });
      setIsDialogOpen(false);
      setEditingProducto(null);
      setFormData({ nombre: "", sku: "", marcaId: "NONE", categoriaId: "NONE", subcategoriaId: "NONE", caracteristicaId: "NONE" });
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

  const undoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/productos/undo");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/productos"] });
      setHasBackup(false);
      toast({ title: "Productos restaurados correctamente" });
    },
    onError: () => {
      toast({ title: "Error al restaurar productos", variant: "destructive" });
    },
  });

  const uploadExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('file', file);
      
      setUploadProgress(30);

      const response = await fetch('/api/admin/productos/upload-excel', {
        method: 'POST',
        body: formData,
      });
      
      setUploadProgress(70);

      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      
      setUploadProgress(100);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/productos"] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      setHasBackup(true);
      
      const { created, total, errors, details } = result;
      let message = `${created} productos cargados de ${total} filas`;
      
      if (errors > 0) {
        message += `, ${errors} errores encontrados`;
        if (details?.duplicates > 0) {
          message += ` (incluye ${details.duplicates} duplicados)`;
        }
      }
      
      toast({ 
        title: created > 0 ? "Excel procesado" : "Excel procesado con errores",
        description: message,
        variant: created > 0 ? "default" : "destructive"
      });
      
      if (errors > 0 && details?.errorList && details.errorList.length > 0) {
        console.log("Upload errors:", details.errorList);
        const errorSummary = details.errorList.slice(0, 5).map(
          (err: any) => `Fila ${err.row}: ${err.error}`
        ).join('\n');
        
        toast({
          title: "Errores detallados (primeros 5)",
          description: errorSummary,
          variant: "destructive",
          duration: 10000
        });
      }
    },
    onError: (error: any) => {
      setIsUploading(false);
      setUploadProgress(0);
      
      let errorMessage = error.error || error.message || 'Unknown error';
      const errorList = Array.isArray(error.details) ? error.details : error.details?.errorList;
      
      if (Array.isArray(errorList) && errorList.length > 0) {
        const errorSummary = errorList.slice(0, 5).map(
          (err: any) => `Fila ${err.row}: ${err.error}`
        ).join('\n');
        
        toast({ 
          title: "Error al cargar Excel", 
          description: errorMessage,
          variant: "destructive"
        });
        
        toast({
          title: "Errores detallados (primeros 5)",
          description: errorSummary,
          variant: "destructive",
          duration: 15000
        });
      } else {
        toast({ 
          title: "Error al cargar Excel", 
          description: errorMessage,
          variant: "destructive",
          duration: 10000
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedData = {
      nombre: formData.nombre,
      sku: formData.sku.trim() || undefined,
      marcaId: formData.marcaId === "NONE" ? undefined : formData.marcaId,
      categoriaId: formData.categoriaId === "NONE" ? undefined : formData.categoriaId,
      subcategoriaId: formData.subcategoriaId === "NONE" ? undefined : formData.subcategoriaId,
      caracteristicaId: formData.caracteristicaId === "NONE" ? undefined : formData.caracteristicaId
    };
    
    if (editingProducto) {
      updateMutation.mutate({ id: editingProducto.id, data: normalizedData });
    } else {
      createMutation.mutate(normalizedData);
    }
  };

  const openEditDialog = (producto: Producto) => {
    setEditingProducto(producto);
    setFormData({ 
      nombre: producto.nombre, 
      sku: producto.sku || "", 
      marcaId: producto.marcaId || "NONE",
      categoriaId: producto.categoriaId || "NONE",
      subcategoriaId: producto.subcategoriaId || "NONE",
      caracteristicaId: producto.caracteristicaId || "NONE"
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingProducto(null);
    setFormData({ nombre: "", sku: "", marcaId: "NONE", categoriaId: "NONE", subcategoriaId: "NONE", caracteristicaId: "NONE" });
    setIsDialogOpen(true);
  };

  const getClasificacionNombre = (clasificacionId: string | null | undefined) => {
    if (!clasificacionId) return null;
    const clasificacion = (clasificaciones as Categoria[]).find(c => c.id === clasificacionId);
    return clasificacion?.nombre || null;
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "Marca": return "bg-purple-100 text-purple-800";
      case "Categoría": return "bg-blue-100 text-blue-800";
      case "Subcategoría": return "bg-green-100 text-green-800";
      case "Característica": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
        toast({
          title: "Archivo inválido",
          description: "Solo se aceptan archivos Excel (.xlsx, .xls) y CSV (.csv)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadConfirm = () => {
    if (selectedFile) {
      uploadExcelMutation.mutate(selectedFile);
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
          {hasBackup && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => undoMutation.mutate()}
              disabled={undoMutation.isPending}
              title="Deshacer última carga"
              data-testid="undo-productos-upload"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost"
                size="icon"
                title="Subir Excel"
                data-testid="upload-excel-productos"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir Productos desde Excel</DialogTitle>
                <DialogDescription>
                  Sube un archivo Excel o CSV con las columnas: Producto, SKU (opcional), y Categoria
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Archivo Excel</Label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    data-testid="file-input-productos"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Archivo seleccionado: {selectedFile.name}
                    </p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-2">Formato esperado del Excel:</p>
                  <div className="bg-muted p-3 rounded-md">
                    <div className="font-mono text-xs">
                      <div className="grid grid-cols-3 gap-4 mb-1">
                        <div>Producto</div>
                        <div>SKU</div>
                        <div>Categoria</div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-muted-foreground">
                        <div>Evolve 140x190</div>
                        <div>EVO-140-190</div>
                        <div>Colchón</div>
                      </div>
                    </div>
                  </div>
                </div>
                {isUploading && (
                  <div className="space-y-2">
                    <Label>Progreso de carga</Label>
                    <Progress value={uploadProgress} />
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                    disabled={isUploading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUploadConfirm}
                    disabled={!selectedFile || isUploading}
                    data-testid="confirm-upload-productos"
                  >
                    {isUploading ? "Subiendo..." : "Subir Excel"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-producto-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingProducto ? "Editar Producto" : "Agregar Producto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="marca">Marca</Label>
                    <Select 
                      value={formData.marcaId} 
                      onValueChange={(value) => setFormData({ ...formData, marcaId: value })}
                    >
                      <SelectTrigger id="marca" data-testid="select-marca">
                        <SelectValue placeholder="Selecciona una marca" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Sin marca</SelectItem>
                        {marcas.map((marca) => (
                          <SelectItem key={marca.id} value={marca.id}>
                            {marca.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="categoria">Categoría</Label>
                    <Select 
                      value={formData.categoriaId} 
                      onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
                    >
                      <SelectTrigger id="categoria" data-testid="select-categoria">
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Sin categoría</SelectItem>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="subcategoria">Subcategoría</Label>
                    <Select 
                      value={formData.subcategoriaId} 
                      onValueChange={(value) => setFormData({ ...formData, subcategoriaId: value })}
                    >
                      <SelectTrigger id="subcategoria" data-testid="select-subcategoria">
                        <SelectValue placeholder="Selecciona una subcategoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Sin subcategoría</SelectItem>
                        {subcategorias.map((subcat) => (
                          <SelectItem key={subcat.id} value={subcat.id}>
                            {subcat.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="caracteristica">Característica</Label>
                    <Select 
                      value={formData.caracteristicaId} 
                      onValueChange={(value) => setFormData({ ...formData, caracteristicaId: value })}
                    >
                      <SelectTrigger id="caracteristica" data-testid="select-caracteristica">
                        <SelectValue placeholder="Selecciona una característica" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Sin característica</SelectItem>
                        {caracteristicas.map((carac) => (
                          <SelectItem key={carac.id} value={carac.id}>
                            {carac.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
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
              <TableHead>Marca</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Subcategoría</TableHead>
              <TableHead>Característica</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (productos as Producto[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay productos registrados. Usa "Subir Excel" o "Agregar Producto" para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              (productos as Producto[]).map((producto: Producto) => {
                const marca = getClasificacionNombre(producto.marcaId);
                const categoria = getClasificacionNombre(producto.categoriaId);
                const subcategoria = getClasificacionNombre(producto.subcategoriaId);
                const caracteristica = getClasificacionNombre(producto.caracteristicaId);
                
                return (
                  <TableRow key={producto.id} data-testid={`producto-row-${producto.id}`}>
                    <TableCell className="font-medium">{producto.nombre}</TableCell>
                    <TableCell className="font-mono text-sm">{producto.sku || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      {marca ? (
                        <Badge variant="outline" className={getTipoColor("Marca")}>
                          {marca}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {categoria ? (
                        <Badge variant="outline" className={getTipoColor("Categoría")}>
                          {categoria}
                        </Badge>
                      ) : producto.categoria ? (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                          {producto.categoria}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {subcategoria ? (
                        <Badge variant="outline" className={getTipoColor("Subcategoría")}>
                          {subcategoria}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {caracteristica ? (
                        <Badge variant="outline" className={getTipoColor("Característica")}>
                          {caracteristica}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
