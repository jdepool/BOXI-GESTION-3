import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { format, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";
import { getEstadoEgresosBadgeClass } from "@/lib/badge-utils";

const parseLocalDate = (dateString: string) => {
  if (!dateString) return undefined;
  return parse(dateString, 'yyyy-MM-dd', new Date());
};

const formatDateOnly = (date: Date | undefined): string => {
  if (!date) return "";
  return format(date, 'yyyy-MM-dd');
};

export default function Egresos() {
  const [activeTab, setActiveTab] = useState("registrar");
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/sales">
            <Button variant="ghost" size="icon" data-testid="back-to-sales">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Cuentas por Pagar (Egresos)</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestión de egresos con flujo de autorización, pago y verificación
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="registrar" data-testid="tab-registrar">
              Registrar Cta x Pagar
            </TabsTrigger>
            <TabsTrigger value="por-autorizar" data-testid="tab-por-autorizar">
              Por Autorizar
            </TabsTrigger>
            <TabsTrigger value="por-pagar" data-testid="tab-por-pagar">
              Por Pagar
            </TabsTrigger>
            <TabsTrigger value="pagados" data-testid="tab-pagados">
              Por verificar
            </TabsTrigger>
            <TabsTrigger value="historial" data-testid="tab-historial">
              Historial Completo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrar" className="space-y-4">
            <RegistrarTab />
          </TabsContent>

          <TabsContent value="por-autorizar" className="space-y-4">
            <PorAutorizarTab />
          </TabsContent>

          <TabsContent value="por-pagar" className="space-y-4">
            <PorPagarTab />
          </TabsContent>

          <TabsContent value="pagados" className="space-y-4">
            <PorVerificarTab />
          </TabsContent>

          <TabsContent value="historial" className="space-y-4">
            <HistorialTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function RegistrarTab() {
  const { toast } = useToast();
  const [editingEgreso, setEditingEgreso] = useState<any>(null);
  const [formData, setFormData] = useState({
    fecha_registro: formatDateOnly(new Date()),
    cta_por_pagar_usd: "",
    cta_por_pagar_bs: "",
    tipo_egreso_id: "",
    descripcion: "",
    beneficiario: "",
    fecha_compromiso: "",
    numero_factura_proveedor: "",
    requiere_aprobacion: false,
    autorizador_id: "",
    es_recurrente: false,
    frecuencia_recurrencia: "",
    numero_repeticiones: "",
  });

  const { data: tiposEgresos = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/tipos-egresos"],
  });

  const { data: autorizadores = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/autorizadores"],
  });

  const { data: egresos = [] } = useQuery<any[]>({
    queryKey: ["/api/egresos"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("estado", "Borrador");
      const response = await fetch(`/api/egresos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch borradores');
      const data = await response.json();
      console.log("📦 Egresos fetched from API:", data);
      if (data.length > 0) {
        console.log("📋 First egreso keys:", Object.keys(data[0]));
        console.log("📋 First egreso:", data[0]);
      }
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingEgreso) {
        return apiRequest("PUT", `/api/egresos/${editingEgreso.id}`, data);
      } else {
        return apiRequest("POST", "/api/egresos", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      toast({
        title: editingEgreso ? "Egreso actualizado" : "Egreso creado",
        description: editingEgreso 
          ? "El egreso ha sido actualizado exitosamente"
          : "El egreso ha sido creado como borrador",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el egreso",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/egresos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      resetForm();
      toast({
        title: "Egreso eliminado",
        description: "El egreso ha sido eliminado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el egreso",
        variant: "destructive",
      });
    },
  });

  const enviarMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingEgreso) {
        return apiRequest("PUT", `/api/egresos/${editingEgreso.id}`, data);
      } else {
        return apiRequest("POST", "/api/egresos", data);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      const nextState = variables.requiereAprobacion ? "Por Autorizar" : "Por Pagar";
      toast({
        title: "Egreso enviado",
        description: `El egreso ha sido enviado a ${nextState} exitosamente`,
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el egreso",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      fecha_registro: formatDateOnly(new Date()),
      cta_por_pagar_usd: "",
      cta_por_pagar_bs: "",
      tipo_egreso_id: "",
      descripcion: "",
      beneficiario: "",
      fecha_compromiso: "",
      numero_factura_proveedor: "",
      requiere_aprobacion: false,
      autorizador_id: "",
      es_recurrente: false,
      frecuencia_recurrencia: "",
      numero_repeticiones: "",
    });
    setEditingEgreso(null);
  };

  const isFormComplete = () => {
    const hasAmount = formData.cta_por_pagar_usd || formData.cta_por_pagar_bs;
    const hasFechaCompromiso = !!formData.fecha_compromiso;
    const hasTipoEgreso = !!formData.tipo_egreso_id;
    return hasAmount && hasFechaCompromiso && hasTipoEgreso;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      estado: "Borrador",
      fechaRegistro: formData.fecha_registro,
      ctaPorPagarUsd: formData.cta_por_pagar_usd || null,
      ctaPorPagarBs: formData.cta_por_pagar_bs || null,
      tipoEgresoId: formData.tipo_egreso_id || null,
      descripcion: formData.descripcion,
      beneficiario: formData.beneficiario || null,
      fechaCompromiso: formData.fecha_compromiso || null,
      numeroFacturaProveedor: formData.numero_factura_proveedor || null,
      requiereAprobacion: formData.requiere_aprobacion,
      autorizadorId: formData.requiere_aprobacion && formData.autorizador_id ? formData.autorizador_id : null,
      esRecurrente: formData.es_recurrente,
      frecuenciaRecurrencia: formData.es_recurrente && formData.frecuencia_recurrencia ? formData.frecuencia_recurrencia : null,
      numeroRepeticiones: formData.es_recurrente && formData.numero_repeticiones ? parseInt(formData.numero_repeticiones) : null,
    };

    console.log("📤 Submitting data (camelCase):", submitData);
    createMutation.mutate(submitData);
  };

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    
    const nextEstado = formData.requiere_aprobacion ? "Por autorizar" : "Por pagar";
    
    const submitData: any = {
      estado: nextEstado,
      fechaRegistro: formData.fecha_registro,
      ctaPorPagarUsd: formData.cta_por_pagar_usd || null,
      ctaPorPagarBs: formData.cta_por_pagar_bs || null,
      tipoEgresoId: formData.tipo_egreso_id || null,
      descripcion: formData.descripcion,
      beneficiario: formData.beneficiario || null,
      fechaCompromiso: formData.fecha_compromiso || null,
      numeroFacturaProveedor: formData.numero_factura_proveedor || null,
      requiereAprobacion: formData.requiere_aprobacion,
      autorizadorId: formData.requiere_aprobacion && formData.autorizador_id ? formData.autorizador_id : null,
      esRecurrente: formData.es_recurrente,
      frecuenciaRecurrencia: formData.es_recurrente && formData.frecuencia_recurrencia ? formData.frecuencia_recurrencia : null,
      numeroRepeticiones: formData.es_recurrente && formData.numero_repeticiones ? parseInt(formData.numero_repeticiones) : null,
    };

    console.log("📤 Enviando data (camelCase):", submitData);
    enviarMutation.mutate(submitData);
  };

  const handleEdit = (egreso: any) => {
    console.log("🔍 handleEdit called with egreso:", egreso);
    console.log("📋 Egreso keys:", Object.keys(egreso));
    console.log("💰 ctaPorPagarUsd:", egreso.ctaPorPagarUsd);
    console.log("💰 ctaPorPagarBs:", egreso.ctaPorPagarBs);
    console.log("📝 tipoEgresoId:", egreso.tipoEgresoId);
    
    setEditingEgreso(egreso);
    
    const newFormData = {
      fecha_registro: egreso.fechaRegistro ? formatDateOnly(new Date(egreso.fechaRegistro)) : formatDateOnly(new Date()),
      cta_por_pagar_usd: egreso.ctaPorPagarUsd?.toString() || "",
      cta_por_pagar_bs: egreso.ctaPorPagarBs?.toString() || "",
      tipo_egreso_id: egreso.tipoEgresoId || "",
      descripcion: egreso.descripcion || "",
      beneficiario: egreso.beneficiario || "",
      fecha_compromiso: egreso.fechaCompromiso ? formatDateOnly(new Date(egreso.fechaCompromiso)) : "",
      numero_factura_proveedor: egreso.numeroFacturaProveedor || "",
      requiere_aprobacion: egreso.requiereAprobacion || false,
      autorizador_id: egreso.autorizadorId || "",
      es_recurrente: egreso.esRecurrente || false,
      frecuencia_recurrencia: egreso.frecuenciaRecurrencia || "",
      numero_repeticiones: egreso.numeroRepeticiones?.toString() || "",
    };
    
    console.log("✅ New formData:", newFormData);
    setFormData(newFormData);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Está seguro que desea eliminar este borrador?")) {
      deleteMutation.mutate(id);
    }
  };

  const getMissingFields = (egreso: any) => {
    const missing: string[] = [];
    if (!egreso.ctaPorPagarUsd && !egreso.ctaPorPagarBs) missing.push("Monto");
    if (!egreso.tipoEgresoId) missing.push("Tipo");
    if (!egreso.fechaCompromiso) missing.push("Fecha de Compromiso");
    if (egreso.requiereAprobacion && !egreso.autorizadorId) missing.push("Autorizador");
    return missing;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingEgreso ? "Editar Borrador" : "Registrar Nueva Cuenta por Pagar"}</CardTitle>
          <CardDescription>
            Complete los campos necesarios. Los borradores se pueden guardar parcialmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fecha_registro">Fecha de Registro</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="fecha_registro"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.fecha_registro && "text-muted-foreground"
                      )}
                      data-testid="input-fecha-registro"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.fecha_registro ? format(parseLocalDate(formData.fecha_registro)!, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={parseLocalDate(formData.fecha_registro)}
                      onSelect={(date) => setFormData({ ...formData, fecha_registro: formatDateOnly(date) })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="fecha_compromiso">Fecha de Compromiso</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="fecha_compromiso"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.fecha_compromiso && "text-muted-foreground"
                      )}
                      data-testid="input-fecha-compromiso"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.fecha_compromiso ? format(parseLocalDate(formData.fecha_compromiso)!, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={parseLocalDate(formData.fecha_compromiso)}
                      onSelect={(date) => setFormData({ ...formData, fecha_compromiso: formatDateOnly(date) })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cta_por_pagar_usd">Cuenta por Pagar (USD)</Label>
                <Input
                  id="cta_por_pagar_usd"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cta_por_pagar_usd}
                  onChange={(e) => setFormData({ ...formData, cta_por_pagar_usd: e.target.value })}
                  data-testid="input-cta-por-pagar-usd"
                />
              </div>

              <div>
                <Label htmlFor="cta_por_pagar_bs">Cuenta por Pagar (Bs)</Label>
                <Input
                  id="cta_por_pagar_bs"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cta_por_pagar_bs}
                  onChange={(e) => setFormData({ ...formData, cta_por_pagar_bs: e.target.value })}
                  data-testid="input-cta-por-pagar-bs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tipo_egreso_id">Tipo de Egreso</Label>
              <Select
                value={formData.tipo_egreso_id}
                onValueChange={(value) => setFormData({ ...formData, tipo_egreso_id: value })}
              >
                <SelectTrigger id="tipo_egreso_id" data-testid="select-tipo-egreso">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposEgresos.map((tipo: any) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Descripción del egreso"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                data-testid="input-descripcion"
              />
            </div>

            <div>
              <Label htmlFor="beneficiario">Pagado a</Label>
              <Input
                id="beneficiario"
                placeholder="Nombre del beneficiario"
                value={formData.beneficiario}
                onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
                data-testid="input-beneficiario"
              />
            </div>

            <div>
              <Label htmlFor="numero_factura_proveedor">Número de Factura del Proveedor</Label>
              <Input
                id="numero_factura_proveedor"
                placeholder="Ej: F-12345"
                value={formData.numero_factura_proveedor}
                onChange={(e) => setFormData({ ...formData, numero_factura_proveedor: e.target.value })}
                data-testid="input-numero-factura-proveedor"
              />
            </div>

            {/* Sección de Recurrencia */}
            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox
                  id="es_recurrente"
                  checked={formData.es_recurrente}
                  onCheckedChange={(checked) =>
                    setFormData({ 
                      ...formData, 
                      es_recurrente: checked as boolean, 
                      frecuencia_recurrencia: checked ? formData.frecuencia_recurrencia : "",
                      numero_repeticiones: checked ? formData.numero_repeticiones : "",
                    })
                  }
                  data-testid="checkbox-es-recurrente"
                />
                <Label htmlFor="es_recurrente" className="cursor-pointer font-semibold">
                  Es Recurrente
                </Label>
              </div>

              {formData.es_recurrente && (
                <div className="space-y-3 ml-6">
                  <div>
                    <Label htmlFor="frecuencia_recurrencia">Frecuencia de Recurrencia *</Label>
                    <Select
                      value={formData.frecuencia_recurrencia}
                      onValueChange={(value) => setFormData({ ...formData, frecuencia_recurrencia: value })}
                      required={formData.es_recurrente}
                    >
                      <SelectTrigger id="frecuencia_recurrencia" data-testid="select-frecuencia-recurrencia">
                        <SelectValue placeholder="Seleccionar frecuencia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diario">Diario</SelectItem>
                        <SelectItem value="Semanal">Semanal</SelectItem>
                        <SelectItem value="Quincenal">Quincenal</SelectItem>
                        <SelectItem value="Mensual">Mensual</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="numero_repeticiones">Número de Repeticiones *</Label>
                    <Input
                      id="numero_repeticiones"
                      type="number"
                      min="2"
                      max="100"
                      placeholder="Ej: 12 para un año de pagos mensuales"
                      value={formData.numero_repeticiones}
                      onChange={(e) => setFormData({ ...formData, numero_repeticiones: e.target.value })}
                      required={formData.es_recurrente}
                      data-testid="input-numero-repeticiones"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Total de egresos que se generarán automáticamente incluyendo el primero
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiere_aprobacion"
                checked={formData.requiere_aprobacion}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiere_aprobacion: checked as boolean, autorizador_id: checked ? formData.autorizador_id : "" })
                }
                data-testid="checkbox-requiere-aprobacion"
              />
              <Label htmlFor="requiere_aprobacion" className="cursor-pointer">
                Requiere Autorización
              </Label>
            </div>

            {formData.requiere_aprobacion && (
              <div>
                <Label htmlFor="autorizador_id">Autorizador</Label>
                <Select
                  value={formData.autorizador_id}
                  onValueChange={(value) => setFormData({ ...formData, autorizador_id: value })}
                >
                  <SelectTrigger id="autorizador_id" data-testid="select-autorizador">
                    <SelectValue placeholder="Seleccionar autorizador" />
                  </SelectTrigger>
                  <SelectContent>
                    {autorizadores.map((autorizador: any) => (
                      <SelectItem key={autorizador.id} value={autorizador.id}>
                        {autorizador.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                type="submit" 
                variant="outline"
                disabled={createMutation.isPending}
                data-testid="button-guardar-borrador"
              >
                {createMutation.isPending ? "Guardando..." : "Guardar Borrador"}
              </Button>
              <Button 
                type="button"
                onClick={handleEnviar}
                disabled={!isFormComplete() || enviarMutation.isPending}
                className="flex-1"
                data-testid="button-enviar"
              >
                {enviarMutation.isPending ? "Enviando..." : "Enviar"}
              </Button>
              {editingEgreso && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={resetForm}
                  data-testid="button-cancelar-edicion"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Borradores Guardados</CardTitle>
          <CardDescription>
            Registros parciales que requieren completar información antes de enviar a autorización
          </CardDescription>
        </CardHeader>
        <CardContent>
          {egresos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay borradores guardados
            </p>
          ) : (
            <div className="space-y-3">
              {egresos.map((egreso: any) => {
                const missingFields = getMissingFields(egreso);
                const tipoNombre = tiposEgresos.find((t: any) => t.id === egreso.tipoEgresoId)?.nombre;
                
                return (
                  <div
                    key={egreso.id}
                    className="border rounded-lg p-4 space-y-2"
                    data-testid={`borrador-${egreso.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {tipoNombre || "Sin tipo"}
                          </span>
                          {missingFields.length > 0 && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Incompleto
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {egreso.descripcion || "Sin descripción"}
                        </p>
                        <div className="text-sm mt-1">
                          {egreso.ctaPorPagarUsd && (
                            <span className="text-green-600 dark:text-green-400">
                              ${parseFloat(egreso.ctaPorPagarUsd).toFixed(2)}
                            </span>
                          )}
                          {egreso.ctaPorPagarUsd && egreso.ctaPorPagarBs && " | "}
                          {egreso.ctaPorPagarBs && (
                            <span className="text-blue-600 dark:text-blue-400">
                              Bs {parseFloat(egreso.ctaPorPagarBs).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {missingFields.length > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Faltan: {missingFields.join(", ")}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Registrado: {egreso.fechaRegistro ? format(new Date(egreso.fechaRegistro), "dd/MM/yyyy") : "N/A"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(egreso)}
                          data-testid={`edit-borrador-${egreso.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(egreso.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`delete-borrador-${egreso.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PorAutorizarTab() {
  const { toast } = useToast();
  const [selectedEgreso, setSelectedEgreso] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [autorizacionData, setAutorizacionData] = useState({
    accion_autorizacion: "",
    notas_autorizacion: "",
  });

  const { data: egresos = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/egresos", "por-autorizar"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("estado", "Por autorizar");
      params.append("requiere_aprobacion", "true");
      const response = await fetch(`/api/egresos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch egresos');
      return response.json();
    },
  });

  const { data: tiposEgresos = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/tipos-egresos"],
  });

  const { data: autorizadores = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/autorizadores"],
  });

  const autorizarMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/egresos/${selectedEgreso.id}/autorizar`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      toast({
        title: "Egreso autorizado",
        description: `El egreso ha sido ${autorizacionData.accion_autorizacion === "Aprobar" ? "aprobado" : "rechazado"} exitosamente`,
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo autorizar el egreso",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedEgreso(null);
    setAutorizacionData({
      accion_autorizacion: "",
      notas_autorizacion: "",
    });
  };

  const handleOpenDialog = (egreso: any) => {
    setSelectedEgreso(egreso);
    setIsDialogOpen(true);
  };

  const handleAutorizar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!autorizacionData.accion_autorizacion) {
      toast({
        title: "Error",
        description: "Debe seleccionar una acción (Aprobar o Rechazar)",
        variant: "destructive",
      });
      return;
    }

    autorizarMutation.mutate({
      accion: autorizacionData.accion_autorizacion,
      notas: autorizacionData.notas_autorizacion,
    });
  };

  if (isLoading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Egresos Pendientes de Autorización</CardTitle>
          <CardDescription>
            Egresos que requieren aprobación antes de proceder al pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          {egresos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay egresos pendientes de autorización
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead>Fecha Compromiso</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Pagado a</TableHead>
                  <TableHead>Cta x pagar USD</TableHead>
                  <TableHead>Cta x pagar Bs</TableHead>
                  <TableHead>Autorizador</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {egresos.map((egreso: any) => {
                  const tipoNombre = tiposEgresos.find((t: any) => t.id === egreso.tipoEgresoId)?.nombre;
                  const autorizadorNombre = autorizadores.find((a: any) => a.id === egreso.autorizadorId)?.nombre;
                  
                  return (
                    <TableRow key={egreso.id} data-testid={`egreso-por-autorizar-${egreso.id}`}>
                      <TableCell>
                        {egreso.fechaRegistro ? format(new Date(egreso.fechaRegistro), "dd/MM/yyyy") : "N/A"}
                      </TableCell>
                      <TableCell>
                        {egreso.fechaCompromiso ? format(new Date(egreso.fechaCompromiso), "dd/MM/yyyy") : "N/A"}
                      </TableCell>
                      <TableCell>{tipoNombre || "N/A"}</TableCell>
                      <TableCell className="max-w-xs truncate">{egreso.descripcion}</TableCell>
                      <TableCell>{egreso.beneficiario || "N/A"}</TableCell>
                      <TableCell>
                        {egreso.ctaPorPagarUsd ? (
                          <div className="text-green-600 dark:text-green-400">
                            ${parseFloat(egreso.ctaPorPagarUsd).toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {egreso.ctaPorPagarBs ? (
                          <div className="text-blue-600 dark:text-blue-400">
                            Bs {parseFloat(egreso.ctaPorPagarBs).toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{autorizadorNombre || "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleOpenDialog(egreso)}
                          data-testid={`autorizar-egreso-${egreso.id}`}
                        >
                          Autorizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
        else setIsDialogOpen(true);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autorizar Egreso</DialogTitle>
            <DialogDescription>
              Revise los detalles y tome una decisión sobre este egreso
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAutorizar} className="space-y-4">
            {selectedEgreso && (
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div><strong>Tipo:</strong> {tiposEgresos.find((t: any) => t.id === selectedEgreso.tipoEgresoId)?.nombre}</div>
                <div><strong>Descripción:</strong> {selectedEgreso.descripcion}</div>
                <div>
                  <strong>Monto:</strong>{" "}
                  {selectedEgreso.ctaPorPagarUsd && `$${parseFloat(selectedEgreso.ctaPorPagarUsd).toFixed(2)}`}
                  {selectedEgreso.ctaPorPagarUsd && selectedEgreso.ctaPorPagarBs && " | "}
                  {selectedEgreso.ctaPorPagarBs && `Bs ${parseFloat(selectedEgreso.ctaPorPagarBs).toFixed(2)}`}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="accion_autorizacion">Acción *</Label>
              <Select
                value={autorizacionData.accion_autorizacion}
                onValueChange={(value) => setAutorizacionData({ ...autorizacionData, accion_autorizacion: value })}
                required
              >
                <SelectTrigger id="accion_autorizacion" data-testid="select-accion-autorizacion">
                  <SelectValue placeholder="Seleccionar acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aprobar">Aprobar</SelectItem>
                  <SelectItem value="Rechazar">Rechazar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notas_autorizacion">Notas / Comentarios</Label>
              <Textarea
                id="notas_autorizacion"
                placeholder="Comentarios opcionales sobre la decisión"
                value={autorizacionData.notas_autorizacion}
                onChange={(e) => setAutorizacionData({ ...autorizacionData, notas_autorizacion: e.target.value })}
                rows={3}
                data-testid="input-notas-autorizacion"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={autorizarMutation.isPending}
                data-testid="button-confirmar-autorizacion"
              >
                {autorizarMutation.isPending ? "Procesando..." : "Confirmar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={autorizarMutation.isPending}
                data-testid="button-cancelar-autorizacion"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PorPagarTab() {
  const { toast } = useToast();
  const [selectedEgreso, setSelectedEgreso] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pagoData, setPagoData] = useState({
    fecha_pago: formatDateOnly(new Date()),
    monto_pagado_usd: "",
    monto_pagado_bs: "",
    tasa_cambio: "",
    banco_id: "",
    referencia_pago: "",
    numero_factura_pagada: "",
  });

  const { data: egresos = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/egresos", "por-pagar"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("estado", "Por pagar");
      const response = await fetch(`/api/egresos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch egresos');
      return response.json();
    },
  });

  const { data: tiposEgresos = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/tipos-egresos"],
  });

  const { data: bancos = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/bancos"],
  });

  const pagoMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/egresos/${selectedEgreso.id}/registrar-pago`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      toast({
        title: "Pago registrado",
        description: "El pago ha sido registrado exitosamente",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el pago",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedEgreso(null);
    setPagoData({
      fecha_pago: formatDateOnly(new Date()),
      monto_pagado_usd: "",
      monto_pagado_bs: "",
      tasa_cambio: "",
      banco_id: "",
      referencia_pago: "",
      numero_factura_pagada: "",
    });
  };

  const handleOpenDialog = (egreso: any) => {
    setSelectedEgreso(egreso);
    setPagoData({
      fecha_pago: formatDateOnly(new Date()),
      monto_pagado_usd: egreso.ctaPorPagarUsd?.toString() || "",
      monto_pagado_bs: egreso.ctaPorPagarBs?.toString() || "",
      tasa_cambio: "",
      banco_id: "",
      referencia_pago: "",
      numero_factura_pagada: egreso.numeroFacturaProveedor || "",
    });
    setIsDialogOpen(true);
  };

  const handleRegistrarPago = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: any = {
      fechaPago: pagoData.fecha_pago,
      montoPagadoUsd: pagoData.monto_pagado_usd ? parseFloat(pagoData.monto_pagado_usd) : null,
      montoPagadoBs: pagoData.monto_pagado_bs ? parseFloat(pagoData.monto_pagado_bs) : null,
      tasaCambio: pagoData.tasa_cambio ? parseFloat(pagoData.tasa_cambio) : null,
      bancoId: pagoData.banco_id || null,
      referenciaPago: pagoData.referencia_pago || null,
      numeroFacturaPagada: pagoData.numero_factura_pagada || null,
    };

    pagoMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Egresos Aprobados por Pagar</CardTitle>
          <CardDescription>
            Egresos aprobados que requieren registro del pago efectuado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {egresos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay egresos pendientes de pago
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Pagado a</TableHead>
                  <TableHead>Cta x pagar USD</TableHead>
                  <TableHead>Cta x pagar Bs</TableHead>
                  <TableHead>Compromiso</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {egresos.map((egreso: any) => {
                  const tipoNombre = tiposEgresos.find((t: any) => t.id === egreso.tipoEgresoId)?.nombre;
                  
                  return (
                    <TableRow key={egreso.id} data-testid={`egreso-por-pagar-${egreso.id}`}>
                      <TableCell>
                        {egreso.fechaRegistro ? format(new Date(egreso.fechaRegistro), "dd/MM/yyyy") : "N/A"}
                      </TableCell>
                      <TableCell>{tipoNombre || "N/A"}</TableCell>
                      <TableCell className="max-w-xs truncate">{egreso.descripcion}</TableCell>
                      <TableCell>{egreso.beneficiario || "N/A"}</TableCell>
                      <TableCell>
                        {egreso.ctaPorPagarUsd ? (
                          <div className="text-green-600 dark:text-green-400">
                            ${parseFloat(egreso.ctaPorPagarUsd).toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {egreso.ctaPorPagarBs ? (
                          <div className="text-blue-600 dark:text-blue-400">
                            Bs {parseFloat(egreso.ctaPorPagarBs).toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {egreso.fechaCompromiso ? format(new Date(egreso.fechaCompromiso), "dd/MM/yyyy") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleOpenDialog(egreso)}
                          data-testid={`registrar-pago-${egreso.id}`}
                        >
                          Registrar Pago
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
        else setIsDialogOpen(true);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Pago de Egreso</DialogTitle>
            <DialogDescription>
              Complete los detalles del pago efectuado
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegistrarPago} className="space-y-4">
            {selectedEgreso && (
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div><strong>Tipo:</strong> {tiposEgresos.find((t: any) => t.id === selectedEgreso.tipoEgresoId)?.nombre}</div>
                <div><strong>Descripción:</strong> {selectedEgreso.descripcion}</div>
                <div>
                  <strong>Monto a Pagar:</strong>{" "}
                  {selectedEgreso.ctaPorPagarUsd && `$${parseFloat(selectedEgreso.ctaPorPagarUsd).toFixed(2)}`}
                  {selectedEgreso.ctaPorPagarUsd && selectedEgreso.ctaPorPagarBs && " | "}
                  {selectedEgreso.ctaPorPagarBs && `Bs ${parseFloat(selectedEgreso.ctaPorPagarBs).toFixed(2)}`}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="fecha_pago">Fecha de Pago</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="fecha_pago"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !pagoData.fecha_pago && "text-muted-foreground"
                    )}
                    data-testid="input-fecha-pago"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pagoData.fecha_pago ? format(parseLocalDate(pagoData.fecha_pago)!, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={parseLocalDate(pagoData.fecha_pago)}
                    onSelect={(date) => setPagoData({ ...pagoData, fecha_pago: formatDateOnly(date) })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monto_pagado_usd">Monto Pagado (USD)</Label>
                <Input
                  id="monto_pagado_usd"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={pagoData.monto_pagado_usd}
                  onChange={(e) => setPagoData({ ...pagoData, monto_pagado_usd: e.target.value })}
                  data-testid="input-monto-pagado-usd"
                />
              </div>

              <div>
                <Label htmlFor="monto_pagado_bs">Monto Pagado (Bs)</Label>
                <Input
                  id="monto_pagado_bs"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={pagoData.monto_pagado_bs}
                  onChange={(e) => setPagoData({ ...pagoData, monto_pagado_bs: e.target.value })}
                  data-testid="input-monto-pagado-bs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tasa_cambio">Tasa de Cambio (opcional)</Label>
              <Input
                id="tasa_cambio"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={pagoData.tasa_cambio}
                onChange={(e) => setPagoData({ ...pagoData, tasa_cambio: e.target.value })}
                data-testid="input-tasa-cambio"
              />
            </div>

            <div>
              <Label htmlFor="banco_id">Banco Emisor</Label>
              <Select
                value={pagoData.banco_id}
                onValueChange={(value) => setPagoData({ ...pagoData, banco_id: value })}
              >
                <SelectTrigger id="banco_id" data-testid="select-banco">
                  <SelectValue placeholder="Seleccionar banco" />
                </SelectTrigger>
                <SelectContent>
                  {bancos.filter((b: any) => b.tipo === "Emisor").map((banco: any) => (
                    <SelectItem key={banco.id} value={banco.id}>
                      {banco.banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="referencia_pago">Referencia de Pago</Label>
              <Input
                id="referencia_pago"
                placeholder="Ej: REF-12345"
                value={pagoData.referencia_pago}
                onChange={(e) => setPagoData({ ...pagoData, referencia_pago: e.target.value })}
                data-testid="input-referencia-pago"
              />
            </div>

            <div>
              <Label htmlFor="numero_factura_pagada">Número de Factura Pagada</Label>
              <Input
                id="numero_factura_pagada"
                placeholder="Ej: F-12345"
                value={pagoData.numero_factura_pagada}
                onChange={(e) => setPagoData({ ...pagoData, numero_factura_pagada: e.target.value })}
                data-testid="input-numero-factura-pagada"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={pagoMutation.isPending}
                data-testid="button-confirmar-pago"
              >
                {pagoMutation.isPending ? "Guardando..." : "Confirmar Pago"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={pagoMutation.isPending}
                data-testid="button-cancelar-pago"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PorVerificarTab() {
  const { toast } = useToast();
  const [selectedEgreso, setSelectedEgreso] = useState<any>(null);
  const [isEditPagoDialogOpen, setIsEditPagoDialogOpen] = useState(false);
  const [isEditEgresoDialogOpen, setIsEditEgresoDialogOpen] = useState(false);
  const [pagoData, setPagoData] = useState({
    fecha_pago: "",
    monto_pagado_usd: "",
    monto_pagado_bs: "",
    tasa_cambio: "",
    banco_id: "",
    referencia_pago: "",
    numero_factura_pagada: "",
  });
  const [egresoData, setEgresoData] = useState({
    cta_por_pagar_usd: "",
    cta_por_pagar_bs: "",
    tipo_egreso_id: "",
    descripcion: "",
    fecha_compromiso: "",
    numero_factura_proveedor: "",
    requiere_aprobacion: false,
    autorizador_id: "",
  });

  const { data: egresos = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/egresos", "por-verificar"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("estado", "Por verificar");
      params.append("estado", "Rechazado");
      const response = await fetch(`/api/egresos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch egresos');
      return response.json();
    },
  });

  const { data: tiposEgresos = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/tipos-egresos"],
  });

  const { data: bancos = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/bancos"],
  });

  const { data: autorizadores = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/autorizadores"],
  });

  const editEgresoMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/egresos/${selectedEgreso.id}/editar-datos`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      toast({
        title: "Egreso actualizado",
        description: "Los datos del egreso han sido actualizados exitosamente",
      });
      handleCloseEditEgresoDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el egreso",
        variant: "destructive",
      });
    },
  });

  const editPagoMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/egresos/${selectedEgreso.id}/editar-pago`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      toast({
        title: "Pago actualizado",
        description: "Los datos del pago han sido actualizados exitosamente",
      });
      handleCloseEditPagoDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el pago",
        variant: "destructive",
      });
    },
  });

  const handleCloseEditPagoDialog = () => {
    setIsEditPagoDialogOpen(false);
    setSelectedEgreso(null);
    setPagoData({
      fecha_pago: "",
      monto_pagado_usd: "",
      monto_pagado_bs: "",
      tasa_cambio: "",
      banco_id: "",
      referencia_pago: "",
      numero_factura_pagada: "",
    });
  };

  const handleOpenEditPagoDialog = (egreso: any) => {
    setSelectedEgreso(egreso);
    setPagoData({
      fecha_pago: egreso.fechaPago ? formatDateOnly(new Date(egreso.fechaPago)) : "",
      monto_pagado_usd: egreso.montoPagadoUsd?.toString() || "",
      monto_pagado_bs: egreso.montoPagadoBs?.toString() || "",
      tasa_cambio: egreso.tasaCambio?.toString() || "",
      banco_id: egreso.bancoId || "",
      referencia_pago: egreso.referenciaPago || "",
      numero_factura_pagada: egreso.numeroFacturaPagada || "",
    });
    setIsEditPagoDialogOpen(true);
  };

  const handleEditPago = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: any = {
      fechaPago: pagoData.fecha_pago,
      montoPagadoUsd: pagoData.monto_pagado_usd || null,
      montoPagadoBs: pagoData.monto_pagado_bs || null,
      tasaCambio: pagoData.tasa_cambio || null,
      bancoId: pagoData.banco_id || null,
      referenciaPago: pagoData.referencia_pago || null,
      numeroFacturaPagada: pagoData.numero_factura_pagada || null,
    };

    editPagoMutation.mutate(submitData);
  };

  const handleCloseEditEgresoDialog = () => {
    setIsEditEgresoDialogOpen(false);
    setSelectedEgreso(null);
    setEgresoData({
      cta_por_pagar_usd: "",
      cta_por_pagar_bs: "",
      tipo_egreso_id: "",
      descripcion: "",
      fecha_compromiso: "",
      numero_factura_proveedor: "",
      requiere_aprobacion: false,
      autorizador_id: "",
    });
  };

  const handleOpenEditEgresoDialog = (egreso: any) => {
    setSelectedEgreso(egreso);
    setEgresoData({
      cta_por_pagar_usd: egreso.ctaPorPagarUsd?.toString() || "",
      cta_por_pagar_bs: egreso.ctaPorPagarBs?.toString() || "",
      tipo_egreso_id: egreso.tipoEgresoId || "",
      descripcion: egreso.descripcion || "",
      fecha_compromiso: egreso.fechaCompromiso ? formatDateOnly(new Date(egreso.fechaCompromiso)) : "",
      numero_factura_proveedor: egreso.numeroFacturaProveedor || "",
      requiere_aprobacion: egreso.requiereAprobacion || false,
      autorizador_id: egreso.autorizadorId || "",
    });
    setIsEditEgresoDialogOpen(true);
  };

  const handleEditEgreso = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: any = {
      ctaPorPagarUsd: egresoData.cta_por_pagar_usd || null,
      ctaPorPagarBs: egresoData.cta_por_pagar_bs || null,
      tipoEgresoId: egresoData.tipo_egreso_id,
      descripcion: egresoData.descripcion,
      fechaCompromiso: egresoData.fecha_compromiso,
      numeroFacturaProveedor: egresoData.numero_factura_proveedor || null,
      requiereAprobacion: egresoData.requiere_aprobacion,
      autorizadorId: egresoData.requiere_aprobacion ? egresoData.autorizador_id : null,
    };

    editEgresoMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Egresos Por Verificar</CardTitle>
          <CardDescription>
            Egresos con pago registrado pendientes de verificación, incluyendo rechazados que pueden ser editados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {egresos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay egresos por verificar
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Registro</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Pagado a</TableHead>
                    <TableHead>Cta x Pagar USD</TableHead>
                    <TableHead>Cta x Pagar Bs</TableHead>
                    <TableHead>Monto Pagado USD</TableHead>
                    <TableHead>Monto Pagado Bs</TableHead>
                    <TableHead>Tasa Cambio</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {egresos.map((egreso: any) => {
                    const tipoNombre = tiposEgresos.find((t: any) => t.id === egreso.tipoEgresoId)?.nombre;
                    const bancoNombre = bancos.find((b: any) => b.id === egreso.bancoId)?.banco;
                    
                    return (
                      <TableRow key={egreso.id} data-testid={`egreso-pagado-${egreso.id}`}>
                        <TableCell>
                          {egreso.fechaRegistro ? format(new Date(egreso.fechaRegistro), "dd/MM/yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          {egreso.fechaPago ? format(new Date(egreso.fechaPago), "dd/MM/yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>{tipoNombre || "N/A"}</TableCell>
                        <TableCell className="max-w-xs truncate">{egreso.descripcion}</TableCell>
                        <TableCell>{egreso.beneficiario || "N/A"}</TableCell>
                        <TableCell>
                          {egreso.ctaPorPagarUsd ? (
                            <div className="text-green-600 dark:text-green-400">
                              ${parseFloat(egreso.ctaPorPagarUsd).toFixed(2)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {egreso.ctaPorPagarBs ? (
                            <div className="text-blue-600 dark:text-blue-400">
                              Bs {parseFloat(egreso.ctaPorPagarBs).toFixed(2)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {egreso.montoPagadoUsd ? (
                            <div className="text-green-600 dark:text-green-400 font-medium">
                              ${parseFloat(egreso.montoPagadoUsd).toFixed(2)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {egreso.montoPagadoBs ? (
                            <div className="text-blue-600 dark:text-blue-400 font-medium">
                              Bs {parseFloat(egreso.montoPagadoBs).toFixed(2)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {egreso.tasaCambio ? parseFloat(egreso.tasaCambio).toFixed(2) : "N/A"}
                        </TableCell>
                        <TableCell>{bancoNombre || "N/A"}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {egreso.referenciaPago || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditEgresoDialog(egreso)}
                              data-testid={`editar-egreso-${egreso.id}`}
                            >
                              Editar Egreso
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditPagoDialog(egreso)}
                              data-testid={`editar-pago-${egreso.id}`}
                            >
                              Editar Pago
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
        </CardContent>
      </Card>

      <Dialog open={isEditPagoDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseEditPagoDialog();
        else setIsEditPagoDialogOpen(true);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Datos del Pago</DialogTitle>
            <DialogDescription>
              Modifique los detalles del pago registrado
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditPago} className="space-y-4">
            {selectedEgreso && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm"><strong>Tipo:</strong> {tiposEgresos.find((t: any) => t.id === selectedEgreso.tipoEgresoId)?.nombre}</p>
                <p className="text-sm"><strong>Descripción:</strong> {selectedEgreso.descripcion}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-fecha-pago">Fecha de Pago</Label>
                <Input
                  id="edit-fecha-pago"
                  type="date"
                  value={pagoData.fecha_pago}
                  onChange={(e) => setPagoData({ ...pagoData, fecha_pago: e.target.value })}
                  required
                  data-testid="input-edit-fecha-pago"
                />
              </div>

              <div>
                <Label htmlFor="edit-banco-id">Banco</Label>
                <Select
                  value={pagoData.banco_id}
                  onValueChange={(value) => setPagoData({ ...pagoData, banco_id: value })}
                  required
                >
                  <SelectTrigger id="edit-banco-id" data-testid="select-edit-banco-id">
                    <SelectValue placeholder="Seleccione un banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {bancos.map((banco: any) => (
                      <SelectItem key={banco.id} value={banco.id}>
                        {banco.banco}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-monto-pagado-usd">Monto Pagado USD</Label>
                <Input
                  id="edit-monto-pagado-usd"
                  type="number"
                  step="0.01"
                  value={pagoData.monto_pagado_usd}
                  onChange={(e) => setPagoData({ ...pagoData, monto_pagado_usd: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-edit-monto-pagado-usd"
                />
              </div>

              <div>
                <Label htmlFor="edit-monto-pagado-bs">Monto Pagado Bs</Label>
                <Input
                  id="edit-monto-pagado-bs"
                  type="number"
                  step="0.01"
                  value={pagoData.monto_pagado_bs}
                  onChange={(e) => setPagoData({ ...pagoData, monto_pagado_bs: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-edit-monto-pagado-bs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-tasa-cambio">Tasa de Cambio</Label>
              <Input
                id="edit-tasa-cambio"
                type="number"
                step="0.01"
                value={pagoData.tasa_cambio}
                onChange={(e) => setPagoData({ ...pagoData, tasa_cambio: e.target.value })}
                placeholder="0.00"
                data-testid="input-edit-tasa-cambio"
              />
            </div>

            <div>
              <Label htmlFor="edit-referencia-pago">Referencia de Pago</Label>
              <Input
                id="edit-referencia-pago"
                value={pagoData.referencia_pago}
                onChange={(e) => setPagoData({ ...pagoData, referencia_pago: e.target.value })}
                placeholder="Número de referencia"
                data-testid="input-edit-referencia-pago"
              />
            </div>

            <div>
              <Label htmlFor="edit-numero-factura-pagada">Número de Factura Pagada</Label>
              <Input
                id="edit-numero-factura-pagada"
                value={pagoData.numero_factura_pagada}
                onChange={(e) => setPagoData({ ...pagoData, numero_factura_pagada: e.target.value })}
                placeholder="Número de factura"
                data-testid="input-edit-numero-factura-pagada"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={editPagoMutation.isPending}
                data-testid="button-confirmar-edit-pago"
              >
                {editPagoMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditPagoDialog}
                disabled={editPagoMutation.isPending}
                data-testid="button-cancelar-edit-pago"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditEgresoDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseEditEgresoDialog();
        else setIsEditEgresoDialogOpen(true);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Datos del Egreso</DialogTitle>
            <DialogDescription>
              Modifique los detalles generales del egreso
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditEgreso} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-cta-por-pagar-usd">Cuenta por Pagar USD</Label>
                <Input
                  id="edit-cta-por-pagar-usd"
                  type="number"
                  step="0.01"
                  value={egresoData.cta_por_pagar_usd}
                  onChange={(e) => setEgresoData({ ...egresoData, cta_por_pagar_usd: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-edit-cta-por-pagar-usd"
                />
              </div>

              <div>
                <Label htmlFor="edit-cta-por-pagar-bs">Cuenta por Pagar Bs</Label>
                <Input
                  id="edit-cta-por-pagar-bs"
                  type="number"
                  step="0.01"
                  value={egresoData.cta_por_pagar_bs}
                  onChange={(e) => setEgresoData({ ...egresoData, cta_por_pagar_bs: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-edit-cta-por-pagar-bs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-tipo-egreso-id">Tipo de Egreso *</Label>
              <Select
                value={egresoData.tipo_egreso_id}
                onValueChange={(value) => setEgresoData({ ...egresoData, tipo_egreso_id: value })}
                required
              >
                <SelectTrigger id="edit-tipo-egreso-id" data-testid="select-edit-tipo-egreso-id">
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposEgresos.map((tipo: any) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-descripcion">Descripción *</Label>
              <Textarea
                id="edit-descripcion"
                value={egresoData.descripcion}
                onChange={(e) => setEgresoData({ ...egresoData, descripcion: e.target.value })}
                placeholder="Descripción del egreso"
                required
                rows={3}
                data-testid="textarea-edit-descripcion"
              />
            </div>

            <div>
              <Label htmlFor="edit-fecha-compromiso">Fecha de Compromiso</Label>
              <Input
                id="edit-fecha-compromiso"
                type="date"
                value={egresoData.fecha_compromiso}
                onChange={(e) => setEgresoData({ ...egresoData, fecha_compromiso: e.target.value })}
                data-testid="input-edit-fecha-compromiso"
              />
            </div>

            <div>
              <Label htmlFor="edit-numero-factura-proveedor">Número de Factura del Proveedor</Label>
              <Input
                id="edit-numero-factura-proveedor"
                value={egresoData.numero_factura_proveedor}
                onChange={(e) => setEgresoData({ ...egresoData, numero_factura_proveedor: e.target.value })}
                placeholder="Número de factura"
                data-testid="input-edit-numero-factura-proveedor"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-requiere-aprobacion"
                checked={egresoData.requiere_aprobacion}
                onChange={(e) => setEgresoData({ 
                  ...egresoData, 
                  requiere_aprobacion: e.target.checked,
                  autorizador_id: e.target.checked ? egresoData.autorizador_id : ""
                })}
                className="h-4 w-4"
                data-testid="checkbox-edit-requiere-aprobacion"
              />
              <Label htmlFor="edit-requiere-aprobacion" className="cursor-pointer">
                Requiere Aprobación
              </Label>
            </div>

            {egresoData.requiere_aprobacion && (
              <div>
                <Label htmlFor="edit-autorizador-id">Autorizador *</Label>
                <Select
                  value={egresoData.autorizador_id}
                  onValueChange={(value) => setEgresoData({ ...egresoData, autorizador_id: value })}
                  required={egresoData.requiere_aprobacion}
                >
                  <SelectTrigger id="edit-autorizador-id" data-testid="select-edit-autorizador-id">
                    <SelectValue placeholder="Seleccione un autorizador" />
                  </SelectTrigger>
                  <SelectContent>
                    {autorizadores.map((autorizador: any) => (
                      <SelectItem key={autorizador.id} value={autorizador.id}>
                        {autorizador.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={editEgresoMutation.isPending}
                data-testid="button-confirmar-edit-egreso"
              >
                {editEgresoMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditEgresoDialog}
                disabled={editEgresoMutation.isPending}
                data-testid="button-cancelar-edit-egreso"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistorialTab() {
  const [filters, setFilters] = useState({
    estado: "all",
    tipo_egreso_id: "all",
    start_date: "",
    end_date: "",
  });

  const { data: egresos = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/egresos", "historial", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.estado !== "all") params.append("estado", filters.estado);
      if (filters.tipo_egreso_id !== "all") params.append("tipo_egreso_id", filters.tipo_egreso_id);
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);
      
      const response = await fetch(`/api/egresos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch egresos');
      return response.json();
    },
  });

  const { data: tiposEgresos = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/tipos-egresos"],
  });

  if (isLoading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="filter-estado">Estado</Label>
              <Select
                value={filters.estado}
                onValueChange={(value) => setFilters({ ...filters, estado: value })}
              >
                <SelectTrigger id="filter-estado" data-testid="filter-estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Borrador">Borrador</SelectItem>
                  <SelectItem value="Por autorizar">Por autorizar</SelectItem>
                  <SelectItem value="Por pagar">Por pagar</SelectItem>
                  <SelectItem value="Pagado">Pagado</SelectItem>
                  <SelectItem value="Verificado">Verificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-tipo">Tipo de Egreso</Label>
              <Select
                value={filters.tipo_egreso_id}
                onValueChange={(value) => setFilters({ ...filters, tipo_egreso_id: value })}
              >
                <SelectTrigger id="filter-tipo" data-testid="filter-tipo-egreso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tiposEgresos.map((tipo: any) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-start-date">Fecha Desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-start-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.start_date && "text-muted-foreground"
                    )}
                    data-testid="filter-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.start_date ? format(parseLocalDate(filters.start_date)!, "dd/MM/yyyy") : "Desde"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={parseLocalDate(filters.start_date)}
                    onSelect={(date) => setFilters({ ...filters, start_date: formatDateOnly(date) })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="filter-end-date">Fecha Hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-end-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.end_date && "text-muted-foreground"
                    )}
                    data-testid="filter-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.end_date ? format(parseLocalDate(filters.end_date)!, "dd/MM/yyyy") : "Hasta"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={parseLocalDate(filters.end_date)}
                    onSelect={(date) => setFilters({ ...filters, end_date: formatDateOnly(date) })}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial Completo de Egresos</CardTitle>
          <CardDescription>
            Todos los egresos registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {egresos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No se encontraron egresos con los filtros seleccionados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Registro</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Pagado a</TableHead>
                    <TableHead>Cta x Pagar USD</TableHead>
                    <TableHead>Cta x Pagar Bs</TableHead>
                    <TableHead>Monto Pagado USD</TableHead>
                    <TableHead>Monto Pagado Bs</TableHead>
                    <TableHead>Tasa Cambio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {egresos.map((egreso: any) => {
                    const tipoNombre = tiposEgresos.find((t: any) => t.id === egreso.tipoEgresoId)?.nombre;
                    
                    return (
                      <TableRow key={egreso.id} data-testid={`egreso-historial-${egreso.id}`}>
                        <TableCell>
                          {egreso.fechaRegistro ? format(new Date(egreso.fechaRegistro), "dd/MM/yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>{tipoNombre || "N/A"}</TableCell>
                        <TableCell className="max-w-xs truncate">{egreso.descripcion}</TableCell>
                        <TableCell>{egreso.beneficiario || "N/A"}</TableCell>
                        <TableCell>
                          {egreso.ctaPorPagarUsd ? (
                            <span className="text-green-600 dark:text-green-400">
                              ${parseFloat(egreso.ctaPorPagarUsd).toFixed(2)}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {egreso.ctaPorPagarBs ? (
                            <span className="text-blue-600 dark:text-blue-400">
                              Bs {parseFloat(egreso.ctaPorPagarBs).toFixed(2)}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {egreso.montoPagadoUsd ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              ${parseFloat(egreso.montoPagadoUsd).toFixed(2)}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {egreso.montoPagadoBs ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              Bs {parseFloat(egreso.montoPagadoBs).toFixed(2)}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {egreso.tasaCambio ? parseFloat(egreso.tasaCambio).toFixed(2) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getEstadoEgresosBadgeClass(egreso.estado)}>
                            {egreso.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {egreso.fechaPago ? format(new Date(egreso.fechaPago), "dd/MM/yyyy") : "N/A"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
