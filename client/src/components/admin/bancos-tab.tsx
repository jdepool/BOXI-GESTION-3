import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Banco</TableHead>
              <TableHead>Número de Cuenta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (bancos as Banco[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No hay bancos registrados
                </TableCell>
              </TableRow>
            ) : (
              (bancos as Banco[]).map((banco: Banco) => (
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}