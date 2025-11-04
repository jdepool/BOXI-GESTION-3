import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getChannelBadgeClass } from "@/lib/channelBadges";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Filter, ChevronDown, ChevronUp, Download, ChevronLeft, ChevronRight, CalendarIcon, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import Sidebar from "@/components/layout/sidebar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { VerificacionPagosCasheaTab } from "@/components/admin/verificacion-pagos-cashea-tab";
import { VerificacionEgresosTab } from "@/components/admin/verificacion-egresos-tab";

// Helper function to format Date to YYYY-MM-DD in local timezone (prevents timezone shift)
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to safely display dates from database without timezone shifts
const formatDisplayDate = (dateValue: string | Date | null) => {
  if (!dateValue) return '-';
  const dateStr = dateValue.toString();
  // Extract just the date part (YYYY-MM-DD) from ISO timestamp
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const [year, month, day] = match[1].split('-');
    return `${day}/${month}/${year}`;
  }
  // Fallback to date-fns format if not ISO format
  return format(new Date(dateValue), "dd/MM/yyyy");
};

interface VerificationPayment {
  paymentId: string;
  paymentType: string;
  orden: string;
  nombre: string | null;
  canal: string | null;
  tipoPago: string;
  montoBs: number | null;
  montoUsd: number | null;
  referencia: string | null;
  bancoId: string | null;
  estadoVerificacion: string;
  notasVerificacion: string | null;
  fecha: Date | null;
}

interface Banco {
  id: string;
  banco: string;
}

export default function VerificacionPage() {
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<VerificationPayment | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  
  // Filters
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBanco, setSelectedBanco] = useState("all");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [ordenFilter, setOrdenFilter] = useState("");
  const [tipoPagoFilter, setTipoPagoFilter] = useState("all");
  
  // Debounced order filter - local state for immediate UI updates
  const [ordenInputValue, setOrdenInputValue] = useState("");
  
  // Pagination
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  // Debounce order filter - trigger filter update 500ms after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (ordenInputValue !== ordenFilter) {
        setOrdenFilter(ordenInputValue);
        setOffset(0); // Reset to first page when filter changes
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [ordenInputValue]);

  const { data, isLoading } = useQuery<{ data: VerificationPayment[]; total: number }>({
    queryKey: [
      "/api/sales/verification-payments",
      startDate,
      endDate,
      selectedBanco,
      estadoFilter,
      ordenFilter,
      tipoPagoFilter,
      limit,
      offset,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedBanco && selectedBanco !== "all") params.append("bancoId", selectedBanco);
      if (estadoFilter && estadoFilter !== "all") params.append("estadoVerificacion", estadoFilter);
      if (ordenFilter) params.append("orden", ordenFilter);
      if (tipoPagoFilter && tipoPagoFilter !== "all") params.append("tipoPago", tipoPagoFilter);
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());

      const url = `/api/sales/verification-payments${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch verification payments");
      }
      return response.json();
    },
  });

  const payments = data?.data || [];
  const total = data?.total || 0;

  const { data: bancos = [] } = useQuery<Banco[]>({
    queryKey: ["/api/admin/bancos"],
  });

  const updateVerificationMutation = useMutation({
    mutationFn: async (data: {
      paymentId: string;
      paymentType: string;
      estadoVerificacion: string;
      notasVerificacion?: string;
    }) => {
      return apiRequest("PATCH", "/api/sales/verification", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/verification-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] }); // Also invalidate Lista de Ventas
      toast({
        title: "Verificación actualizada",
        description: "El estado de verificación ha sido actualizado exitosamente.",
      });
      setIsVerifyDialogOpen(false);
      setSelectedPayment(null);
      setVerificationNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la verificación",
        variant: "destructive",
      });
    },
  });

  const handleVerify = (payment: VerificationPayment) => {
    setSelectedPayment(payment);
    setVerificationNotes(payment.notasVerificacion || "");
    setIsVerifyDialogOpen(true);
  };

  const confirmVerification = (status: "Verificado" | "Rechazado") => {
    if (!selectedPayment) return;

    updateVerificationMutation.mutate({
      paymentId: selectedPayment.paymentId,
      paymentType: selectedPayment.paymentType,
      estadoVerificacion: status,
      notasVerificacion: verificationNotes || undefined,
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return `$${amount.toFixed(2)}`;
  };

  const getBancoName = (bancoId: string | null) => {
    if (!bancoId) return "-";
    const banco = bancos.find(b => b.id === bancoId);
    return banco?.banco || bancoId;
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedBanco("all");
    setEstadoFilter("all");
    setOrdenFilter("");
    setOrdenInputValue("");
    setTipoPagoFilter("all");
    setOffset(0);
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      if (selectedBanco && selectedBanco !== "all") queryParams.append("bancoId", selectedBanco);
      if (estadoFilter && estadoFilter !== "all") queryParams.append("estadoVerificacion", estadoFilter);
      if (ordenFilter) queryParams.append("orden", ordenFilter);
      if (tipoPagoFilter && tipoPagoFilter !== "all") queryParams.append("tipoPago", tipoPagoFilter);

      const url = `/api/sales/verification-payments/export${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al exportar");
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `verificacion_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Exportación exitosa",
        description: "Los datos de verificación han sido exportados.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar los datos.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Verificación</h1>

            <Tabs defaultValue="ingresos" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="ingresos" data-testid="tab-ingresos">
            Ingresos
          </TabsTrigger>
          <TabsTrigger value="egresos" data-testid="tab-egresos">
            Egresos
          </TabsTrigger>
          <TabsTrigger value="cashea" data-testid="tab-cashea">Conciliación</TabsTrigger>
        </TabsList>

        <TabsContent value="ingresos">
          <div className="bg-card rounded-lg border border-border">
          {/* Filter Toolbar */}
          <div className="p-4 border-b border-border">
            <div className="flex justify-end items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFiltersVisible(!filtersVisible)}
                data-testid="toggle-filters-button"
                className="text-muted-foreground"
              >
                <Filter className="h-4 w-4 mr-2" />
                {filtersVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleResetFilters}
                data-testid="reset-filters-button"
                className="text-muted-foreground"
                title="Limpiar filtros"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleExport}
                data-testid="export-button"
                className="text-muted-foreground"
                title="Exportar"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {filtersVisible && (
            <div className="p-6 border-b border-border">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Banco:</label>
                  <Select value={selectedBanco} onValueChange={setSelectedBanco}>
                    <SelectTrigger className="w-40" data-testid="select-banco">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {bancos.map((banco) => (
                        <SelectItem key={banco.id} value={banco.id}>
                          {banco.banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Tipo de Pago:</label>
                  <Select value={tipoPagoFilter} onValueChange={setTipoPagoFilter}>
                    <SelectTrigger className="w-40" data-testid="select-tipo-pago">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Inicial/Total">Inicial/Total</SelectItem>
                      <SelectItem value="Flete">Flete</SelectItem>
                      <SelectItem value="Cuota">Cuota</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Estado:</label>
                  <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                    <SelectTrigger className="w-40" data-testid="select-estado">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Verificado">Verificado</SelectItem>
                      <SelectItem value="Por verificar">Por verificar</SelectItem>
                      <SelectItem value="Rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Orden:</label>
                  <Input
                    placeholder="Buscar orden..."
                    value={ordenInputValue}
                    onChange={(e) => setOrdenInputValue(e.target.value)}
                    className="w-40"
                    data-testid="input-orden"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Fecha Inicio:</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-40 justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                        data-testid="input-start-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? (() => {
                          const [year, month, day] = startDate.split('-');
                          return `${day}/${month}/${year}`;
                        })() : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? (() => {
                          const [year, month, day] = startDate.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        })() : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setStartDate(formatLocalDate(date));
                          } else {
                            setStartDate('');
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Fecha Fin:</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-40 justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                        data-testid="input-end-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? (() => {
                          const [year, month, day] = endDate.split('-');
                          return `${day}/${month}/${year}`;
                        })() : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? (() => {
                          const [year, month, day] = endDate.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        })() : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setEndDate(formatLocalDate(date));
                          } else {
                            setEndDate('');
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Payments Table */}
          <div className="flex-1 overflow-auto relative max-h-[calc(100vh-280px)]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="border-b border-border">
                  <th className="p-2 text-left text-xs font-light text-muted-foreground min-w-[120px] sticky left-0 bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    Orden
                  </th>
                  <th className="p-2 text-left text-xs font-light text-muted-foreground min-w-[180px] sticky left-[120px] bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    Nombre
                  </th>
                  <th className="p-2 text-left text-xs font-light text-muted-foreground min-w-[120px]">
                    Canal
                  </th>
                  <th className="p-2 text-left text-xs font-light text-muted-foreground min-w-[140px]">
                    Pago
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[130px]">
                    Fecha de Pago
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[110px]">
                    Monto Bs
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[110px]">
                    Monto USD
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[120px]">
                    Referencia
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[150px]">
                    Banco
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[120px]">
                    Estado
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[150px]">
                    Notas
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[100px]">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-muted-foreground">
                      Cargando...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-muted-foreground">
                      No hay pagos para verificar
                    </td>
                  </tr>
                ) : (
                  payments.map((payment, index) => (
                    <tr
                      key={`${payment.paymentId}-${payment.paymentType}-${index}`}
                      className="border-b border-border hover:bg-muted/50 text-xs"
                    >
                      <td className="p-2 text-xs font-mono text-muted-foreground sticky left-0 bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]" data-testid={`text-orden-${index}`}>
                        {payment.orden}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground sticky left-[120px] bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]" data-testid={`text-nombre-${index}`}>
                        {payment.nombre || "-"}
                      </td>
                      <td className="p-2 text-xs" data-testid={`badge-canal-${index}`}>
                        {payment.canal ? (
                          <Badge className={`${getChannelBadgeClass(payment.canal)} text-white text-xs`}>
                            {payment.canal.charAt(0).toUpperCase() + payment.canal.slice(1)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2 text-xs font-mono text-muted-foreground" data-testid={`text-tipo-pago-${index}`}>
                        {payment.tipoPago}
                      </td>
                      <td className="p-2 text-xs" data-testid={`text-fecha-pago-${index}`}>
                        {formatDisplayDate(payment.fecha)}
                      </td>
                      <td className="p-2 text-xs" data-testid={`text-monto-bs-${index}`}>
                        {payment.montoBs ? `Bs ${payment.montoBs.toFixed(2)}` : "-"}
                      </td>
                      <td className="p-2 text-xs" data-testid={`text-monto-usd-${index}`}>
                        {formatCurrency(payment.montoUsd)}
                      </td>
                      <td className="p-2 text-xs" data-testid={`text-referencia-${index}`}>
                        {payment.referencia || "-"}
                      </td>
                      <td className="p-2 text-xs" data-testid={`text-banco-${index}`}>
                        {getBancoName(payment.bancoId)}
                      </td>
                      <td className="p-2 text-xs" data-testid={`badge-estado-${index}`}>
                        {payment.estadoVerificacion === "Rechazado" ? (
                          <Badge variant="destructive">
                            {payment.estadoVerificacion}
                          </Badge>
                        ) : (
                          <Badge 
                            className={cn(
                              payment.estadoVerificacion === "Por verificar" && "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900",
                              payment.estadoVerificacion === "Verificado" && "bg-gray-500 text-white dark:bg-gray-600 dark:text-white hover:bg-gray-500 dark:hover:bg-gray-600"
                            )}
                          >
                            {payment.estadoVerificacion}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 text-xs max-w-[200px] truncate" data-testid={`text-notas-${index}`}>
                        {payment.notasVerificacion || "-"}
                      </td>
                      <td className="p-2 text-xs">
                        <Button
                          size="sm"
                          onClick={() => handleVerify(payment)}
                          data-testid={`button-verificar-${index}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Verificar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {total > 0 && (
            <div className="p-4 border-t border-border flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {offset + 1}-{Math.min(offset + limit, total)} de {total} pagos
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  data-testid="pagination-previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  data-testid="pagination-next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          </div>
        </TabsContent>

        <TabsContent value="egresos">
          <VerificacionEgresosTab />
        </TabsContent>

        <TabsContent value="cashea">
          <VerificacionPagosCasheaTab />
        </TabsContent>
      </Tabs>

      {/* Verification Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificar Pago</DialogTitle>
            <DialogDescription>
              Orden: {selectedPayment?.orden} - {selectedPayment?.tipoPago}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Notas de Verificación (opcional)
              </label>
              <Textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Agregar notas sobre la verificación..."
                rows={3}
                data-testid="textarea-notas"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsVerifyDialogOpen(false)}
              data-testid="button-cancelar"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmVerification("Rechazado")}
              disabled={updateVerificationMutation.isPending}
              data-testid="button-rechazar"
            >
              <X className="h-4 w-4 mr-1" />
              Rechazar
            </Button>
            <Button
              onClick={() => confirmVerification("Verificado")}
              disabled={updateVerificationMutation.isPending}
              data-testid="button-confirmar-verificado"
            >
              <Check className="h-4 w-4 mr-1" />
              Verificado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </div>
        </div>
      </main>
    </div>
  );
}
