import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Upload, Edit, Trash2, Filter, Download } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Egreso, Banco, TipoEgreso, MetodoPago, Moneda } from "@shared/schema";

export default function Egresos() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEgreso, setEditingEgreso] = useState<Egreso | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({
    tipoEgresoId: "all",
    metodoPagoId: "all",
    bancoId: "all",
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/egresos", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          fecha: new Date(data.fecha),
          monto: data.monto,
        }),
      });
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
      return await apiRequest(`/api/egresos/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          fecha: new Date(data.fecha),
          monto: data.monto,
        }),
      });
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
      return await apiRequest(`/api/egresos/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      toast({ description: "Egreso eliminado exitosamente" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al eliminar egreso" });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEgreso) {
      updateMutation.mutate({ id: editingEgreso.id, data: formData });
    } else {
      createMutation.mutate(formData);
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
            </div>
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
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fecha">Fecha</Label>
                      <Input
                        id="fecha"
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                        required
                        data-testid="input-fecha"
                      />
                    </div>
                    <div>
                      <Label htmlFor="monto">Monto</Label>
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
                    <Label htmlFor="descripcion">Descripción</Label>
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
                      <Label htmlFor="monedaId">Moneda</Label>
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
                      <Label htmlFor="tipoEgresoId">Tipo de Egreso</Label>
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
                      <Label htmlFor="metodoPagoId">Método de Pago</Label>
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
                      <Label htmlFor="bancoId">Banco</Label>
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
                      <Label htmlFor="referencia">Referencia</Label>
                      <Input
                        id="referencia"
                        value={formData.referencia}
                        onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                        data-testid="input-referencia"
                      />
                    </div>
                    <div>
                      <Label htmlFor="estado">Estado</Label>
                      <Select
                        value={formData.estado}
                        onValueChange={(value) => setFormData({ ...formData, estado: value })}
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
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
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
                  <TableHead>Estado</TableHead>
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
                ) : egresos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay egresos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  egresos.map((egreso: Egreso) => (
                    <TableRow key={egreso.id} data-testid={`egreso-row-${egreso.id}`}>
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
                        <Badge variant={getEstadoBadgeVariant(egreso.estado)}>
                          {egreso.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(egreso)}
                            data-testid={`edit-egreso-${egreso.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}