import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { filterCanalesByProductLine, type ProductLine } from "@/lib/canalFilters";

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
import { Save, User, MapPin, Package, CalendarIcon, Plus, Trash2, Pencil } from "lucide-react";
import { insertSaleSchema, type Prospecto } from "@shared/schema";
import ProductDialog, { ProductFormData } from "./product-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const manualSaleSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  cedula: z.string().min(1, "Cédula es requerida").regex(/^[A-Za-z0-9]{6,10}$/, "La cédula debe tener entre 6 y 10 caracteres alfanuméricos"),
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
  direccionDespachoPais: z.string().min(1, "País de despacho es requerido"),
  direccionDespachoEstado: z.string().min(1, "Estado de despacho es requerido"),
  direccionDespachoCiudad: z.string().min(1, "Ciudad de despacho es requerida"),
  direccionDespachoDireccion: z.string().min(1, "Dirección de despacho es requerida"),
  direccionDespachoUrbanizacion: z.string().optional(),
  direccionDespachoReferencia: z.string().optional(),
  direccionFacturacionPais: z.string().optional(),
  direccionFacturacionEstado: z.string().optional(),
  direccionFacturacionCiudad: z.string().optional(),
  direccionFacturacionDireccion: z.string().optional(),
  direccionFacturacionUrbanizacion: z.string().optional(),
  direccionFacturacionReferencia: z.string().optional(),
  canal: z.string().min(1, "Canal es requerido"),
  asesorId: z.string().min(1, "Asesor es requerido"),
});

type ManualSaleFormData = z.infer<typeof manualSaleSchema> & {
  products: ProductFormData[];
};

interface ManualSalesFormProps {
  onSubmit: (data: ManualSaleFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  convertingProspecto?: Prospecto | null;
  defaultCanal?: string; // Default canal to pre-fill (e.g., "ShopMom", "shopify")
  productLine?: ProductLine; // Product line to filter canales (boxi or mompox)
}

export default function ManualSalesForm({ onSubmit, onCancel, isSubmitting = false, convertingProspecto, defaultCanal = "", productLine = 'boxi' }: ManualSalesFormProps) {
  const [products, setProducts] = useState<ProductFormData[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{product: ProductFormData; index: number} | null>(null);
  const hasInitialized = useRef(false);
  const lastProspectoId = useRef<string | null>(null);

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
      direccionDespachoPais: "Venezuela",
      direccionDespachoEstado: "",
      direccionDespachoCiudad: "",
      direccionDespachoDireccion: "",
      direccionDespachoUrbanizacion: "",
      direccionDespachoReferencia: "",
      canal: "", // No default - force user selection
      asesorId: "", // No default - force user selection
      products: [],
    },
  });

  const watchDespachoIgual = form.watch("direccionDespachoIgualFacturacion");
  const watchDespachoPais = form.watch("direccionDespachoPais");
  const watchDespachoEstado = form.watch("direccionDespachoEstado");
  const watchDespachoCiudad = form.watch("direccionDespachoCiudad");
  const watchDespachoDireccion = form.watch("direccionDespachoDireccion");
  const watchDespachoUrbanizacion = form.watch("direccionDespachoUrbanizacion");
  const watchDespachoReferencia = form.watch("direccionDespachoReferencia");

  // Get asesores for default asesor
  const { data: asesoresList = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean | string }>>({
    queryKey: ["/api/admin/asesores"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Pre-fill form when converting prospecto
  useEffect(() => {
    // Reset flag if prospecto ID changed
    if (convertingProspecto && lastProspectoId.current !== convertingProspecto.id) {
      hasInitialized.current = false;
      lastProspectoId.current = convertingProspecto.id;
    }
    
    if (convertingProspecto && !hasInitialized.current) {
      form.reset({
        nombre: convertingProspecto.nombre || "",
        cedula: convertingProspecto.cedula || "",
        telefono: convertingProspecto.telefono || "",
        email: convertingProspecto.email || "",
        totalUsd: "0",
        fecha: new Date().toISOString().split('T')[0],
        fechaEntrega: convertingProspecto.fechaEntrega ? new Date(convertingProspecto.fechaEntrega) : undefined,
        referencia: "",
        montoUsd: "",
        montoBs: "",
        direccionFacturacionPais: convertingProspecto.direccionFacturacionPais || "Venezuela",
        direccionFacturacionEstado: convertingProspecto.direccionFacturacionEstado || "",
        direccionFacturacionCiudad: convertingProspecto.direccionFacturacionCiudad || "",
        direccionFacturacionDireccion: convertingProspecto.direccionFacturacionDireccion || "",
        direccionFacturacionUrbanizacion: convertingProspecto.direccionFacturacionUrbanizacion || "",
        direccionFacturacionReferencia: convertingProspecto.direccionFacturacionReferencia || "",
        direccionDespachoIgualFacturacion: convertingProspecto.direccionDespachoIgualFacturacion === "true",
        direccionDespachoPais: convertingProspecto.direccionDespachoPais || "Venezuela",
        direccionDespachoEstado: convertingProspecto.direccionDespachoEstado || "",
        direccionDespachoCiudad: convertingProspecto.direccionDespachoCiudad || "",
        direccionDespachoDireccion: convertingProspecto.direccionDespachoDireccion || "",
        direccionDespachoUrbanizacion: convertingProspecto.direccionDespachoUrbanizacion || "",
        direccionDespachoReferencia: convertingProspecto.direccionDespachoReferencia || "",
        canal: "", // No default - force user selection even when converting
        asesorId: "", // No default - force user selection even when converting
        products: [],
      });
      hasInitialized.current = true;
    }
    
    // Reset flag when prospecto is cleared
    if (!convertingProspecto) {
      hasInitialized.current = false;
      lastProspectoId.current = null;
    }
  }, [convertingProspecto, form]);

  // Auto-calculate Total Orden USD from sum of products
  useEffect(() => {
    const total = products.reduce((sum, product) => sum + product.totalUsd, 0);
    form.setValue("totalUsd", total.toFixed(2));
  }, [products, form]);

  // Copy shipping address to billing address when checkbox is checked
  useEffect(() => {
    if (watchDespachoIgual) {
      form.setValue("direccionFacturacionPais", watchDespachoPais);
      form.setValue("direccionFacturacionEstado", watchDespachoEstado);
      form.setValue("direccionFacturacionCiudad", watchDespachoCiudad);
      form.setValue("direccionFacturacionDireccion", watchDespachoDireccion);
      form.setValue("direccionFacturacionUrbanizacion", watchDespachoUrbanizacion);
      form.setValue("direccionFacturacionReferencia", watchDespachoReferencia);
    }
  }, [watchDespachoIgual, watchDespachoPais, watchDespachoEstado, watchDespachoCiudad, watchDespachoDireccion, watchDespachoUrbanizacion, watchDespachoReferencia, form]);

  const handleSaveProduct = (product: ProductFormData, index?: number) => {
    if (index !== undefined) {
      const updatedProducts = [...products];
      updatedProducts[index] = product;
      setProducts(updatedProducts);
      setEditingProduct(null);
    } else {
      setProducts([...products, product]);
    }
  };

  const handleEditProduct = (product: ProductFormData, index: number) => {
    setEditingProduct({ product, index });
    setIsProductDialogOpen(true);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleCloseDialog = () => {
    setIsProductDialogOpen(false);
    setEditingProduct(null);
  };

  // Get products, payment methods and banks for dropdowns
  const { data: productosList = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/productos"],
  });

  const { data: allBanks = [] } = useQuery<Array<{ id: string; banco: string; tipo: string }>>({
    queryKey: ["/api/admin/bancos"],
  });
  
  // Filter to show only Receptor banks (for incoming payments)
  const banks = allBanks.filter(bank => bank.tipo === "Receptor");

  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean | string }>>({
    queryKey: ["/api/admin/canales"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const activeAsesores = asesoresList.filter(asesor => asesor.activo === true || asesor.activo === "true");

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
                      autoComplete="off" 
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
                      placeholder="12345678 para Cédula, J123456789 para RIF, sin espacios ni guiones" 
                      {...field} 
                      autoComplete="off" 
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

                      autoComplete="nope-phone" 


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
                      autoComplete="off" 
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
                  <FormLabel>Canal *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-canal">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar canal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filterCanalesByProductLine(canales, productLine)
                        .filter(canal => canal.activo === true || canal.activo === "true")
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

            <FormField
              control={form.control}
              name="asesorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asesor</FormLabel>
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                    data-testid="select-asesor-venta"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar asesor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin asesor</SelectItem>
                      {activeAsesores.map((asesor) => (
                        <SelectItem key={asesor.id} value={asesor.id}>
                          {asesor.nombre}
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
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product, index)}
                            data-testid={`button-edit-product-${index}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProduct(index)}
                            data-testid={`button-remove-product-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
                    <Input 
                      placeholder="0.00" 
                      {...field} 
                      data-testid="input-total-usd"
                      disabled
                      className="bg-muted"
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
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="direccionDespachoPais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Venezuela" 
                      {...field} 
  
                      autoComplete="nope-country-shipping" 
  
  
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
                  <FormLabel>Estado *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Distrito Capital" 
                      {...field} 
  
                      autoComplete="nope-state-shipping" 
  
  
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
                  <FormLabel>Ciudad *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Caracas" 
                      {...field} 
  
                      autoComplete="nope-city-shipping" 
  
  
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
                  <FormLabel>Dirección *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Calle, número, apartamento, etc." 
                      {...field} 
  
                      autoComplete="nope-address-shipping" 
  
  
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
  
                      autoComplete="nope-neighborhood-shipping" 
  
  
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
  
                      autoComplete="nope-reference-shipping" 
  
  
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Same Address Checkbox */}
        <Card>
          <CardContent className="pt-6">
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
                      La dirección de facturación es igual a la de despacho
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Billing Address */}
        {!watchDespachoIgual && (
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
    
                          autoComplete="nope-country-billing" 
    
    
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
    
                          autoComplete="nope-state-billing" 
    
    
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
    
                          autoComplete="nope-city-billing" 
    
    
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
    
                          autoComplete="nope-address-billing" 
    
    
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
    
                          autoComplete="nope-neighborhood-billing" 
    
    
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
    
                          autoComplete="nope-reference-billing" 
    
    
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>
        )}

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
        onClose={handleCloseDialog}
        onSave={handleSaveProduct}
        product={editingProduct?.product}
        index={editingProduct?.index}
      />
    </Form>
  );
}