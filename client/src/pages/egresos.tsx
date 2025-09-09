import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Upload, Edit, Trash2, Filter, Download, Check, CalendarIcon } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Egreso, Banco, TipoEgreso, MetodoPago, Moneda, EgresoPorAprobar } from "@shared/schema";

export default function Egresos() {
  const [activeTab, setActiveTab] = useState("egresos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogPorAprobarOpen, setIsDialogPorAprobarOpen] = useState(false);
  const [editingEgreso, setEditingEgreso] = useState<Egreso | null>(null);
  const [editingEgresoPorAprobar, setEditingEgresoPorAprobar] = useState<EgresoPorAprobar | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({
    tipoEgresoId: "all",
    metodoPagoId: "all",
    bancoId: "all",
    startDate: "",
    endDate: "",
  });
  const [filtersPorAprobar, setFiltersPorAprobar] = useState({
    tipoEgresoId: "all",
    metodoPagoId: "all",
    startDate: "",
    endDate: "",
  });
  const [formData, setFormData] = useState({
    fecha: "",
    descripcion: "",
    monto: "",
    monedaId: "",
    tipoEgresoId: "",
    metodoPagoId: "",
    bancoId: "",
    referencia: "",
    estado: "registrado",
    observaciones: "",
  });
  const [formDataPorAprobar, setFormDataPorAprobar] = useState({
    fecha: "",
    descripcion: "",
    monto: "",
    tipoEgresoId: "",
    metodoPagoId: "",
  });
  const [completePagoDialogOpen, setCompletePagoDialogOpen] = useState(false);
  const [egresoToComplete, setEgresoToComplete] = useState<Egreso | null>(null);
  const [completePagoData, setCompletePagoData] = useState({
    bancoId: "",
    referencia: "",
    observaciones: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch egresos data
  const { data: egresosData, isLoading } = useQuery({
    queryKey: ["/api/egresos", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.append(key, value);
      });
      const response = await fetch(`/api/egresos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch egresos');
      return response.json();
    },
  });

  // Fetch admin data for dropdowns
  const { data: bancos = [] } = useQuery({
    queryKey: ["/api/admin/bancos"],
  });

  const { data: tiposEgresos = [] } = useQuery({
    queryKey: ["/api/admin/tipos-egresos"],
  });

  const { data: metodosPago = [] } = useQuery({
    queryKey: ["/api/admin/metodos-pago"],
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ["/api/admin/monedas"],
  });

  // Fetch egresos por aprobar data
  const { data: egresosPorAprobarData, isLoading: isLoadingPorAprobar } = useQuery({
    queryKey: ["/api/egresos-por-aprobar", filtersPorAprobar],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filtersPorAprobar).forEach(([key, value]) => {
        if (value && value !== "all") params.append(key, value);
      });
      const response = await fetch(`/api/egresos-por-aprobar?${params}`);
      if (!response.ok) throw new Error('Failed to fetch egresos por aprobar');
      return response.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/egresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          fecha: new Date(data.fecha),
          monto: data.monto,
        }),
      });
      if (!response.ok) throw new Error('Failed to create egreso');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ description: "Egreso creado exitosamente" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al crear egreso" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await fetch(`/api/egresos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          fecha: new Date(data.fecha),
          monto: data.monto,
        }),
      });
      if (!response.ok) throw new Error('Failed to update egreso');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ description: "Egreso actualizado exitosamente" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al actualizar egreso" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/egresos/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error('Failed to delete egreso');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      toast({ description: "Egreso eliminado exitosamente" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al eliminar egreso" });
    },
  });

  // Egresos Por Aprobar mutations
  const createPorAprobarMutation = useMutation({
    mutationFn: async (data: typeof formDataPorAprobar) => {
      const response = await fetch("/api/egresos-por-aprobar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          fecha: new Date(data.fecha),
          monto: data.monto,
        }),
      });
      if (!response.ok) throw new Error('Failed to create egreso por aprobar');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos-por-aprobar"] });
      setIsDialogPorAprobarOpen(false);
      resetFormPorAprobar();
      toast({ description: "Egreso por aprobar creado exitosamente" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al crear egreso por aprobar" });
    },
  });

  const updatePorAprobarMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formDataPorAprobar }) => {
      const response = await fetch(`/api/egresos-por-aprobar/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          fecha: new Date(data.fecha),
          monto: data.monto,
        }),
      });
      if (!response.ok) throw new Error('Failed to update egreso por aprobar');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos-por-aprobar"] });
      setIsDialogPorAprobarOpen(false);
      resetFormPorAprobar();
      toast({ description: "Egreso por aprobar actualizado exitosamente" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al actualizar egreso por aprobar" });
    },
  });

  const deletePorAprobarMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/egresos-por-aprobar/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error('Failed to delete egreso por aprobar');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos-por-aprobar"] });
      toast({ description: "Egreso por aprobar eliminado exitosamente" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al eliminar egreso por aprobar" });
    },
  });

  const approveEgresoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { monedaId: string; bancoId: string; referencia: string; observaciones: string; } }) => {
      const response = await fetch(`/api/egresos-por-aprobar/${id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to approve egreso');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos-por-aprobar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      toast({ description: "Egreso aprobado exitosamente - Pendiente información de pago completa" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al aprobar egreso" });
    },
  });

  const completePagoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof completePagoData }) => {
      const response = await fetch(`/api/egresos/${id}/completar-pago`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to complete payment info');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      setCompletePagoDialogOpen(false);
      setEgresoToComplete(null);
      setCompletePagoData({ bancoId: "", referencia: "", observaciones: "" });
      toast({ description: "Información de pago completada exitosamente" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al completar información de pago" });
    },
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/egresos/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      toast({
        description: `Excel subido exitosamente. ${data.recordsCount} egresos procesados.`,
      });
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: `Error al subir Excel: ${error.message}`,
      });
      setIsUploading(false);
    },
  });

  const resetForm = () => {
    setFormData({
      fecha: "",
      descripcion: "",
      monto: "",
      monedaId: "",
      tipoEgresoId: "",
      metodoPagoId: "",
      bancoId: "",
      referencia: "",
      estado: "registrado",
      observaciones: "",
    });
    setEditingEgreso(null);
  };

  const resetFormPorAprobar = () => {
    setFormDataPorAprobar({
      fecha: "",
      descripcion: "",
      monto: "",
      tipoEgresoId: "",
      metodoPagoId: "",
    });
    setEditingEgresoPorAprobar(null);
  };

  const openEditDialog = (egreso: Egreso) => {
    setEditingEgreso(egreso);
    setFormData({
      fecha: egreso.fecha ? format(new Date(egreso.fecha), "yyyy-MM-dd") : "",
      descripcion: egreso.descripcion,
      monto: egreso.monto,
      monedaId: egreso.monedaId,
      tipoEgresoId: egreso.tipoEgresoId,
      metodoPagoId: egreso.metodoPagoId,
      bancoId: egreso.bancoId,
      referencia: egreso.referencia || "",
      estado: egreso.estado,
      observaciones: egreso.observaciones || "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialogPorAprobar = (egreso: EgresoPorAprobar) => {
    setEditingEgresoPorAprobar(egreso);
    setFormDataPorAprobar({
      fecha: egreso.fecha ? format(new Date(egreso.fecha), "yyyy-MM-dd") : "",
      descripcion: egreso.descripcion,
      monto: egreso.monto,
      tipoEgresoId: egreso.tipoEgresoId,
      metodoPagoId: egreso.metodoPagoId,
    });
    setIsDialogPorAprobarOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obligatorios
    const requiredFields = [
      { field: formData.fecha, name: "Fecha" },
      { field: formData.descripcion, name: "Descripción" },
      { field: formData.monto, name: "Monto" },
      { field: formData.monedaId, name: "Moneda" },
      { field: formData.tipoEgresoId, name: "Tipo de Egreso" },
      { field: formData.metodoPagoId, name: "Método de Pago" },
      { field: formData.bancoId, name: "Banco" },
      { field: formData.referencia, name: "Referencia" },
      { field: formData.estado, name: "Estado" },
    ];

    const missingFields = requiredFields.filter(item => !item.field || item.field.trim() === "");
    
    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(item => item.name).join(", ");
      toast({
        variant: "destructive",
        description: `Los siguientes campos son obligatorios: ${fieldNames}`,
      });
      return;
    }
    
    if (editingEgreso) {
      updateMutation.mutate({ id: editingEgreso.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSubmitPorAprobar = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEgresoPorAprobar) {
      updatePorAprobarMutation.mutate({ id: editingEgresoPorAprobar.id, data: formDataPorAprobar });
    } else {
      createPorAprobarMutation.mutate(formDataPorAprobar);
    }
  };


  const openCompletePagoDialog = (egreso: Egreso) => {
    setEgresoToComplete(egreso);
    setCompletePagoData({
      bancoId: egreso.bancoId || "",
      referencia: egreso.referencia || "",
      observaciones: egreso.observaciones || "",
    });
    setCompletePagoDialogOpen(true);
  };

  const handleCompletePagoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (egresoToComplete) {
      completePagoMutation.mutate({ id: egresoToComplete.id, data: completePagoData });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case "registrado": return "secondary";
      case "aprobado": return "default";
      case "pagado": return "default";
      case "anulado": return "destructive";
      default: return "secondary";
    }
  };

  const egresos = egresosData?.data || [];
  const egresosPorAprobar = egresosPorAprobarData?.data || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Egresos</h1>
            <p className="text-muted-foreground">
              Gestión de gastos y egresos de la empresa
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" className="flex items-center gap-2" data-testid="back-to-dashboard">
                <ArrowLeft className="h-4 w-4" />
                Regresar al Menú Principal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="egresos">Egresos</TabsTrigger>
          <TabsTrigger value="egresos-por-aprobar">Egresos por Aprobar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="egresos" className="space-y-6">
          <div className="flex items-center justify-between">
            <div></div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="file-input"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="upload-excel"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Subiendo..." : "Subir Excel"}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} data-testid="add-egreso">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Egreso
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingEgreso ? "Editar Egreso" : "Crear Nuevo Egreso"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingEgreso 
                      ? "Modifica los datos del egreso seleccionado" 
                      : "Completa la información para registrar un nuevo egreso"
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fecha">Fecha *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.fecha && "text-muted-foreground"
                            )}
                            data-testid="date-picker-fecha"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.fecha ? format(new Date(formData.fecha), "dd/MM/yyyy") : <span>Seleccionar fecha</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.fecha ? new Date(formData.fecha) : undefined}
                            onSelect={(date) => setFormData({ ...formData, fecha: date ? format(date, "yyyy-MM-dd") : "" })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="monto">Monto *</Label>
                      <Input
                        id="monto"
                        type="number"
                        step="0.01"
                        value={formData.monto}
                        onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                        required
                        data-testid="input-monto"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="descripcion">Descripción *</Label>
                    <Input
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      required
                      data-testid="input-descripcion"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="monedaId">Moneda *</Label>
                      <Select
                        value={formData.monedaId}
                        onValueChange={(value) => setFormData({ ...formData, monedaId: value })}
                        required
                      >
                        <SelectTrigger data-testid="select-moneda">
                          <SelectValue placeholder="Seleccionar moneda" />
                        </SelectTrigger>
                        <SelectContent>
                          {(monedas as Moneda[]).filter(moneda => moneda.id && moneda.id.trim()).map((moneda) => (
                            <SelectItem key={moneda.id} value={moneda.id}>
                              {moneda.codigo} - {moneda.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tipoEgresoId">Tipo de Egreso *</Label>
                      <Select
                        value={formData.tipoEgresoId}
                        onValueChange={(value) => setFormData({ ...formData, tipoEgresoId: value })}
                        required
                      >
                        <SelectTrigger data-testid="select-tipo-egreso">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {(tiposEgresos as TipoEgreso[]).filter(tipo => tipo.id && tipo.id.trim()).map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              {tipo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="metodoPagoId">Método de Pago *</Label>
                      <Select
                        value={formData.metodoPagoId}
                        onValueChange={(value) => setFormData({ ...formData, metodoPagoId: value })}
                        required
                      >
                        <SelectTrigger data-testid="select-metodo-pago">
                          <SelectValue placeholder="Seleccionar método" />
                        </SelectTrigger>
                        <SelectContent>
                          {(metodosPago as MetodoPago[]).filter(metodo => metodo.id && metodo.id.trim()).map((metodo) => (
                            <SelectItem key={metodo.id} value={metodo.id}>
                              {metodo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bancoId">Banco *</Label>
                      <Select
                        value={formData.bancoId}
                        onValueChange={(value) => setFormData({ ...formData, bancoId: value })}
                        required
                      >
                        <SelectTrigger data-testid="select-banco">
                          <SelectValue placeholder="Seleccionar banco" />
                        </SelectTrigger>
                        <SelectContent>
                          {(bancos as Banco[]).filter(banco => banco.id && banco.id.trim()).map((banco) => (
                            <SelectItem key={banco.id} value={banco.id}>
                              {banco.banco} - {banco.numeroCuenta}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="referencia">Referencia *</Label>
                      <Input
                        id="referencia"
                        value={formData.referencia}
                        onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                        required
                        data-testid="input-referencia"
                      />
                    </div>
                    <div>
                      <Label htmlFor="estado">Estado *</Label>
                      <Select
                        value={formData.estado}
                        onValueChange={(value) => setFormData({ ...formData, estado: value })}
                        required
                      >
                        <SelectTrigger data-testid="select-estado">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registrado">Registrado</SelectItem>
                          <SelectItem value="aprobado">Aprobado</SelectItem>
                          <SelectItem value="pagado">Pagado</SelectItem>
                          <SelectItem value="anulado">Anulado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea
                      id="observaciones"
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      data-testid="input-observaciones"
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
                      data-testid="submit-egreso"
                    >
                      {editingEgreso ? "Actualizar" : "Crear"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>Tipo de Egreso</Label>
              <Select
                value={filters.tipoEgresoId}
                onValueChange={(value) => setFilters({ ...filters, tipoEgresoId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(tiposEgresos as TipoEgreso[]).filter(tipo => tipo.id && tipo.id.trim()).map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Método de Pago</Label>
              <Select
                value={filters.metodoPagoId}
                onValueChange={(value) => setFilters({ ...filters, metodoPagoId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(metodosPago as MetodoPago[]).filter(metodo => metodo.id && metodo.id.trim()).map((metodo) => (
                    <SelectItem key={metodo.id} value={metodo.id}>
                      {metodo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Banco</Label>
              <Select
                value={filters.bancoId}
                onValueChange={(value) => setFilters({ ...filters, bancoId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(bancos as Banco[]).filter(banco => banco.id && banco.id.trim()).map((banco) => (
                    <SelectItem key={banco.id} value={banco.id}>
                      {banco.banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha Inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(new Date(filters.startDate), "dd/MM/yyyy") : <span>Fecha inicio</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate ? new Date(filters.startDate) : undefined}
                    onSelect={(date) => setFilters({ ...filters, startDate: date ? format(date, "yyyy-MM-dd") : "" })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? format(new Date(filters.endDate), "dd/MM/yyyy") : <span>Fecha fin</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate ? new Date(filters.endDate) : undefined}
                    onSelect={(date) => setFilters({ ...filters, endDate: date ? format(date, "yyyy-MM-dd") : "" })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Egresos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Egresos</CardTitle>
          <CardDescription>
            {egresosData?.total || 0} egresos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método Pago</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : egresos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No hay egresos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  egresos.map((egreso: Egreso) => (
                    <TableRow 
                      key={egreso.id} 
                      data-testid={`egreso-row-${egreso.id}`}
                      className={egreso.pendienteInfo ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800" : ""}
                    >
                      <TableCell>
                        {egreso.fecha ? format(new Date(egreso.fecha), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{egreso.descripcion}</TableCell>
                      <TableCell>{egreso.monto}</TableCell>
                      <TableCell>
                        {(tiposEgresos as TipoEgreso[]).find(t => t.id === egreso.tipoEgresoId)?.nombre || "-"}
                      </TableCell>
                      <TableCell>
                        {(metodosPago as MetodoPago[]).find(m => m.id === egreso.metodoPagoId)?.nombre || "-"}
                      </TableCell>
                      <TableCell>
                        {(bancos as Banco[]).find(b => b.id === egreso.bancoId)?.banco || "-"}
                      </TableCell>
                      <TableCell>
                        {egreso.referencia || "-"}
                      </TableCell>
                      <TableCell>
                        {egreso.observaciones || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getEstadoBadgeVariant(egreso.estado)}>
                            {egreso.estado}
                          </Badge>
                          {egreso.pendienteInfo && (
                            <span className="text-orange-600 text-sm font-medium">
                              (Pendiente info pago)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {egreso.pendienteInfo ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCompletePagoDialog(egreso)}
                              data-testid={`complete-pago-${egreso.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Completar
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(egreso)}
                              data-testid={`edit-egreso-${egreso.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(egreso.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`delete-egreso-${egreso.id}`}
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
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="egresos-por-aprobar" className="space-y-6">
          <div className="flex items-center justify-between">
            <div></div>
            <div className="flex items-center gap-2">
              <Dialog open={isDialogPorAprobarOpen} onOpenChange={setIsDialogPorAprobarOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetFormPorAprobar} data-testid="add-egreso-por-aprobar">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Egreso por Aprobar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingEgresoPorAprobar ? "Editar Egreso por Aprobar" : "Crear Nuevo Egreso por Aprobar"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingEgresoPorAprobar 
                        ? "Modifica los datos del egreso por aprobar seleccionado" 
                        : "Completa la información para registrar un nuevo egreso por aprobar"
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitPorAprobar} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fecha-por-aprobar">Fecha</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formDataPorAprobar.fecha && "text-muted-foreground"
                              )}
                              data-testid="date-picker-fecha-por-aprobar"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formDataPorAprobar.fecha ? format(new Date(formDataPorAprobar.fecha), "dd/MM/yyyy") : <span>Seleccionar fecha</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formDataPorAprobar.fecha ? new Date(formDataPorAprobar.fecha) : undefined}
                              onSelect={(date) => setFormDataPorAprobar({ ...formDataPorAprobar, fecha: date ? format(date, "yyyy-MM-dd") : "" })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="monto-por-aprobar">Monto</Label>
                        <Input
                          id="monto-por-aprobar"
                          type="number"
                          step="0.01"
                          value={formDataPorAprobar.monto}
                          onChange={(e) => setFormDataPorAprobar({ ...formDataPorAprobar, monto: e.target.value })}
                          required
                          data-testid="input-monto-por-aprobar"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="observaciones-por-aprobar">Observaciones</Label>
                      <Textarea
                        id="observaciones-por-aprobar"
                        value={formDataPorAprobar.descripcion}
                        onChange={(e) => setFormDataPorAprobar({ ...formDataPorAprobar, descripcion: e.target.value })}
                        required
                        data-testid="input-observaciones-por-aprobar"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="tipoEgresoId-por-aprobar">Tipo de Egreso</Label>
                        <Select
                          value={formDataPorAprobar.tipoEgresoId}
                          onValueChange={(value) => setFormDataPorAprobar({ ...formDataPorAprobar, tipoEgresoId: value })}
                          required
                        >
                          <SelectTrigger data-testid="select-tipo-egreso-por-aprobar">
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {(tiposEgresos as TipoEgreso[]).filter(tipo => tipo.id && tipo.id.trim()).map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.id}>
                                {tipo.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="metodoPagoId-por-aprobar">Método de Pago</Label>
                        <Select
                          value={formDataPorAprobar.metodoPagoId}
                          onValueChange={(value) => setFormDataPorAprobar({ ...formDataPorAprobar, metodoPagoId: value })}
                          required
                        >
                          <SelectTrigger data-testid="select-metodo-pago-por-aprobar">
                            <SelectValue placeholder="Seleccionar método" />
                          </SelectTrigger>
                          <SelectContent>
                            {(metodosPago as MetodoPago[]).filter(metodo => metodo.id && metodo.id.trim()).map((metodo) => (
                              <SelectItem key={metodo.id} value={metodo.id}>
                                {metodo.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogPorAprobarOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createPorAprobarMutation.isPending || updatePorAprobarMutation.isPending}
                        data-testid="submit-egreso-por-aprobar"
                      >
                        {editingEgresoPorAprobar ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Egresos Por Aprobar Content */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Egresos por Aprobar</CardTitle>
              <CardDescription>
                {egresosPorAprobarData?.total || 0} egresos pendientes de aprobación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Método Pago</TableHead>
                      <TableHead>Observaciones</TableHead>
                      <TableHead>Aprobar</TableHead>
                      <TableHead className="w-24">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPorAprobar ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Cargando...
                        </TableCell>
                      </TableRow>
                    ) : egresosPorAprobar.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay egresos por aprobar
                        </TableCell>
                      </TableRow>
                    ) : (
                      egresosPorAprobar.map((egreso: EgresoPorAprobar) => (
                        <TableRow key={egreso.id} data-testid={`egreso-por-aprobar-row-${egreso.id}`}>
                          <TableCell>
                            {egreso.fecha ? format(new Date(egreso.fecha), "dd/MM/yyyy") : "-"}
                          </TableCell>
                          <TableCell>{egreso.monto}</TableCell>
                          <TableCell>
                            {(tiposEgresos as TipoEgreso[]).find(t => t.id === egreso.tipoEgresoId)?.nombre || "-"}
                          </TableCell>
                          <TableCell>
                            {(metodosPago as MetodoPago[]).find(m => m.id === egreso.metodoPagoId)?.nombre || "-"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {egreso.descripcion || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approveEgresoMutation.mutate({ 
                                id: egreso.id, 
                                data: {
                                  monedaId: "",
                                  bancoId: "",
                                  referencia: "",
                                  observaciones: ""
                                }
                              })}
                              disabled={approveEgresoMutation.isPending}
                              data-testid={`aprobar-egreso-${egreso.id}`}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              {approveEgresoMutation.isPending ? "Aprobando..." : "Aprobar"}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialogPorAprobar(egreso)}
                                data-testid={`edit-egreso-por-aprobar-${egreso.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePorAprobarMutation.mutate(egreso.id)}
                                disabled={deletePorAprobarMutation.isPending}
                                data-testid={`delete-egreso-por-aprobar-${egreso.id}`}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* Complete Payment Info Dialog */}
      <Dialog open={completePagoDialogOpen} onOpenChange={setCompletePagoDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Completar Información de Pago</DialogTitle>
            <DialogDescription>
              Completa la información de pago para finalizar el egreso: {egresoToComplete?.descripcion}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCompletePagoSubmit} className="space-y-4">
            <div>
              <Label htmlFor="banco-complete">Banco</Label>
              <Select
                value={completePagoData.bancoId}
                onValueChange={(value) => setCompletePagoData({ ...completePagoData, bancoId: value })}
              >
                <SelectTrigger data-testid="select-banco-complete">
                  <SelectValue placeholder="Seleccionar banco" />
                </SelectTrigger>
                <SelectContent>
                  {(bancos as Banco[]).filter(banco => banco.id && banco.id.trim()).map((banco) => (
                    <SelectItem key={banco.id} value={banco.id}>
                      {banco.banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="referencia-complete">Referencia de Pago</Label>
              <Input
                id="referencia-complete"
                value={completePagoData.referencia}
                onChange={(e) => setCompletePagoData({ ...completePagoData, referencia: e.target.value })}
                placeholder="Ingresa la referencia del pago"
                data-testid="input-referencia-complete"
              />
            </div>

            <div>
              <Label htmlFor="observaciones-complete">Observaciones</Label>
              <Textarea
                id="observaciones-complete"
                value={completePagoData.observaciones}
                onChange={(e) => setCompletePagoData({ ...completePagoData, observaciones: e.target.value })}
                placeholder="Observaciones existentes se mantendrán si dejas este campo vacío"
                data-testid="input-observaciones-complete"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCompletePagoDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={completePagoMutation.isPending}
                data-testid="submit-complete-pago"
              >
                {completePagoMutation.isPending ? "Completando..." : "Completar Información"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}