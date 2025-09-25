import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";

// Helper function to safely parse YYYY-MM-DD as local date
const parseLocalDate = (dateString: string) => {
  if (!dateString) return undefined;
  return parse(dateString, 'yyyy-MM-dd', new Date());
};
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Save, User, CreditCard, MapPin, Package, X, CalendarIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";

const editSaleSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  cedula: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  totalUsd: z.string().min(1, "Total USD es requerido"),
  fecha: z.string().min(1, "Fecha es requerida"),
  product: z.string().min(1, "Producto es requerido"),
  sku: z.string().optional(),
  cantidad: z.number().min(1),
  metodoPagoId: z.string().optional(),
  bancoId: z.string().optional(),
  referencia: z.string().optional(),
  montoUsd: z.string().optional(),
  montoBs: z.string().optional(),
  pagoInicialUsd: z.string().optional(),
  direccionFacturacionPais: z.string().optional(),
  direccionFacturacionEstado: z.string().optional(),
  direccionFacturacionCiudad: z.string().optional(),
  direccionFacturacionDireccion: z.string().optional(),
  direccionFacturacionUrbanizacion: z.string().optional(),
  direccionFacturacionReferencia: z.string().optional(),
  direccionDespachoIgualFacturacion: z.boolean().default(true),
  direccionDespachoPais: z.string().optional(),
  direccionDespachoEstado: z.string().optional(),
  direccionDespachoCiudad: z.string().optional(),
  direccionDespachoDireccion: z.string().optional(),
  direccionDespachoUrbanizacion: z.string().optional(),
  direccionDespachoReferencia: z.string().optional(),
});

type EditSaleFormData = z.infer<typeof editSaleSchema>;

interface EditSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}

export default function EditSaleModal({ open, onOpenChange, sale }: EditSaleModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<EditSaleFormData>({
    resolver: zodResolver(editSaleSchema),
    defaultValues: {
      nombre: "",
      cedula: "",
      telefono: "",
      email: "",
      totalUsd: "",
      fecha: "",
      product: "",
      sku: "",
      cantidad: 1,
      referencia: "",
      montoUsd: "",
      montoBs: "",
      pagoInicialUsd: "",
      direccionFacturacionPais: "",
      direccionFacturacionEstado: "",
      direccionFacturacionCiudad: "",
      direccionFacturacionDireccion: "",
      direccionFacturacionUrbanizacion: "",
      direccionFacturacionReferencia: "",
      direccionDespachoIgualFacturacion: true,
      direccionDespachoPais: "",
      direccionDespachoEstado: "",
      direccionDespachoCiudad: "",
      direccionDespachoDireccion: "",
      direccionDespachoUrbanizacion: "",
      direccionDespachoReferencia: "",
    },
  });

  const watchDespachoIgual = form.watch("direccionDespachoIgualFacturacion");

  // Get products, payment methods and banks for dropdowns
  const { data: products = [] } = useQuery({
    queryKey: ["/api/admin/productos"],
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["/api/admin/metodos-pago"],
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["/api/admin/bancos"],
  });

  // Initialize form when sale changes
  useEffect(() => {
    if (sale && open) {
      form.reset({
        nombre: sale.nombre || "",
        cedula: sale.cedula || "",
        telefono: sale.telefono || "",
        email: sale.email || "",
        totalUsd: sale.totalUsd?.toString() || "",
        fecha: sale.fecha ? new Date(sale.fecha).toISOString().split('T')[0] : "",
        product: sale.product || "",
        sku: sale.sku || "",
        cantidad: sale.cantidad || 1,
        metodoPagoId: sale.metodoPagoId || "",
        bancoId: sale.bancoId || "",
        referencia: sale.referencia || "",
        montoUsd: sale.montoUsd?.toString() || "",
        montoBs: sale.montoBs?.toString() || "",
        pagoInicialUsd: sale.pagoInicialUsd?.toString() || "",
        direccionFacturacionPais: sale.direccionFacturacionPais || "",
        direccionFacturacionEstado: sale.direccionFacturacionEstado || "",
        direccionFacturacionCiudad: sale.direccionFacturacionCiudad || "",
        direccionFacturacionDireccion: sale.direccionFacturacionDireccion || "",
        direccionFacturacionUrbanizacion: sale.direccionFacturacionUrbanizacion || "",
        direccionFacturacionReferencia: sale.direccionFacturacionReferencia || "",
        direccionDespachoIgualFacturacion: sale.direccionDespachoIgualFacturacion === "true",
        direccionDespachoPais: sale.direccionDespachoPais || "",
        direccionDespachoEstado: sale.direccionDespachoEstado || "",
        direccionDespachoCiudad: sale.direccionDespachoCiudad || "",
        direccionDespachoDireccion: sale.direccionDespachoDireccion || "",
        direccionDespachoUrbanizacion: sale.direccionDespachoUrbanizacion || "",
        direccionDespachoReferencia: sale.direccionDespachoReferencia || "",
      });
    }
  }, [sale, open, form]);

  const updateSaleMutation = useMutation({
    mutationFn: (data: EditSaleFormData) => {
      if (!sale) throw new Error("No sale to update");
      return apiRequest("PUT", `/api/sales/${sale.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Venta actualizada",
        description: "La venta ha sido actualizada exitosamente.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Failed to update sale:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la venta. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: EditSaleFormData) => {
    updateSaleMutation.mutate(data);
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Editar Venta - Orden #{sale.orden}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cedula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cédula</FormLabel>
                      <FormControl>
                        <Input placeholder="V-12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="0414-1234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="cliente@email.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Product and Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Información del Producto y Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="product"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producto *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(products as any[]).map((producto: any) => (
                            <SelectItem key={producto.id} value={producto.nombre}>
                              {producto.nombre}
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
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="Código SKU" {...field} data-testid="input-sku" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cantidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total USD *</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fecha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="input-fecha"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(parseLocalDate(field.value) || new Date(), "dd/MM/yyyy") : "Seleccionar fecha"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={parseLocalDate(field.value)}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(format(date, "yyyy-MM-dd"));
                              }
                            }}
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
                  name="bancoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar banco" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(banks as any[]).map((bank: any) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              {bank.banco}
                            </SelectItem>
                          ))}
                          <SelectItem value="otro">Otro($)</SelectItem>
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
                        <Input placeholder="Número de referencia" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="montoBs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto en Bs</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="montoUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto en USD</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pagoInicialUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pago Inicial USD</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                disabled={updateSaleMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateSaleMutation.isPending} 
                data-testid="update-sale"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSaleMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}