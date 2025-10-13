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
    totalOrderUsd: number;
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
  montoCuotaUsd: z.string().optional(), // Optional - Monto USD field
  montoCuotaBs: z.string().optional(),
  pagoCuotaUsd: z.string().optional(),
  bancoReceptorCuota: z.string().min(1, "Banco Receptor es requerido"), // Mandatory
  referencia: z.string().min(1, "Referencia es requerida"), // Mandatory
});

type InstallmentFormData = z.infer<typeof installmentFormSchema>;

export default function PaymentInstallmentsModal({ sale, open, onOpenChange }: PaymentInstallmentsModalProps) {
  const { toast } = useToast();
  const [editingInstallment, setEditingInstallment] = useState<PaymentInstallment | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentFormSchema),
    defaultValues: {
      fecha: new Date(),
      montoCuotaUsd: "",
      montoCuotaBs: "",
      pagoCuotaUsd: "",
      bancoReceptorCuota: "",
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

  // Create installment mutation
  const createInstallmentMutation = useMutation({
    mutationFn: async (data: InstallmentFormData) => {
      if (!sale?.id) throw new Error("Sale ID is required");
      
      const payload = {
        fecha: data.fecha?.toISOString(),
        cuotaAmount: data.montoCuotaUsd || null, // Map montoCuotaUsd to cuotaAmount (DB field)
        cuotaAmountBs: data.montoCuotaBs || null, // Map montoCuotaBs to cuotaAmountBs (DB field)
        pagoCuotaUsd: data.pagoCuotaUsd || null,
        bancoReceptorCuota: data.bancoReceptorCuota,
        referencia: data.referencia,
      };

      return apiRequest("POST", `/api/sales/${sale.id}/installments`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sales/${sale?.id}/installments`] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return Array.isArray(query.queryKey) && 
                 typeof query.queryKey[0] === 'string' && 
                 query.queryKey[0].startsWith('/api/sales');
        }
      });
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
        cuotaAmount: data.montoCuotaUsd || null, // Map montoCuotaUsd to cuotaAmount (DB field)
        cuotaAmountBs: data.montoCuotaBs || null, // Map montoCuotaBs to cuotaAmountBs (DB field)
        pagoCuotaUsd: data.pagoCuotaUsd || null,
        bancoReceptorCuota: data.bancoReceptorCuota,
        referencia: data.referencia,
      };

      return apiRequest("PATCH", `/api/installments/${data.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sales/${sale?.id}/installments`] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return Array.isArray(query.queryKey) && 
                 typeof query.queryKey[0] === 'string' && 
                 query.queryKey[0].startsWith('/api/sales');
        }
      });
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
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return Array.isArray(query.queryKey) && 
                 typeof query.queryKey[0] === 'string' && 
                 query.queryKey[0].startsWith('/api/sales');
        }
      });
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
      montoCuotaUsd: installment.cuotaAmount || "", // Map cuotaAmount to montoCuotaUsd
      montoCuotaBs: installment.cuotaAmountBs || "", // Map cuotaAmountBs to montoCuotaBs
      pagoCuotaUsd: installment.pagoCuotaUsd || "",
      bancoReceptorCuota: installment.bancoReceptorCuota || "",
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      name="bancoReceptorCuota"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Banco Receptor *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger id="bancoReceptorCuota" data-testid="select-installment-banco">
                                <SelectValue placeholder="Seleccionar banco receptor" />
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
                          <FormLabel>Referencia *</FormLabel>
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
                      name="montoCuotaBs"
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
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="montoCuotaUsd"
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
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
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
                    const banco = banks.find((b: any) => b.id === installment.bancoReceptorCuota);
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