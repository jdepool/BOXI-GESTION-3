import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, CalendarIcon, Upload, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Precio, Producto } from "@shared/schema";

export function PreciosCostosTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingPrecio, setEditingPrecio] = useState<Precio | null>(null);
  const [formData, setFormData] = useState({
    pais: "Venezuela",
    sku: "",
    precioInmediataUsd: "",
    precioReservaUsd: "",
    precioCasheaUsd: "",
    costoUnitarioUsd: "",
    iva: "",
    fechaVigenciaDesde: new Date(),
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: precios = [], isLoading } = useQuery<Precio[]>({
    queryKey: ["/api/admin/precios"],
  });

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ["/api/admin/productos"],
  });

  const { data: backupStatus } = useQuery<{ hasBackup: boolean }>({
    queryKey: ["/api/admin/precios/has-backup"],
  });

  // Update hasBackup state when backupStatus changes
  const effectiveHasBackup = hasBackup || (backupStatus?.hasBackup ?? false);

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/admin/precios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/precios"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Precio/Costo creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear precio/costo", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/admin/precios/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/precios"] });
      setIsDialogOpen(false);
      setEditingPrecio(null);
      resetForm();
      toast({ title: "Precio/Costo actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar precio/costo", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/precios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/precios"] });
      toast({ title: "Precio/Costo eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar precio/costo", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/precios/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      return response.json();
    },
    onMutate: () => {
      setIsUploading(true);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/precios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/precios/has-backup"] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setHasBackup(true);
      toast({ 
        title: "Archivo cargado exitosamente",
        description: `${data.recordsAdded} registros agregados`
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error al cargar archivo", 
        description: error.message,
        variant: "destructive" 
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const undoMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/precios/undo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/precios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/precios/has-backup"] });
      setHasBackup(false);
      toast({ title: "Precios/Costos restaurados correctamente" });
    },
    onError: () => {
      toast({ title: "Error al restaurar precios/costos", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      pais: formData.pais,
      sku: formData.sku,
      precioInmediataUsd: formData.precioInmediataUsd,
      precioReservaUsd: formData.precioReservaUsd,
      precioCasheaUsd: formData.precioCasheaUsd,
      costoUnitarioUsd: formData.costoUnitarioUsd,
      iva: formData.iva || undefined,
      fechaVigenciaDesde: formData.fechaVigenciaDesde,
    };

    if (editingPrecio) {
      updateMutation.mutate({ id: editingPrecio.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const openEditDialog = (precio: Precio) => {
    setEditingPrecio(precio);
    setFormData({
      pais: precio.pais,
      sku: precio.sku,
      precioInmediataUsd: precio.precioInmediataUsd,
      precioReservaUsd: precio.precioReservaUsd,
      precioCasheaUsd: precio.precioCasheaUsd,
      costoUnitarioUsd: precio.costoUnitarioUsd,
      iva: precio.iva || "",
      fechaVigenciaDesde: new Date(precio.fechaVigenciaDesde),
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      pais: "Venezuela",
      sku: "",
      precioInmediataUsd: "",
      precioReservaUsd: "",
      precioCasheaUsd: "",
      costoUnitarioUsd: "",
      iva: "",
      fechaVigenciaDesde: new Date(),
    });
  };

  const openCreateDialog = () => {
    setEditingPrecio(null);
    resetForm();
    setIsDialogOpen(true);
  };

  // Get producto name from SKU
  const getProductoName = (sku: string) => {
    const producto = productos.find((p) => p.sku === sku);
    return producto ? producto.nombre : sku;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        setSelectedFile(file);
      } else {
        toast({
          title: "Archivo inválido",
          description: "Solo se permiten archivos .xlsx o .xls",
          variant: "destructive"
        });
      }
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleUndo = () => {
    if (confirm("¿Estás seguro de que deseas deshacer la última carga? Se eliminarán los registros agregados en la última carga.")) {
      undoMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Precios/Costos</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de precios y costos por producto
          </p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            {effectiveHasBackup && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleUndo}
                    disabled={undoMutation.isPending}
                    data-testid="undo-precios-button"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Deshacer última carga</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" data-testid="upload-precios-button">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cargar Excel</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cargar Precios/Costos desde Excel</DialogTitle>
                  <DialogDescription>
                    Sube un archivo Excel con las columnas: País, SKU, Precio Inmediata USD, Precio Reserva USD, Precio Cashea USD, Costo Unitario USD, IVA (opcional), Fecha Vigencia Desde
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload-precios">Seleccionar archivo</Label>
                    <Input
                      id="file-upload-precios"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                      data-testid="file-input-precios"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Archivo seleccionado: {selectedFile.name}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsUploadDialogOpen(false);
                        setSelectedFile(null);
                      }}
                      disabled={isUploading}
                      data-testid="cancel-upload-button"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || isUploading}
                      data-testid="confirm-upload-button"
                    >
                      {isUploading ? "Cargando..." : "Cargar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TooltipProvider>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-precio-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Precio/Costo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPrecio ? "Editar Precio/Costo" : "Agregar Precio/Costo"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  value={formData.pais}
                  onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  placeholder="Ej: Venezuela"
                  required
                  data-testid="input-pais"
                />
              </div>

              <div>
                <Label htmlFor="sku">SKU</Label>
                <Select
                  value={formData.sku}
                  onValueChange={(value) => setFormData({ ...formData, sku: value })}
                  required
                >
                  <SelectTrigger data-testid="select-sku">
                    <SelectValue placeholder="Seleccionar SKU" />
                  </SelectTrigger>
                  <SelectContent>
                    {productos
                      .filter((p) => p.sku)
                      .map((producto) => (
                        <SelectItem key={producto.id} value={producto.sku!}>
                          {producto.sku} - {producto.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="precioInmediataUsd">Precio Inmediata USD</Label>
                  <Input
                    id="precioInmediataUsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precioInmediataUsd}
                    onChange={(e) => setFormData({ ...formData, precioInmediataUsd: e.target.value })}
                    placeholder="0.00"
                    required
                    data-testid="input-precio-inmediata"
                  />
                </div>

                <div>
                  <Label htmlFor="precioReservaUsd">Precio Reserva USD</Label>
                  <Input
                    id="precioReservaUsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precioReservaUsd}
                    onChange={(e) => setFormData({ ...formData, precioReservaUsd: e.target.value })}
                    placeholder="0.00"
                    required
                    data-testid="input-precio-reserva"
                  />
                </div>

                <div>
                  <Label htmlFor="precioCasheaUsd">Precio Cashea USD</Label>
                  <Input
                    id="precioCasheaUsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precioCasheaUsd}
                    onChange={(e) => setFormData({ ...formData, precioCasheaUsd: e.target.value })}
                    placeholder="0.00"
                    required
                    data-testid="input-precio-cashea"
                  />
                </div>

                <div>
                  <Label htmlFor="costoUnitarioUsd">Costo Unitario USD</Label>
                  <Input
                    id="costoUnitarioUsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costoUnitarioUsd}
                    onChange={(e) => setFormData({ ...formData, costoUnitarioUsd: e.target.value })}
                    placeholder="0.00"
                    required
                    data-testid="input-costo-unitario"
                  />
                </div>

                <div>
                  <Label htmlFor="iva">IVA (%)</Label>
                  <Input
                    id="iva"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.iva}
                    onChange={(e) => setFormData({ ...formData, iva: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-iva"
                  />
                </div>
              </div>

              <div>
                <Label>Fecha Vigencia Desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.fechaVigenciaDesde && "text-muted-foreground"
                      )}
                      data-testid="button-fecha-vigencia"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.fechaVigenciaDesde ? (
                        format(formData.fechaVigenciaDesde, "dd/MM/yyyy")
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.fechaVigenciaDesde}
                      onSelect={(date) => date && setFormData({ ...formData, fechaVigenciaDesde: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
                  {editingPrecio ? "Actualizar" : "Crear"}
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
              <TableHead>País</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Precio Inmediata USD</TableHead>
              <TableHead>Precio Reserva USD</TableHead>
              <TableHead>Precio Cashea USD</TableHead>
              <TableHead>Costo Unitario USD</TableHead>
              <TableHead>IVA (%)</TableHead>
              <TableHead>Vigencia Desde</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4">
                  Cargando precios...
                </TableCell>
              </TableRow>
            ) : precios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                  No hay precios/costos registrados
                </TableCell>
              </TableRow>
            ) : (
              precios.map((precio) => (
                <TableRow key={precio.id} data-testid={`precio-row-${precio.id}`}>
                  <TableCell className="font-medium">{precio.pais}</TableCell>
                  <TableCell>
                    {getProductoName(precio.sku)}
                    <div className="text-xs text-muted-foreground">{precio.sku}</div>
                  </TableCell>
                  <TableCell>${Number(precio.precioInmediataUsd).toFixed(2)}</TableCell>
                  <TableCell>${Number(precio.precioReservaUsd).toFixed(2)}</TableCell>
                  <TableCell>${Number(precio.precioCasheaUsd).toFixed(2)}</TableCell>
                  <TableCell>${Number(precio.costoUnitarioUsd).toFixed(2)}</TableCell>
                  <TableCell>{precio.iva ? `${Number(precio.iva).toFixed(2)}%` : "-"}</TableCell>
                  <TableCell>{format(new Date(precio.fechaVigenciaDesde), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <div className="flex space-x-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(precio)}
                              data-testid={`edit-precio-${precio.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (window.confirm("¿Estás seguro de que quieres eliminar este precio/costo?")) {
                                  deleteMutation.mutate(precio.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`delete-precio-${precio.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Eliminar</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
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
