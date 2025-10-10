import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sale, PaymentInstallment, Banco } from "@shared/schema";

// Interface for installments API response
interface InstallmentsResponse {
  installments: PaymentInstallment[];
  summary: {
    totalUsd: number;
    pagoInicialUsd: number;
    totalCuotas: number;
    totalPagado: number;
    saldoPendiente: number;
  };
}

interface PaymentInstallmentsModalProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const installmentFormSchema = z.object({
  fecha: z.date().optional(),
  cuotaAmount: z.string().min(1, "Monto es requerido").refine((val) => parseFloat(val) > 0, "El monto debe ser mayor a 0"),
  cuotaAmountBs: z.string().optional(),
  pagoCuotaUsd: z.string().optional(),
  bancoId: z.string().optional(),
  referencia: z.string().optional(),
});

type InstallmentFormData = z.infer<typeof installmentFormSchema>;

export default function PaymentInstallmentsModal({ sale, open, onOpenChange }: PaymentInstallmentsModalProps) {
  const { toast } = useToast();
  const [editingInstallment, setEditingInstallment] = useState<PaymentInstallment | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentFormSchema),
    defaultValues: {
      fecha: undefined,
      cuotaAmount: "",
      cuotaAmountBs: "",
      pagoCuotaUsd: "",
      bancoId: "",
      referencia: "",
    },
  });

  // Reset form when modal opens/closes or sale changes
  useEffect(() => {
    if (open && sale) {
      form.reset();
      setEditingInstallment(null);
      setShowForm(false);
    }
  }, [open, sale, form]);

  // Fetch installments and summary
  const { data: installmentsData, isLoading } = useQuery<InstallmentsResponse>({
    queryKey: [`/api/sales/${sale?.id}/installments`],
    enabled: !!sale?.id && open,
  });

  // Fetch banks for the dropdown
  const { data: allBanks = [] } = useQuery<Banco[]>({
    queryKey: ["/api/admin/bancos"],
  });
  
  // Filter to show only Receptor banks (for incoming payments)
  const banks = allBanks.filter(bank => bank.tipo === "Receptor");

  const installments = installmentsData?.installments || [];
  const summary = installmentsData?.summary || {
    totalUsd: 0,
    pagoInicialUsd: 0,
    totalCuotas: 0,
    totalPagado: 0,
    saldoPendiente: 0,
  };

  // Create installment mutation
  const createInstallmentMutation = useMutation({
    mutationFn: async (data: InstallmentFormData) => {
      if (!sale?.id) throw new Error("Sale ID is required");
      
      const payload = {
        fecha: data.fecha?.toISOString(),
        cuotaAmount: data.cuotaAmount,
        cuotaAmountBs: data.cuotaAmountBs || null,
        pagoCuotaUsd: data.pagoCuotaUsd || null,
        bancoId: data.bancoId || null,
        referencia: data.referencia || null,
      };

      return apiRequest("POST", `/api/sales/${sale.id}/installments`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sales/${sale?.id}/installments`] });
      toast({ title: "Cuota creada exitosamente" });
      form.reset();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear cuota",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  // Update installment mutation
  const updateInstallmentMutation = useMutation({
    mutationFn: async (data: InstallmentFormData & { id: string }) => {
      const payload = {
        fecha: data.fecha?.toISOString(),
        cuotaAmount: data.cuotaAmount,
        cuotaAmountBs: data.cuotaAmountBs || null,
        pagoCuotaUsd: data.pagoCuotaUsd || null,
        bancoId: data.bancoId || null,
        referencia: data.referencia || null,
      };

      return apiRequest("PATCH", `/api/installments/${data.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sales/${sale?.id}/installments`] });
      toast({ title: "Cuota actualizada exitosamente" });
      form.reset();
      setEditingInstallment(null);
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar cuota",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  // Delete installment mutation
  const deleteInstallmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/installments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sales/${sale?.id}/installments`] });
      toast({ title: "Cuota eliminada exitosamente" });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar cuota",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const handleAddInstallment = () => {
    form.reset();
    setEditingInstallment(null);
    setShowForm(true);
  };

  const handleEditInstallment = (installment: PaymentInstallment) => {
    form.reset({
      fecha: installment.fecha ? new Date(installment.fecha) : undefined,
      cuotaAmount: installment.cuotaAmount || "",
      cuotaAmountBs: installment.cuotaAmountBs || "",
      pagoCuotaUsd: installment.pagoCuotaUsd || "",
      bancoId: installment.bancoId || "",
      referencia: installment.referencia || "",
    });
    setEditingInstallment(installment);
    setShowForm(true);
  };

  const handleSubmit = (data: InstallmentFormData) => {
    if (editingInstallment) {
      updateInstallmentMutation.mutate({ ...data, id: editingInstallment.id });
    } else {
      createInstallmentMutation.mutate(data);
    }
  };

  const handleDeleteInstallment = (id: string) => {
    if (confirm("¿Está seguro de que desea eliminar esta cuota?")) {
      deleteInstallmentMutation.mutate(id);
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cuotas de Pago - Orden {sale.orden || 'Sin número'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total USD</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                ${summary.totalUsd.toFixed(2)}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="text-xs font-medium text-green-600 dark:text-green-400">Pago Inicial/Total</div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                ${summary.pagoInicialUsd.toFixed(2)}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Total Cuotas</div>
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {summary.totalCuotas}
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <div className="text-xs font-medium text-orange-600 dark:text-orange-400">Total Pagado</div>
              <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                ${summary.totalPagado.toFixed(2)}
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <div className="text-xs font-medium text-red-600 dark:text-red-400">Pendiente</div>
              <div className="text-lg font-bold text-red-700 dark:text-red-300">
                ${summary.saldoPendiente.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Add Installment Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Cuotas de Pago</h3>
            <Button
              onClick={handleAddInstallment}
              disabled={createInstallmentMutation.isPending}
              data-testid="button-add-installment"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Cuota
            </Button>
          </div>

          {/* Installment Form */}
          {showForm && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="fecha"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha Pago Cuota</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="input-installment-fecha"
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Seleccionar fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pagoCuotaUsd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pago Cuota USD</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0.00"
                              type="number"
                              step="0.01"
                              min="0"
                              data-testid="input-pago-cuota-usd"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bancoId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Banco Receptor</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-installment-banco">
                                <SelectValue placeholder="Seleccionar banco" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {banks.map((banco: any) => (
                                <SelectItem key={banco.id} value={banco.id}>
                                  {banco.banco}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="referencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referencia</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Número de referencia"
                              data-testid="input-installment-referencia"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cuotaAmountBs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto Bs</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0.00"
                              type="number"
                              step="0.01"
                              min="0"
                              data-testid="input-installment-amount-bs"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cuotaAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto USD</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0.00"
                              type="number"
                              step="0.01"
                              min="0"
                              data-testid="input-installment-amount"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={createInstallmentMutation.isPending || updateInstallmentMutation.isPending}
                      data-testid="button-save-installment"
                    >
                      {editingInstallment ? "Actualizar" : "Crear"} Cuota
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      data-testid="button-cancel-installment"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {/* Installments Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuota #</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Pago Cuota USD</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Monto Bs</TableHead>
                  <TableHead>Monto USD</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Cargando cuotas...
                    </TableCell>
                  </TableRow>
                ) : installments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No hay cuotas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  installments.map((installment: PaymentInstallment) => {
                    const banco = banks.find((b: any) => b.id === installment.bancoId);
                    return (
                      <TableRow key={installment.id}>
                        <TableCell>{installment.installmentNumber}</TableCell>
                        <TableCell>
                          {installment.fecha ? format(new Date(installment.fecha), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell data-testid={`pago-cuota-usd-${installment.id}`}>
                          {installment.pagoCuotaUsd ? `$${parseFloat(installment.pagoCuotaUsd).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>{banco?.banco || "-"}</TableCell>
                        <TableCell>{installment.referencia || "-"}</TableCell>
                        <TableCell>
                          {installment.cuotaAmountBs ? `Bs ${parseFloat(installment.cuotaAmountBs).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>${parseFloat(installment.cuotaAmount || "0").toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditInstallment(installment)}
                              data-testid={`button-edit-${installment.id}`}
                              className="h-8 w-8 p-0"
                              title="Editar"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteInstallment(installment.id)}
                              disabled={deleteInstallmentMutation.isPending}
                              data-testid={`button-delete-${installment.id}`}
                              className="h-8 w-8 p-0"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3 w-3" />
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
      </DialogContent>
    </Dialog>
  );
}