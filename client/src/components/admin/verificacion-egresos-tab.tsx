import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";
import { format, parse } from "date-fns";

const parseLocalDate = (dateString: string) => {
  if (!dateString) return undefined;
  return parse(dateString, 'yyyy-MM-dd', new Date());
};

export function VerificacionEgresosTab() {
  const { toast } = useToast();
  const [selectedEgreso, setSelectedEgreso] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [verificacionData, setVerificacionData] = useState({
    estado_verificacion: "",
    notas_verificacion: "",
  });

  const { data: egresos = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/egresos", "pagado"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("estado", "Pagado");
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

  const verificarMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/egresos/${selectedEgreso.id}/verificar`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/egresos"] });
      toast({
        title: "Egreso verificado",
        description: `El egreso ha sido ${verificacionData.estado_verificacion} exitosamente`,
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo verificar el egreso",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedEgreso(null);
    setVerificacionData({
      estado_verificacion: "",
      notas_verificacion: "",
    });
  };

  const handleOpenDialog = (egreso: any) => {
    setSelectedEgreso(egreso);
    setIsDialogOpen(true);
  };

  const handleVerificar = (estado: string) => {
    const submitData = {
      accion: estado,
      notas: verificacionData.notas_verificacion,
    };

    verificarMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Egresos Pagados Pendientes de Verificación</CardTitle>
          <CardDescription>
            Revise y verifique los pagos de egresos registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {egresos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay egresos pendientes de verificación
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto Pagado</TableHead>
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
                    <TableRow key={egreso.id} data-testid={`egreso-verificar-${egreso.id}`}>
                      <TableCell>
                        {egreso.fechaPago ? format(new Date(egreso.fechaPago), "dd/MM/yyyy") : "N/A"}
                      </TableCell>
                      <TableCell>{tipoNombre || "N/A"}</TableCell>
                      <TableCell className="max-w-xs truncate">{egreso.descripcion}</TableCell>
                      <TableCell>
                        {egreso.montoPagadoUsd && (
                          <div className="text-green-600 dark:text-green-400">
                            ${parseFloat(egreso.montoPagadoUsd).toFixed(2)}
                          </div>
                        )}
                        {egreso.montoPagadoBs && (
                          <div className="text-blue-600 dark:text-blue-400">
                            Bs {parseFloat(egreso.montoPagadoBs).toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{bancoNombre || "N/A"}</TableCell>
                      <TableCell>{egreso.referenciaPago || "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleOpenDialog(egreso)}
                          data-testid={`verificar-egreso-${egreso.id}`}
                        >
                          Verificar
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
            <DialogTitle>Verificar Egreso</DialogTitle>
            <DialogDescription>
              Revise los detalles del pago y tome una decisión
            </DialogDescription>
          </DialogHeader>

          {selectedEgreso && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div><strong>Tipo:</strong> {tiposEgresos.find((t: any) => t.id === selectedEgreso.tipoEgresoId)?.nombre}</div>
                <div><strong>Descripción:</strong> {selectedEgreso.descripcion}</div>
                <div>
                  <strong>Monto Pagado:</strong>{" "}
                  {selectedEgreso.montoPagadoUsd && `$${parseFloat(selectedEgreso.montoPagadoUsd).toFixed(2)}`}
                  {selectedEgreso.montoPagadoUsd && selectedEgreso.montoPagadoBs && " | "}
                  {selectedEgreso.montoPagadoBs && `Bs ${parseFloat(selectedEgreso.montoPagadoBs).toFixed(2)}`}
                </div>
                <div><strong>Banco:</strong> {bancos.find((b: any) => b.id === selectedEgreso.bancoId)?.banco}</div>
                <div><strong>Referencia:</strong> {selectedEgreso.referenciaPago || "N/A"}</div>
                <div><strong>Factura:</strong> {selectedEgreso.numeroFacturaPagada || "N/A"}</div>
                <div><strong>Fecha de Pago:</strong> {selectedEgreso.fechaPago ? format(new Date(selectedEgreso.fechaPago), "dd/MM/yyyy") : "N/A"}</div>
              </div>

              <div>
                <Label htmlFor="notas_verificacion">Notas de Verificación (opcional)</Label>
                <Textarea
                  id="notas_verificacion"
                  placeholder="Comentarios sobre la verificación"
                  value={verificacionData.notas_verificacion}
                  onChange={(e) => setVerificacionData({ ...verificacionData, notas_verificacion: e.target.value })}
                  rows={3}
                  data-testid="input-notas-verificacion"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={verificarMutation.isPending}
              data-testid="button-cancelar-verificacion"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleVerificar("Rechazado")}
              disabled={verificarMutation.isPending}
              data-testid="button-rechazar-verificacion"
            >
              <X className="h-4 w-4 mr-1" />
              Rechazar
            </Button>
            <Button
              onClick={() => handleVerificar("Verificado")}
              disabled={verificarMutation.isPending}
              data-testid="button-confirmar-verificacion"
            >
              <Check className="h-4 w-4 mr-1" />
              Verificado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
