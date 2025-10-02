import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Package, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertSaleSchema } from "@shared/schema";
import { z } from "zod";
import ProductDialog, { ProductFormData } from "./product-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ManualReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Form schema based on insertSaleSchema with proper numeric coercion
const manualReservaSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  cedula: z.string().optional(),
  telefono: z.string().min(1, "Teléfono es requerido"),
  email: z.string().email().optional().or(z.literal("")),
  totalUsd: z.coerce.number().min(0.01, "Total USD debe ser mayor a 0"),
  pagoInicialUsd: z.coerce.number().optional(),
  montoBs: z.coerce.number().optional(),
  referencia: z.string().optional(),
  bancoId: z.string().optional(),
  montoUsd: z.string().optional(),
  fechaEntrega: z.date({ required_error: "Fecha de entrega es requerida" }),
  direccionDespachoIgualFacturacion: z.boolean().default(true),
  direccionFacturacionPais: z.string().optional(),
  direccionFacturacionEstado: z.string().optional(),
  direccionFacturacionCiudad: z.string().optional(),
  direccionFacturacionDireccion: z.string().optional(),
  direccionFacturacionUrbanizacion: z.string().optional(),
  direccionDespachoPais: z.string().optional(),
  direccionDespachoEstado: z.string().optional(),
  direccionDespachoCiudad: z.string().optional(),
  direccionDespachoDireccion: z.string().optional(),
  direccionDespachoUrbanizacion: z.string().optional(),
  hasMedidaEspecial: z.boolean().default(false),
  medidaEspecial: z.string().max(10, "Máximo 10 caracteres").optional(),
}).refine(data => {
  // If hasMedidaEspecial is true, medidaEspecial must be provided and non-empty
  if (data.hasMedidaEspecial) {
    return data.medidaEspecial && data.medidaEspecial.trim().length > 0;
  }
  return true;
}, {
  message: "Debe especificar la medida cuando está marcada",
  path: ["medidaEspecial"],
});

type ManualReservaFormData = z.infer<typeof manualReservaSchema> & {
  products: ProductFormData[];
};

export default function ManualReservaModal({ isOpen, onClose, onSuccess }: ManualReservaModalProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductFormData[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);

  const form = useForm<ManualReservaFormData>({
    resolver: zodResolver(manualReservaSchema),
    defaultValues: {
      nombre: "",
      cedula: "",
      telefono: "",
      email: "",
      totalUsd: 0,
      pagoInicialUsd: 0,
      referencia: "",
      bancoId: "",
      montoBs: 0,
      montoUsd: "",
      direccionFacturacionPais: "",
      direccionFacturacionEstado: "",
      direccionFacturacionCiudad: "",
      direccionFacturacionDireccion: "",
      direccionFacturacionUrbanizacion: "",
      direccionDespachoIgualFacturacion: true,
      direccionDespachoPais: "",
      direccionDespachoEstado: "",
      direccionDespachoCiudad: "",
      direccionDespachoDireccion: "",
      direccionDespachoUrbanizacion: "",
      fechaEntrega: undefined,
      hasMedidaEspecial: false,
      medidaEspecial: "",
      products: [],
    },
  });

  const watchDespachoIgual = form.watch("direccionDespachoIgualFacturacion");
  const watchHasMedidaEspecial = form.watch("hasMedidaEspecial");

  const handleAddProduct = (product: ProductFormData) => {
    setProducts([...products, product]);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  // Fetch banks data
  const { data: banks = [] } = useQuery({
    queryKey: ["/api/admin/bancos"],
  });

  const createReservaMutation = useMutation({
    mutationFn: async (data: ManualReservaFormData) => {
      // Convert form data to proper API format
      const formattedData = {
        ...data,
        // Handle optional numeric fields
        pagoInicialUsd: data.pagoInicialUsd || undefined,
        montoBs: data.montoBs || undefined,
        // Convert fechaEntrega to ISO string if provided
        fechaEntrega: data.fechaEntrega?.toISOString() || undefined,
        // Ensure empty string fields are converted to null for API
        cedula: data.cedula || null,
        telefono: data.telefono || null,
        email: data.email || null,
        referencia: data.referencia || null,
        bancoId: data.bancoId || null,
        montoUsd: data.montoUsd || null,
        direccionFacturacionPais: data.direccionFacturacionPais || null,
        direccionFacturacionEstado: data.direccionFacturacionEstado || null,
        direccionFacturacionCiudad: data.direccionFacturacionCiudad || null,
        direccionFacturacionDireccion: data.direccionFacturacionDireccion || null,
        direccionFacturacionUrbanizacion: data.direccionFacturacionUrbanizacion || null,
        // If direccionDespachoIgualFacturacion is true, copy billing address to shipping
        direccionDespachoPais: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionPais : (data.direccionDespachoPais || null),
        direccionDespachoEstado: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionEstado : (data.direccionDespachoEstado || null),
        direccionDespachoCiudad: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionCiudad : (data.direccionDespachoCiudad || null),
        direccionDespachoDireccion: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionDireccion : (data.direccionDespachoDireccion || null),
        direccionDespachoUrbanizacion: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionUrbanizacion : (data.direccionDespachoUrbanizacion || null),
        // Handle medida especial
        medidaEspecial: data.hasMedidaEspecial && data.medidaEspecial ? data.medidaEspecial : null,
      };
      return apiRequest("POST", "/api/sales/manual", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Reserva creada",
        description: "La reserva manual ha sido creada exitosamente.",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Failed to create reserva:', error);
      toast({
        title: "Error",
        description: error?.message || "No se pudo crear la reserva.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ManualReservaFormData) => {
    createReservaMutation.mutate({ ...data, products });
  };

  const handleClose = () => {
    form.reset();
    setProducts([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="manual-reserva-modal">
        <DialogHeader>
          <DialogTitle>Nueva Reserva Manual</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Cliente *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-nombre" required />
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
                        <Input {...field} value={field.value || ""} data-testid="input-cedula" />
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
                        <Input {...field} value={field.value || ""} data-testid="input-telefono" />
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
                        <Input {...field} value={field.value || ""} type="email" data-testid="input-email" />
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
                              data-testid="input-fecha-entrega"
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
              </div>
            </div>

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
                    data-testid="button-add-product-reserva"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                        <TableHead className="w-[100px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product, index) => (
                        <TableRow key={index} data-testid={`product-row-reserva-${index}`}>
                          <TableCell>{product.producto}</TableCell>
                          <TableCell>{product.sku || "N/A"}</TableCell>
                          <TableCell>{product.cantidad}</TableCell>
                          <TableCell>${product.totalUsd.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveProduct(index)}
                              data-testid={`button-remove-product-reserva-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información de Pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pagoInicialUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pago Inicial USD</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          min="0"
                          data-testid="input-pago-inicial" 
                        />
                      </FormControl>
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
                        <Input {...field} value={field.value || ""} data-testid="input-referencia" />
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
                      <FormLabel>Banco</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-banco">
                            <SelectValue placeholder="Seleccionar banco" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="otro">Otro ($)</SelectItem>
                          {(banks as any[]).map((bank: any) => (
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
                  name="montoBs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto Bs</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          min="0"
                          data-testid="input-monto-bs" 
                        />
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
                        <Input placeholder="0.00" {...field} data-testid="input-monto-usd" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dirección de Facturación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="direccionFacturacionPais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-facturacion-pais" />
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
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-facturacion-estado" />
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
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-facturacion-ciudad" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="direccionFacturacionDireccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-facturacion-direccion" />
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
                        <Input {...field} value={field.value || ""} data-testid="input-facturacion-urbanizacion" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <h3 className="text-lg font-semibold">Dirección de Despacho</h3>
              <FormField
                control={form.control}
                name="direccionDespachoIgualFacturacion"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-same-address"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <FormField
                  control={form.control}
                  name="direccionDespachoPais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-despacho-pais" />
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
                        <Input {...field} value={field.value || ""} data-testid="input-despacho-estado" />
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
                        <Input {...field} value={field.value || ""} data-testid="input-despacho-ciudad" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="direccionDespachoDireccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-despacho-direccion" />
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
                        <Input {...field} value={field.value || ""} data-testid="input-despacho-urbanizacion" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}
            </div>

            {/* Medida Especial */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Medida Especial
              </h3>
              <FormField
                control={form.control}
                name="hasMedidaEspecial"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-medida-especial"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Esta venta requiere medida especial
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {watchHasMedidaEspecial && (
                <FormField
                  control={form.control}
                  name="medidaEspecial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especificar Medida</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ingrese medida (máx. 10 caracteres)" 
                          maxLength={10}
                          {...field}
                          value={field.value || ""}
                          data-testid="input-medida-especial"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createReservaMutation.isPending || products.length === 0}
                data-testid="button-create-reserva"
              >
                {createReservaMutation.isPending ? "Creando..." : "Crear Reserva"}
              </Button>
            </div>
          </form>
        </Form>

        <ProductDialog
          isOpen={isProductDialogOpen}
          onClose={() => setIsProductDialogOpen(false)}
          onAdd={handleAddProduct}
        />
      </DialogContent>
    </Dialog>
  );
}