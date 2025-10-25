import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Categoria } from "@shared/schema";

type ClasificacionTipo = "Marca" | "Categoría" | "Subcategoría" | "Característica";

export function CategoriasTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({ nombre: "", tipo: "Categoría" as ClasificacionTipo });
  const [tipoFilter, setTipoFilter] = useState<ClasificacionTipo | "all">("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ["/api/admin/categorias"],
  });

  const filteredCategorias = tipoFilter === "all"
    ? (categorias as Categoria[])
    : (categorias as Categoria[]).filter(c => c.tipo === tipoFilter);

  const createMutation = useMutation({
    mutationFn: (data: { nombre: string; tipo: string }) =>
      apiRequest("POST", "/api/admin/categorias", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categorias"] });
      setIsDialogOpen(false);
      setFormData({ nombre: "", tipo: "Categoría" });
      toast({ title: "Clasificación creada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear clasificación", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string; tipo: string } }) =>
      apiRequest("PUT", `/api/admin/categorias/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categorias"] });
      setIsDialogOpen(false);
      setEditingCategoria(null);
      setFormData({ nombre: "", tipo: "Categoría" });
      toast({ title: "Clasificación actualizada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar clasificación", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/categorias/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categorias"] });
      toast({ title: "Clasificación eliminada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar clasificación", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/categorias/upload-excel', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cargar archivo');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categorias"] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ 
        title: "Archivo cargado exitosamente",
        description: `${data.inserted || 0} clasificaciones procesadas`
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error al cargar archivo", 
        description: error.message,
        variant: "destructive" 
      });
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
    setFormData({ nombre: categoria.nombre, tipo: (categoria.tipo || "Categoría") as ClasificacionTipo });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCategoria(null);
    setFormData({ nombre: "", tipo: "Categoría" });
    setIsDialogOpen(true);
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

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleExport = () => {
    window.location.href = '/api/admin/categorias/download-excel';
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

  const countByTipo = (tipo: ClasificacionTipo) => 
    (categorias as Categoria[]).filter(c => c.tipo === tipo).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Clasificaciones de Productos</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de marcas, categorías, subcategorías y características
          </p>
        </div>
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExport}
                  disabled={isLoading || (categorias as Categoria[]).length === 0}
                  data-testid="export-categorias-button"
                  aria-label="Exportar Excel"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar Excel</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" data-testid="upload-categorias-button" aria-label="Cargar Excel">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cargar Excel</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cargar Clasificaciones desde Excel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Archivo Excel</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    data-testid="file-input-categorias"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    El archivo debe contener columnas: Nombre, Tipo
                  </p>
                </div>
                {selectedFile && (
                  <p className="text-sm">
                    Archivo seleccionado: <strong>{selectedFile.name}</strong>
                  </p>
                )}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsUploadDialogOpen(false);
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadMutation.isPending}
                    data-testid="submit-upload-categorias"
                  >
                    {uploadMutation.isPending ? "Cargando..." : "Cargar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-categoria-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Clasificación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategoria ? "Editar Clasificación" : "Agregar Clasificación"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value as ClasificacionTipo })}
                  >
                    <SelectTrigger id="tipo" data-testid="select-tipo">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Marca">Marca</SelectItem>
                      <SelectItem value="Categoría">Categoría</SelectItem>
                      <SelectItem value="Subcategoría">Subcategoría</SelectItem>
                      <SelectItem value="Característica">Característica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Boxi, Colchones, Híbrido, King"
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-categoria-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Clasificación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategoria ? "Editar Clasificación" : "Agregar Clasificación"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value as ClasificacionTipo })}
                  >
                    <SelectTrigger id="tipo" data-testid="select-tipo">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Marca">Marca</SelectItem>
                      <SelectItem value="Categoría">Categoría</SelectItem>
                      <SelectItem value="Subcategoría">Subcategoría</SelectItem>
                      <SelectItem value="Característica">Característica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Boxi, Colchones, Híbrido, King"
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

      <Tabs value={tipoFilter} onValueChange={(value) => setTipoFilter(value as ClasificacionTipo | "all")}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            Todos ({(categorias as Categoria[]).length})
          </TabsTrigger>
          <TabsTrigger value="Marca" data-testid="tab-marca">
            Marcas ({countByTipo("Marca")})
          </TabsTrigger>
          <TabsTrigger value="Categoría" data-testid="tab-categoria">
            Categorías ({countByTipo("Categoría")})
          </TabsTrigger>
          <TabsTrigger value="Subcategoría" data-testid="tab-subcategoria">
            Subcategorías ({countByTipo("Subcategoría")})
          </TabsTrigger>
          <TabsTrigger value="Característica" data-testid="tab-caracteristica">
            Características ({countByTipo("Característica")})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tipoFilter} className="mt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filteredCategorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No hay clasificaciones registradas. Usa "Agregar Clasificación" para comenzar.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategorias.map((categoria: Categoria) => (
                    <TableRow key={categoria.id} data-testid={`categoria-row-${categoria.id}`}>
                      <TableCell>
                        <Badge variant="outline" className={getCategoriaColor(categoria.nombre)}>
                          {categoria.nombre}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTipoColor(categoria.tipo || "Categoría")}>
                          {categoria.tipo || "Categoría"}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
