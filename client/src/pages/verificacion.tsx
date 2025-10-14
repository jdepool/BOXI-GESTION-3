import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Check, X, Filter, ChevronDown, ChevronUp, Download } from "lucide-react";
import { format } from "date-fns";
import Sidebar from "@/components/layout/sidebar";

interface VerificationPayment {
  paymentId: string;
  paymentType: string;
  orden: string;
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
  const [ordenFilter, setOrdenFilter] = useState("");
  const [tipoPagoFilter, setTipoPagoFilter] = useState("all");

  const { data, isLoading } = useQuery<{ data: VerificationPayment[] }>({
    queryKey: [
      "/api/sales/verification-payments",
      startDate,
      endDate,
      selectedBanco,
      ordenFilter,
      tipoPagoFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedBanco && selectedBanco !== "all") params.append("bancoId", selectedBanco);
      if (ordenFilter) params.append("orden", ordenFilter);
      if (tipoPagoFilter && tipoPagoFilter !== "all") params.append("tipoPago", tipoPagoFilter);

      const url = `/api/sales/verification-payments${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch verification payments");
      }
      return response.json();
    },
  });

  const payments = data?.data || [];

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Verificado":
        return "default"; // green
      case "Rechazado":
        return "destructive"; // red
      default:
        return "secondary"; // yellow/gray
    }
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

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      if (selectedBanco && selectedBanco !== "all") queryParams.append("bancoId", selectedBanco);
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
        </TabsList>

        <TabsContent value="ingresos">
          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
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
                onClick={handleExport}
                data-testid="export-button"
                className="text-muted-foreground"
                title="Exportar"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {filtersVisible && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Banco:</label>
                  <Select value={selectedBanco} onValueChange={setSelectedBanco}>
                    <SelectTrigger data-testid="select-banco">
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
                    <SelectTrigger data-testid="select-tipo-pago">
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
                  <label className="text-sm font-medium mb-1 block">Orden:</label>
                  <Input
                    placeholder="Buscar orden..."
                    value={ordenFilter}
                    onChange={(e) => setOrdenFilter(e.target.value)}
                    data-testid="input-orden"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Fecha Inicio:</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Fecha Fin:</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payments Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Orden
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pago
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha de Pago
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Monto Bs
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Monto USD
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Referencia
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Banco
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Notas
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-4 text-center text-muted-foreground">
                      Cargando...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-4 text-center text-muted-foreground">
                      No hay pagos para verificar
                    </td>
                  </tr>
                ) : (
                  payments.map((payment, index) => (
                    <tr
                      key={`${payment.paymentId}-${payment.paymentType}-${index}`}
                      className="border-b border-border hover:bg-muted/50"
                    >
                      <td className="p-3 text-sm" data-testid={`text-orden-${index}`}>
                        {payment.orden}
                      </td>
                      <td className="p-3 text-sm" data-testid={`text-tipo-pago-${index}`}>
                        <Badge variant="outline">{payment.tipoPago}</Badge>
                      </td>
                      <td className="p-3 text-sm" data-testid={`text-fecha-pago-${index}`}>
                        {payment.fecha ? format(new Date(payment.fecha), "dd/MM/yyyy") : "-"}
                      </td>
                      <td className="p-3 text-sm" data-testid={`text-monto-bs-${index}`}>
                        {payment.montoBs ? `Bs ${payment.montoBs.toFixed(2)}` : "-"}
                      </td>
                      <td className="p-3 text-sm" data-testid={`text-monto-usd-${index}`}>
                        {formatCurrency(payment.montoUsd)}
                      </td>
                      <td className="p-3 text-sm" data-testid={`text-referencia-${index}`}>
                        {payment.referencia || "-"}
                      </td>
                      <td className="p-3 text-sm" data-testid={`text-banco-${index}`}>
                        {getBancoName(payment.bancoId)}
                      </td>
                      <td className="p-3 text-sm" data-testid={`badge-estado-${index}`}>
                        <Badge variant={getStatusBadgeVariant(payment.estadoVerificacion)}>
                          {payment.estadoVerificacion}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm max-w-[200px] truncate" data-testid={`text-notas-${index}`}>
                        {payment.notasVerificacion || "-"}
                      </td>
                      <td className="p-3">
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
        </TabsContent>

        <TabsContent value="egresos">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <p className="text-muted-foreground text-lg">
              La verificación de egresos estará disponible próximamente
            </p>
          </div>
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
