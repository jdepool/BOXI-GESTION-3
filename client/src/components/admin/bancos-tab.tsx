import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2, Upload, RotateCcw, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Banco } from "@shared/schema";

export function BancosTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanco, setEditingBanco] = useState<Banco | null>(null);
  const [formData, setFormData] = useState({ 
    banco: "", 
    numeroCuenta: "", 
    tipo: "Receptor" as "Receptor" | "Emisor",
    monedaId: "",
    metodoPagoId: ""
  });
  
  // Excel upload state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasBackup, setHasBackup] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bancos = [], isLoading } = useQuery({
    queryKey: ["/api/admin/bancos"],
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ["/api/admin/monedas"],
  });

  const { data: metodosPago = [] } = useQuery({
    queryKey: ["/api/admin/metodos-pago"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { banco: string; numeroCuenta: string; tipo: string; monedaId?: string; metodoPagoId?: string }) =>
      apiRequest("POST", "/api/admin/bancos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bancos"] });
      setIsDialogOpen(false);
      setFormData({ banco: "", numeroCuenta: "", tipo: "Receptor", monedaId: "", metodoPagoId: "" });
      toast({ title: "Banco creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear banco", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { banco: string; numeroCuenta: string; tipo: string; monedaId?: string; metodoPagoId?: string } }) =>
      apiRequest("PUT", `/api/admin/bancos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bancos"] });
      setIsDialogOpen(false);
      setEditingBanco(null);
      setFormData({ banco: "", numeroCuenta: "", tipo: "Receptor", monedaId: "", metodoPagoId: "" });
      toast({ title: "Banco actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar banco", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/bancos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bancos"] });
      toast({ title: "Banco eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar banco", variant: "destructive" });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/bancos/undo");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bancos"] });
      setHasBackup(false);
      toast({ title: "Bancos restaurados correctamente" });
    },
    onError: () => {
      toast({ title: "Error al restaurar bancos", variant: "destructive" });
    },
  });

  const uploadExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/bancos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      
      return response.json();
    },
    onMutate: () => {
      setIsUploading(true);
      setUploadProgress(10);
    },
    onSuccess: (result) => {
      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bancos"] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setHasBackup(true);
      
      const { created, total, errors, details } = result;
      let message = `${created} bancos cargados de ${total} filas`;
      
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
          title: "Errores detallados",
          description: errorSummary,
          variant: "destructive",
          duration: 10000
        });
      } else {
        toast({ 
          title: "Error al cargar Excel", 
          description: errorMessage,
          variant: "destructive"
        });
      }
    },
    onSettled: () => {
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'xlsx' || fileExtension === 'xls' || fileExtension === 'csv') {
        setSelectedFile(file);
      } else {
        toast({
          title: "Archivo inválido",
          description: "Solo se permiten archivos .xlsx, .xls o .csv",
          variant: "destructive"
        });
      }
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadExcelMutation.mutate(selectedFile);
    }
  };

  const handleUndo = () => {
    if (confirm("¿Estás seguro de que deseas restaurar los bancos anteriores? Esta acción sobrescribirá los bancos actuales.")) {
      undoMutation.mutate();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBanco) {
      updateMutation.mutate({ id: editingBanco.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (banco: Banco) => {
    setEditingBanco(banco);
    setFormData({ 
      banco: banco.banco, 
      numeroCuenta: banco.numeroCuenta, 
      tipo: banco.tipo as "Receptor" | "Emisor",
      monedaId: banco.monedaId || "",
      metodoPagoId: banco.metodoPagoId || ""
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBanco(null);
    setFormData({ banco: "", numeroCuenta: "", tipo: "Receptor", monedaId: "", metodoPagoId: "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Bancos</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de cuentas bancarias de la empresa
          </p>
        </div>
        <div className="flex gap-2">
          {hasBackup && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              title="Deshacer última carga"
              data-testid="undo-bancos-button"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" data-testid="upload-excel-button">
                <Upload className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cargar Bancos desde Excel</DialogTitle>
                <DialogDescription>
                  Sube un archivo Excel con las columnas: Banco, Número de Cuenta, Tipo, Moneda, Método de Pago
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Seleccionar archivo</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    data-testid="file-input"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Archivo seleccionado: {selectedFile.name}
                    </p>
                  )}
                </div>
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-muted-foreground text-center">
                      Procesando... {uploadProgress}%
                    </p>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsUploadDialogOpen(false);
                      setSelectedFile(null);
                      setUploadProgress(0);
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-banco-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Banco
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBanco ? "Editar Banco" : "Agregar Banco"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="banco">Nombre del Banco</Label>
                <Input
                  id="banco"
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  placeholder="Ej: Banco de Venezuela"
                  required
                  data-testid="input-banco"
                />
              </div>
              <div>
                <Label htmlFor="numeroCuenta">Número de Cuenta</Label>
                <Input
                  id="numeroCuenta"
                  value={formData.numeroCuenta}
                  onChange={(e) => setFormData({ ...formData, numeroCuenta: e.target.value })}
                  placeholder="Ej: 0102-1234-5678-9012"
                  required
                  data-testid="input-numero-cuenta"
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de Banco</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value as "Receptor" | "Emisor" })}
                >
                  <SelectTrigger data-testid="select-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receptor" data-testid="tipo-receptor">
                      <div className="flex items-center gap-2">
                        <ArrowDownToLine className="h-4 w-4 text-green-600" />
                        <span>Receptor (Ingresos)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Emisor" data-testid="tipo-emisor">
                      <div className="flex items-center gap-2">
                        <ArrowUpFromLine className="h-4 w-4 text-blue-600" />
                        <span>Emisor (Egresos)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="moneda">Moneda</Label>
                <Select
                  value={formData.monedaId}
                  onValueChange={(value) => setFormData({ ...formData, monedaId: value })}
                >
                  <SelectTrigger data-testid="select-moneda">
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {(monedas as any[]).map((moneda: any) => (
                      <SelectItem key={moneda.id} value={moneda.id} data-testid={`moneda-${moneda.id}`}>
                        {moneda.codigo} - {moneda.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="metodoPago">Método de Pago</Label>
                <Select
                  value={formData.metodoPagoId}
                  onValueChange={(value) => setFormData({ ...formData, metodoPagoId: value })}
                >
                  <SelectTrigger data-testid="select-metodo-pago">
                    <SelectValue placeholder="Seleccionar método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {(metodosPago as any[]).map((metodo: any) => (
                      <SelectItem key={metodo.id} value={metodo.id} data-testid={`metodo-pago-${metodo.id}`}>
                        {metodo.nombre}
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
                  data-testid="submit-banco"
                >
                  {editingBanco ? "Actualizar" : "Crear"}
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
              <TableHead>Banco</TableHead>
              <TableHead>Número de Cuenta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Método de Pago</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (bancos as Banco[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay bancos registrados
                </TableCell>
              </TableRow>
            ) : (
              (bancos as Banco[]).map((banco: Banco) => {
                const moneda = (monedas as any[]).find((m: any) => m.id === banco.monedaId);
                const metodoPago = (metodosPago as any[]).find((mp: any) => mp.id === banco.metodoPagoId);
                
                return (
                  <TableRow key={banco.id} data-testid={`banco-row-${banco.id}`}>
                    <TableCell className="font-medium">{banco.banco}</TableCell>
                    <TableCell>{banco.numeroCuenta}</TableCell>
                    <TableCell>
                      {banco.tipo === "Receptor" ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300" data-testid={`tipo-badge-${banco.id}`}>
                          <ArrowDownToLine className="h-3 w-3 mr-1" />
                          Receptor
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300" data-testid={`tipo-badge-${banco.id}`}>
                          <ArrowUpFromLine className="h-3 w-3 mr-1" />
                          Emisor
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {moneda ? (
                        <span>{moneda.codigo} - {moneda.nombre}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {metodoPago ? (
                        <span>{metodoPago.nombre}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(banco)}
                          data-testid={`edit-banco-${banco.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(banco.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`delete-banco-${banco.id}`}
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