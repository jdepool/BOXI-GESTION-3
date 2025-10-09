import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";

// Helper function to safely parse YYYY-MM-DD as local date
const parseLocalDate = (dateString: string) => {
  if (!dateString) return undefined;
  return parse(dateString, 'yyyy-MM-dd', new Date());
};
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Save, User, CreditCard, MapPin, Package, CalendarIcon, Plus, Trash2 } from "lucide-react";
import { insertSaleSchema } from "@shared/schema";
import ProductDialog, { ProductFormData } from "./product-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const manualSaleSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  cedula: z.string().min(1, "Cédula es requerida").regex(/^\d{6,8}$/, "La cédula debe tener entre 6 y 8 dígitos"),
  telefono: z.string().min(1, "Teléfono es requerido").regex(/^\d+$/, "El teléfono debe contener solo números"),
  email: z.string().email("Email inválido").optional(),
  totalUsd: z.string().min(1, "Total USD es requerido"),
  fecha: z.string().min(1, "Fecha es requerida"),
  fechaEntrega: z.date({ required_error: "Fecha de entrega es requerida" }),
  metodoPagoId: z.string().optional(),
  bancoId: z.string().optional(),
  montoUsd: z.string().optional(),
  montoBs: z.string().optional(),
  referencia: z.string().optional(),
  direccionDespachoIgualFacturacion: z.boolean().default(true),
  direccionFacturacionPais: z.string().min(1, "País es requerido"),
  direccionFacturacionEstado: z.string().min(1, "Estado es requerido"),
  direccionFacturacionCiudad: z.string().min(1, "Ciudad es requerida"),
  direccionFacturacionDireccion: z.string().min(1, "Dirección es requerida"),
  direccionFacturacionUrbanizacion: z.string().optional(),
  direccionFacturacionReferencia: z.string().optional(),
  direccionDespachoPais: z.string().optional(),
  direccionDespachoEstado: z.string().optional(),
  direccionDespachoCiudad: z.string().optional(),
  direccionDespachoDireccion: z.string().optional(),
  direccionDespachoUrbanizacion: z.string().optional(),
  direccionDespachoReferencia: z.string().optional(),
  canal: z.string().optional(),
  asesorId: z.string().optional(),
});

type ManualSaleFormData = z.infer<typeof manualSaleSchema> & {
  products: ProductFormData[];
};

interface ManualSalesFormProps {
  onSubmit: (data: ManualSaleFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ManualSalesForm({ onSubmit, onCancel, isSubmitting = false }: ManualSalesFormProps) {
  const [products, setProducts] = useState<ProductFormData[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);

  const form = useForm<ManualSaleFormData>({
    resolver: zodResolver(manualSaleSchema),
    defaultValues: {
      nombre: "",
      cedula: "",
      telefono: "",
      email: "",
      totalUsd: "",
      fecha: new Date().toISOString().split('T')[0],
      fechaEntrega: undefined,
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
      canal: "Manual",
      products: [],
    },
  });

  const watchDespachoIgual = form.watch("direccionDespachoIgualFacturacion");

  const handleAddProduct = (product: ProductFormData) => {
    setProducts([...products, product]);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  // Get products, payment methods and banks for dropdowns
  const { data: productosList = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/productos"],
  });

  const { data: banks = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/bancos"],
  });

  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: string }>>({
    queryKey: ["/api/admin/canales"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSubmit = (data: ManualSaleFormData) => {
    onSubmit({ ...data, products });
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
                    <Input 
                      placeholder="Nombre y Apellido" 
                      {...field} 
                      ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                      autoComplete="off" 
                      onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                      onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                    />
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
                  <FormLabel>Cédula *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="12345678" 
                      {...field} 
                      ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                      autoComplete="off" 
                      onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                      onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                    />
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
                  <FormLabel>Teléfono *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="04141234567" 
                      {...field} 
                      ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                      autoComplete="nope-phone" 
                      onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                      onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                    />
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
                    <Input 
                      placeholder="cliente@email.com" 
                      type="email" 
                      {...field} 
                      ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                      autoComplete="off" 
                      onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                      onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fechaEntrega"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Entrega *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="input-fecha-entrega-venta"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd/MM/yyyy") : "Seleccionar fecha"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0) - 24*60*60*1000)}
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
              name="canal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-canal">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar canal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {canales
                        .filter(canal => canal.activo === "true")
                        .map((canal) => (
                          <SelectItem key={canal.id} value={canal.nombre}>
                            {canal.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Products List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Productos
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProductDialogOpen(true)}
                data-testid="button-add-product"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay productos agregados. Haz clic en "Agregar Producto" para comenzar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Total US$</TableHead>
                    <TableHead>Medida Especial</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => (
                    <TableRow key={index} data-testid={`product-row-${index}`}>
                      <TableCell>{product.producto}</TableCell>
                      <TableCell>{product.sku || "N/A"}</TableCell>
                      <TableCell>{product.cantidad}</TableCell>
                      <TableCell>${product.totalUsd.toFixed(2)}</TableCell>
                      <TableCell>{product.medidaEspecial || "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(index)}
                          data-testid={`button-remove-product-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            <FormField
              control={form.control}
              name="totalUsd"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Total Orden USD *</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} data-testid="input-total-usd" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Información de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      {banks.map((bank: any) => (
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
                    <Input 
                      placeholder="Venezuela" 
                      {...field} 
                      ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                      autoComplete="nope-country-billing" 
                      onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                      onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                    />
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
                    <Input 
                      placeholder="Distrito Capital" 
                      {...field} 
                      ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                      autoComplete="nope-state-billing" 
                      onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                      onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                    />
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
                    <Input 
                      placeholder="Caracas" 
                      {...field} 
                      ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                      autoComplete="nope-city-billing" 
                      onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                      onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                    />
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
                    <Input 
                      placeholder="Calle, número, apartamento, etc." 
                      {...field} 
                      ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                      autoComplete="nope-address-billing" 
                      onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                      onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                    />
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
                    <Input 
                      placeholder="Nombre de la urbanización" 
                      {...field} 
                      ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                      autoComplete="nope-neighborhood-billing" 
                      onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                      onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                    />
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
                    <Input 
                      placeholder="Punto de referencia cercano" 
                      {...field} 
                      ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                      autoComplete="nope-reference-billing" 
                      onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                      onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                    />
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
                        <Input 
                          placeholder="Venezuela" 
                          {...field} 
                          ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                          autoComplete="nope-country-shipping" 
                          onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                          onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                        />
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
                        <Input 
                          placeholder="Distrito Capital" 
                          {...field} 
                          ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                          autoComplete="nope-state-shipping" 
                          onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                          onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                        />
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
                        <Input 
                          placeholder="Caracas" 
                          {...field} 
                          ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                          autoComplete="nope-city-shipping" 
                          onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                          onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                        />
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
                        <Input 
                          placeholder="Calle, número, apartamento, etc." 
                          {...field} 
                          ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                          autoComplete="nope-address-shipping" 
                          onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                          onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                        />
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
                        <Input 
                          placeholder="Nombre de la urbanización" 
                          {...field} 
                          ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                          autoComplete="nope-neighborhood-shipping" 
                          onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                          onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                        />
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
                        <Input 
                          placeholder="Punto de referencia cercano" 
                          {...field} 
                          ref={(el) => { field.ref(el); el?.setAttribute('readonly', 'true'); }}
                          autoComplete="nope-reference-shipping" 
                          onFocus={(e) => { e.target.removeAttribute('readonly'); }}
                          onBlur={(e) => { e.target.setAttribute('readonly', 'true'); }}
                        />
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
          <Button 
            type="submit" 
            disabled={isSubmitting || products.length === 0} 
            data-testid="submit-manual-sale"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Guardando..." : "Guardar Venta"}
          </Button>
        </div>
      </form>
      <ProductDialog
        isOpen={isProductDialogOpen}
        onClose={() => setIsProductDialogOpen(false)}
        onAdd={handleAddProduct}
      />
    </Form>
  );
}