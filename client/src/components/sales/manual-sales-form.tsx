import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Save, User, CreditCard, MapPin, Package } from "lucide-react";
import { insertSaleSchema } from "@shared/schema";

const manualSaleSchema = insertSaleSchema.extend({
  cantidad: z.number().min(1),
  totalUsd: z.string().min(1, "Total USD es requerido"),
  fecha: z.string().min(1, "Fecha es requerida"),
  metodoPagoId: z.string().optional(),
  bancoId: z.string().optional(),
  montoUsd: z.string().optional(),
  montoBs: z.string().optional(),
  direccionDespachoIgualFacturacion: z.boolean().default(true),
  // Make address fields required for manual entry
  direccionFacturacionPais: z.string().min(1, "País es requerido"),
  direccionFacturacionEstado: z.string().min(1, "Estado es requerido"),
  direccionFacturacionCiudad: z.string().min(1, "Ciudad es requerida"),
  direccionFacturacionDireccion: z.string().min(1, "Dirección es requerida"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  orden: true, // Will be auto-generated
  canal: true, // Will be set to "manual"
  estado: true, // Will be set to default
  estadoEntrega: true, // Will be set to "pendiente"
  estadoPagoInicial: true, // Will be set to default
  sucursal: true,
  tienda: true,
  factura: true,
  pagoInicialUsd: true,
});

type ManualSaleFormData = z.infer<typeof manualSaleSchema>;

interface ManualSalesFormProps {
  onSubmit: (data: ManualSaleFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ManualSalesForm({ onSubmit, onCancel, isSubmitting = false }: ManualSalesFormProps) {
  const form = useForm<ManualSaleFormData>({
    resolver: zodResolver(manualSaleSchema),
    defaultValues: {
      nombre: "",
      cedula: "",
      telefono: "",
      email: "",
      totalUsd: "",
      fecha: new Date().toISOString().split('T')[0],
      product: "",
      cantidad: 1,
      referencia: "",
      montoUsd: "",
      montoBs: "",
      direccionFacturacionPais: "Venezuela",
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

  const handleSubmit = (data: ManualSaleFormData) => {
    onSubmit(data);
  };

  return (
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
                      {products.map((producto: any) => (
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
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metodoPagoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map((method: any) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.nombre}
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
                      {banks.map((bank: any) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.banco}
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
                  <FormLabel>Monto en Bs (Opcional)</FormLabel>
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
                  <FormLabel>Monto en USD (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Dirección de Facturación
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="direccionFacturacionPais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País *</FormLabel>
                  <FormControl>
                    <Input placeholder="Venezuela" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="direccionFacturacionEstado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado *</FormLabel>
                  <FormControl>
                    <Input placeholder="Distrito Capital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="direccionFacturacionCiudad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad *</FormLabel>
                  <FormControl>
                    <Input placeholder="Caracas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="direccionFacturacionDireccion"
              render={({ field }) => (
                <FormItem className="md:col-span-2 lg:col-span-3">
                  <FormLabel>Dirección *</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle, número, apartamento, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="direccionFacturacionUrbanizacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urbanización</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la urbanización" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="direccionFacturacionReferencia"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Referencia</FormLabel>
                  <FormControl>
                    <Input placeholder="Punto de referencia cercano" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Dirección de Despacho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="direccionDespachoIgualFacturacion"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      La dirección de despacho es igual a la de facturación
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {!watchDespachoIgual && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                <FormField
                  control={form.control}
                  name="direccionDespachoPais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input placeholder="Venezuela" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="direccionDespachoEstado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="Distrito Capital" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="direccionDespachoCiudad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input placeholder="Caracas" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="direccionDespachoDireccion"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input placeholder="Calle, número, apartamento, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="direccionDespachoUrbanizacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urbanización</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la urbanización" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="direccionDespachoReferencia"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Referencia</FormLabel>
                      <FormControl>
                        <Input placeholder="Punto de referencia cercano" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="submit-manual-sale">
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Guardando..." : "Guardar Venta"}
          </Button>
        </div>
      </form>
    </Form>
  );
}