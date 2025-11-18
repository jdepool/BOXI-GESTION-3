import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, RotateCcw, Download, ChevronDown, ChevronRight, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Producto, Categoria } from "@shared/schema";

interface ProductoComponente {
  id: string;
  productoId: string;
  componenteId: string;
  cantidad: number;
  skuProducto: string;
  skuComponente: string;
}

// Component to render each product row with expandable components
function ProductoRow({ 
  producto, 
  isExpanded, 
  onToggleExpand, 
  onEdit, 
  onDelete, 
  onManageComponents,
  onEditComponent,
  onDeleteComponent,
  getClasificacionNombre, 
  getTipoColor,
  isDeletingProduct,
  isDeletingComponent
}: { 
  producto: Producto;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onManageComponents: () => void;
  onEditComponent: (producto: Producto, component: { componenteId: string; cantidad: number }) => void;
  onDeleteComponent: (productoId: string, componenteId: string) => void;
  getClasificacionNombre: (id: string | null | undefined) => string | null;
  getTipoColor: (tipo: string) => string;
  isDeletingProduct: boolean;
  isDeletingComponent: boolean;
}) {
  const marca = getClasificacionNombre(producto.marcaId);
  const categoria = getClasificacionNombre(producto.categoriaId);
  const subcategoria = getClasificacionNombre(producto.subcategoriaId);
  const caracteristica = getClasificacionNombre(producto.caracteristicaId);
  
  // Fetch components only when expanded
  const { data: componentes = [], isLoading: isLoadingComponents } = useQuery<ProductoComponente[]>({
    queryKey: [`/api/admin/productos/${producto.id}/componentes`],
    enabled: isExpanded,
  });

  const isCombo = categoria && categoria.toLowerCase().includes('combo');
  const realComponents = componentes.filter(c => c.componenteId !== producto.id);
  const componentCount = realComponents.length;

  return (
    <>
      <TableRow key={producto.id} data-testid={`producto-row-${producto.id}`}>
        <TableCell className="w-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            data-testid={`expand-producto-${producto.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {producto.nombre}
            {isCombo && componentCount > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Package className="h-3 w-3 mr-1" />
                {componentCount} {componentCount === 1 ? 'componente' : 'componentes'}
              </Badge>
            )}
          </div>
        </TableCell>
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
            <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
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
              onClick={onEdit}
              data-testid={`edit-producto-${producto.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeletingProduct}
              data-testid={`delete-producto-${producto.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 dark:bg-muted/10">
            <div className="py-3 px-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Componentes del Producto
                </h4>
                <Button
                  size="sm"
                  onClick={onManageComponents}
                  data-testid={`add-component-${producto.id}`}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Componente
                </Button>
              </div>
              
              {isLoadingComponents ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Cargando componentes...
                </div>
              ) : componentes.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {isCombo 
                    ? "Este combo no tiene componentes configurados. Agrega los SKUs que lo componen."
                    : "Este producto individual no tiene componentes registrados."}
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">SKU Componente</TableHead>
                        <TableHead className="w-[100px]">Cantidad</TableHead>
                        <TableHead className="w-[80px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {componentes.map((comp) => {
                        const isSelfReference = comp.componenteId === producto.id;
                        return (
                          <TableRow key={comp.id}>
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center gap-2">
                                {comp.skuComponente}
                                {isSelfReference && (
                                  <Badge variant="secondary" className="text-xs">
                                    Auto-ref
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{comp.cantidad}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditComponent(producto, { componenteId: comp.componenteId, cantidad: comp.cantidad })}
                                  data-testid={`edit-component-${comp.id}`}
                                  title="Editar componente"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteComponent(producto.id, comp.componenteId)}
                                  disabled={isDeletingComponent || isSelfReference}
                                  data-testid={`delete-component-${comp.id}`}
                                  title={isSelfReference ? "No se puede eliminar la auto-referencia" : "Eliminar componente"}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

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
  
  // Component management state
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [selectedProductForComponents, setSelectedProductForComponents] = useState<Producto | null>(null);
  const [editingComponent, setEditingComponent] = useState<{ componenteId: string; cantidad: number } | null>(null);
  const [componentFormData, setComponentFormData] = useState({ componenteId: "", cantidad: 1 });
  
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
      
      const { created, inserted, total, errors, errorMessages, details } = result;
      const productosCreated = created || inserted || 0;
      
      // Get error messages from either new or legacy format
      const errorList = errorMessages || (details?.errorList?.map((e: any) => `Fila ${e.row}: ${e.error}`));
      const hasErrors = errors > 0;
      
      if (hasErrors && errorList && errorList.length > 0) {
        toast({ 
          title: productosCreated > 0 ? "Archivo procesado con errores" : "Error al procesar archivo",
          description: (
            <div className="space-y-1">
              <div>{productosCreated} de {total} productos procesados exitosamente</div>
              <div className="font-semibold mt-2">Errores ({errors} total):</div>
              <ul className="list-disc pl-4 space-y-1 max-h-40 overflow-y-auto">
                {errorList.map((error: string, index: number) => (
                  <li key={index} className="text-xs">{error}</li>
                ))}
              </ul>
              {errorList.length < errors && (
                <div className="text-xs italic mt-1">Mostrando primeros {errorList.length} errores de {errors} total...</div>
              )}
            </div>
          ),
          variant: productosCreated > 0 ? "default" : "destructive",
          duration: 10000,
        });
      } else if (hasErrors) {
        // Fallback when we have errors count but no detailed messages
        toast({ 
          title: "Archivo procesado con errores",
          description: `${productosCreated} de ${total} productos procesados. ${errors} errores encontrados.`,
          variant: productosCreated > 0 ? "default" : "destructive"
        });
      } else {
        toast({ 
          title: "Archivo cargado exitosamente",
          description: `${productosCreated} productos procesados`
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

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/productos/download-excel');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'productos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Productos exportados exitosamente" });
    } catch (error) {
      toast({ 
        title: "Error al exportar productos", 
        variant: "destructive" 
      });
    }
  };

  // Component management functions
  const toggleProductExpansion = (productoId: string) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productoId)) {
        newSet.delete(productoId);
      } else {
        newSet.add(productoId);
      }
      return newSet;
    });
  };

  const openComponentDialog = async (producto: Producto) => {
    setSelectedProductForComponents(producto);
    setEditingComponent(null);
    setComponentFormData({ componenteId: "", cantidad: 1 });
    
    // Prefetch components to ensure cache is populated for duplicate validation
    await queryClient.ensureQueryData({
      queryKey: [`/api/admin/productos/${producto.id}/componentes`],
    });
    
    setIsComponentDialogOpen(true);
  };

  const openComponentDialogForEdit = async (producto: Producto, component: { componenteId: string; cantidad: number }) => {
    setSelectedProductForComponents(producto);
    setEditingComponent(component);
    setComponentFormData({ componenteId: component.componenteId, cantidad: component.cantidad });
    
    // Prefetch components to ensure cache is populated for duplicate validation
    await queryClient.ensureQueryData({
      queryKey: [`/api/admin/productos/${producto.id}/componentes`],
    });
    
    setIsComponentDialogOpen(true);
  };

  const createComponentMutation = useMutation({
    mutationFn: ({ productoId, data }: { productoId: string; data: { componenteId: string; cantidad: number } }) =>
      apiRequest("POST", `/api/admin/productos/${productoId}/componentes`, data),
    onSuccess: async (_, variables) => {
      await queryClient.refetchQueries({ queryKey: [`/api/admin/productos/${variables.productoId}/componentes`] });
      setIsComponentDialogOpen(false);
      setComponentFormData({ componenteId: "", cantidad: 1 });
      toast({ title: "Componente agregado exitosamente" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "Error desconocido";
      toast({ 
        title: "Error al agregar componente", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  const deleteComponentMutation = useMutation({
    mutationFn: ({ productoId, componenteId }: { productoId: string; componenteId: string }) =>
      apiRequest("DELETE", `/api/admin/productos/${productoId}/componentes/${componenteId}`),
    onSuccess: async (_, variables) => {
      await queryClient.refetchQueries({ queryKey: [`/api/admin/productos/${variables.productoId}/componentes`] });
      toast({ title: "Componente eliminado exitosamente" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "Error desconocido";
      toast({ 
        title: "Error al eliminar componente",
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  const updateComponentMutation = useMutation({
    mutationFn: ({ productoId, componenteId, data }: { productoId: string; componenteId: string; data: { componenteId?: string; cantidad?: number } }) =>
      apiRequest("PUT", `/api/admin/productos/${productoId}/componentes/${componenteId}`, data),
    onSuccess: async (_, variables) => {
      await queryClient.refetchQueries({ queryKey: [`/api/admin/productos/${variables.productoId}/componentes`] });
      setIsComponentDialogOpen(false);
      setEditingComponent(null);
      setComponentFormData({ componenteId: "", cantidad: 1 });
      toast({ title: "Componente actualizado exitosamente" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "Error desconocido";
      toast({ 
        title: "Error al actualizar componente", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  const handleComponentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForComponents) return;

    if (!componentFormData.componenteId) {
      toast({ title: "Selecciona un SKU componente", variant: "destructive" });
      return;
    }

    if (componentFormData.cantidad < 1 || !Number.isInteger(componentFormData.cantidad)) {
      toast({ title: "La cantidad debe ser un número entero mayor o igual a 1", variant: "destructive" });
      return;
    }

    // Check for duplicate component SKU (only when creating or changing componenteId)
    const existingComponents = queryClient.getQueryData<ProductoComponente[]>([
      `/api/admin/productos/${selectedProductForComponents.id}/componentes`
    ]);

    if (editingComponent) {
      // EDITING MODE
      const isChangingComponenteId = componentFormData.componenteId !== editingComponent.componenteId;
      
      if (isChangingComponenteId && existingComponents?.some(c => c.componenteId === componentFormData.componenteId)) {
        toast({ 
          title: "Componente duplicado", 
          description: "Este SKU ya está agregado como componente",
          variant: "destructive" 
        });
        return;
      }

      updateComponentMutation.mutate({
        productoId: selectedProductForComponents.id,
        componenteId: editingComponent.componenteId,
        data: {
          componenteId: componentFormData.componenteId,
          cantidad: componentFormData.cantidad,
        },
      });
    } else {
      // CREATING MODE
      if (existingComponents?.some(c => c.componenteId === componentFormData.componenteId)) {
        toast({ 
          title: "Componente duplicado", 
          description: "Este SKU ya está agregado como componente",
          variant: "destructive" 
        });
        return;
      }

      createComponentMutation.mutate({
        productoId: selectedProductForComponents.id,
        data: {
          componenteId: componentFormData.componenteId,
          cantidad: componentFormData.cantidad,
        },
      });
    }
  };

  const handleDeleteComponent = (productoId: string, componenteId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este componente?")) {
      deleteComponentMutation.mutate({ productoId, componenteId });
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExport}
                  disabled={isLoading || (productos as any[]).length === 0}
                  aria-label="Exportar Excel"
                  data-testid="export-productos-button"
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
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Subir Productos desde Excel</DialogTitle>
                <DialogDescription>
                  Sube un archivo Excel o CSV con las columnas: Producto (requerido), SKU, Marca, Categoría, Subcategoría, Característica (todas opcionales)
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
                      <div className="grid grid-cols-6 gap-2 mb-1 font-semibold">
                        <div>Producto</div>
                        <div>SKU</div>
                        <div>Marca</div>
                        <div>Categoría</div>
                        <div>Subcategoría</div>
                        <div>Característica</div>
                      </div>
                      <div className="grid grid-cols-6 gap-2 text-muted-foreground">
                        <div>Evolve 140x190</div>
                        <div>EVO-140-190</div>
                        <div>Boxi</div>
                        <div>Colchón</div>
                        <div>Espuma</div>
                        <div>Queen</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs">
                      <p><span className="font-semibold">Nota:</span> Solo el campo "Producto" es requerido. Los demás campos son opcionales.</p>
                      <p className="mt-1">Las clasificaciones (Marca, Categoría, etc.) deben existir primero en la tabla de Categorías.</p>
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
              <TableHead className="w-12"></TableHead>
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
                <TableCell colSpan={8} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (productos as Producto[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay productos registrados. Usa "Subir Excel" o "Agregar Producto" para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              (productos as Producto[]).map((producto: Producto) => (
                <ProductoRow
                  key={producto.id}
                  producto={producto}
                  isExpanded={expandedProducts.has(producto.id)}
                  onToggleExpand={() => toggleProductExpansion(producto.id)}
                  onEdit={() => openEditDialog(producto)}
                  onDelete={() => deleteMutation.mutate(producto.id)}
                  onManageComponents={() => openComponentDialog(producto)}
                  onEditComponent={openComponentDialogForEdit}
                  onDeleteComponent={handleDeleteComponent}
                  getClasificacionNombre={getClasificacionNombre}
                  getTipoColor={getTipoColor}
                  isDeletingProduct={deleteMutation.isPending}
                  isDeletingComponent={deleteComponentMutation.isPending}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Component Management Dialog */}
      <Dialog open={isComponentDialogOpen} onOpenChange={setIsComponentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? "Editar Componente" : "Agregar Componente"}</DialogTitle>
            <DialogDescription>
              {editingComponent 
                ? `Edita el componente de ${selectedProductForComponents?.nombre}`
                : `Agrega un SKU componente a ${selectedProductForComponents?.nombre}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleComponentSubmit} className="space-y-4">
            <div>
              <Label htmlFor="componenteId">SKU Componente</Label>
              <Select
                value={componentFormData.componenteId}
                onValueChange={(value) => setComponentFormData({ ...componentFormData, componenteId: value })}
              >
                <SelectTrigger id="componenteId" data-testid="select-componente-sku">
                  <SelectValue placeholder="Selecciona un SKU" />
                </SelectTrigger>
                <SelectContent>
                  {(productos as Producto[])
                    .filter(p => p.sku)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.sku} - {p.nombre}
                        {p.id === selectedProductForComponents?.id && " (Auto-referencia)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                step="1"
                value={componentFormData.cantidad}
                onChange={(e) => setComponentFormData({ ...componentFormData, cantidad: parseInt(e.target.value) || 1 })}
                data-testid="input-componente-cantidad"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsComponentDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createComponentMutation.isPending || updateComponentMutation.isPending}
                data-testid="submit-componente"
              >
                {editingComponent 
                  ? (updateComponentMutation.isPending ? "Actualizando..." : "Actualizar")
                  : (createComponentMutation.isPending ? "Agregando..." : "Agregar")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
