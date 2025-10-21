import { useState, useEffect, useRef } from "react";
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
import { CalendarIcon, MapPin, Package, Plus, Trash2, User, Pencil } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertSaleSchema, type Prospecto } from "@shared/schema";
import { z } from "zod";
import ProductDialog, { ProductFormData } from "./product-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ManualReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  convertingProspecto?: Prospecto | null;
}

// Form schema based on insertSaleSchema with proper numeric coercion
const manualReservaSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  cedula: z.string().min(1, "Cédula es requerida").regex(/^[A-Za-z0-9]{6,10}$/, "La cédula debe tener entre 6 y 10 caracteres alfanuméricos"),
  telefono: z.string().min(1, "Teléfono es requerido").regex(/^\d+$/, "El teléfono debe contener solo números"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  totalUsd: z.string().min(1, "Total Orden USD es requerido"),
  fechaEntrega: z.date({ required_error: "Fecha de entrega es requerida" }),
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
  asesorId: z.string().optional(),
});

type ManualReservaFormData = z.infer<typeof manualReservaSchema> & {
  products: ProductFormData[];
};

export default function ManualReservaModal({ isOpen, onClose, onSuccess, convertingProspecto }: ManualReservaModalProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductFormData[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{product: ProductFormData; index: number} | null>(null);
  const hasInitialized = useRef(false);
  const lastProspectoId = useRef<string | null>(null);

  const form = useForm<ManualReservaFormData>({
    resolver: zodResolver(manualReservaSchema),
    defaultValues: {
      nombre: "",
      cedula: "",
      telefono: "",
      email: "",
      totalUsd: "",
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
      fechaEntrega: undefined,
      canal: "",
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
    
    if (convertingProspecto && isOpen && !hasInitialized.current && asesoresList.length > 0) {
      // Find Héctor's ID for default asesor
      const hectorAsesor = asesoresList.find((a) => a.nombre === "Héctor");
      const defaultAsesorId = hectorAsesor?.id || undefined;
      
      form.reset({
        nombre: convertingProspecto.nombre || "",
        cedula: convertingProspecto.cedula || "",
        telefono: convertingProspecto.telefono || "",
        email: convertingProspecto.email || "",
        totalUsd: "0",
        fechaEntrega: convertingProspecto.fechaEntrega ? new Date(convertingProspecto.fechaEntrega) : undefined,
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
        canal: convertingProspecto.canal || "",
        asesorId: convertingProspecto.asesorId || defaultAsesorId,
        products: [],
      });
      hasInitialized.current = true;
    }
    
    // Reset flag when modal closes or prospecto is cleared
    if (!isOpen || !convertingProspecto) {
      hasInitialized.current = false;
      lastProspectoId.current = null;
    }
  }, [convertingProspecto, isOpen, form, asesoresList]);

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

  // Fetch canales data
  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: string }>>({
    queryKey: ["/api/admin/canales"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const activeAsesores = asesoresList.filter(asesor => asesor.activo === true || asesor.activo === "true");

  const createReservaMutation = useMutation({
    mutationFn: async (data: ManualReservaFormData) => {
      // Convert form data to proper API format
      const formattedData = {
        ...data,
        // Convert fechaEntrega to ISO string if provided
        fechaEntrega: data.fechaEntrega?.toISOString() || undefined,
        // Ensure empty string fields are converted to null for API
        cedula: data.cedula || null,
        telefono: data.telefono || null,
        email: data.email || null,
        direccionFacturacionPais: data.direccionFacturacionPais || null,
        direccionFacturacionEstado: data.direccionFacturacionEstado || null,
        direccionFacturacionCiudad: data.direccionFacturacionCiudad || null,
        direccionFacturacionDireccion: data.direccionFacturacionDireccion || null,
        direccionFacturacionUrbanizacion: data.direccionFacturacionUrbanizacion || null,
        direccionFacturacionReferencia: data.direccionFacturacionReferencia || null,
        // If direccionDespachoIgualFacturacion is true, copy billing address to shipping
        direccionDespachoPais: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionPais : (data.direccionDespachoPais || null),
        direccionDespachoEstado: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionEstado : (data.direccionDespachoEstado || null),
        direccionDespachoCiudad: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionCiudad : (data.direccionDespachoCiudad || null),
        direccionDespachoDireccion: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionDireccion : (data.direccionDespachoDireccion || null),
        direccionDespachoUrbanizacion: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionUrbanizacion : (data.direccionDespachoUrbanizacion || null),
        direccionDespachoReferencia: data.direccionDespachoIgualFacturacion ? data.direccionFacturacionReferencia : (data.direccionDespachoReferencia || null),
        // Include products array for multi-product support
        products: data.products,
        // Add reserva-specific flags
        estadoEntrega: "Pendiente",
        tipo: "Reserva",
      };
      return apiRequest("POST", "/api/sales/manual", formattedData);
    },
    onSuccess: async () => {
      // If converting from prospecto, delete the prospecto
      if (convertingProspecto) {
        try {
          await apiRequest("DELETE", `/api/prospectos/${convertingProspecto.id}`);
          queryClient.invalidateQueries({ queryKey: ["/api/prospectos"] });
        } catch (error) {
          console.error("Failed to delete prospecto:", error);
          // Still show success for reserva creation
        }
      }
      
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: convertingProspecto ? "Prospecto convertido" : "Reserva creada",
        description: convertingProspecto ? "El prospecto ha sido convertido en reserva exitosamente." : "La reserva manual ha sido creada exitosamente.",
      });
      form.reset();
      setProducts([]);
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
          <DialogTitle>
            {convertingProspecto ? "Convertir Prospecto en Reserva" : "Nueva Reserva Manual"}
          </DialogTitle>
          {convertingProspecto && (
            <p className="text-sm text-muted-foreground mt-2">
              Convirtiendo prospecto de {convertingProspecto.nombre}. Agrega los productos para completar la reserva.
            </p>
          )}
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
                        <Input 
                          placeholder="Nombre y Apellido" 
                          {...field} 
                          data-testid="input-nombre" 
                          required 
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
                          value={field.value || ""} 
                          data-testid="input-cedula" 

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
                          value={field.value || ""} 
                          data-testid="input-telefono" 

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
                          {...field} 
                          value={field.value || ""} 
                          type="email" 
                          data-testid="input-email" 

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

                <FormField
                  control={form.control}
                  name="canal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canal *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-canal-reserva">
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

                <FormField
                  control={form.control}
                  name="asesorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asesor</FormLabel>
                      <Select
                        value={field.value || "none"}
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                        data-testid="select-asesor-reserva"
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
                        <TableHead>Medida Especial</TableHead>
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
                          <TableCell>{product.medidaEspecial || "N/A"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProduct(product, index)}
                                data-testid={`button-edit-product-reserva-${index}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveProduct(index)}
                                data-testid={`button-remove-product-reserva-${index}`}
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
                          data-testid="input-total-orden-usd"
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
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Venezuela" 
                          {...field} 
                          data-testid="input-despacho-pais" 

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
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Distrito Capital" 
                          {...field} 
                          data-testid="input-despacho-estado" 

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
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Caracas" 
                          {...field} 
                          data-testid="input-despacho-ciudad" 

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
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Calle, número, apartamento, etc." 
                          {...field} 
                          data-testid="input-despacho-direccion" 

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
                          data-testid="input-despacho-urbanizacion" 

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
                          data-testid="input-despacho-referencia" 

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
                          data-testid="checkbox-same-address"
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
                            data-testid="input-facturacion-pais" 

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
                            data-testid="input-facturacion-estado" 

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
                            data-testid="input-facturacion-ciudad" 

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
                            data-testid="input-facturacion-direccion" 

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
                            data-testid="input-facturacion-urbanizacion" 

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
                            placeholder="Punto de referencia" 
                            {...field} 
                            data-testid="input-facturacion-referencia" 

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
          onClose={handleCloseDialog}
          onSave={handleSaveProduct}
          product={editingProduct?.product}
          index={editingProduct?.index}
        />
      </DialogContent>
    </Dialog>
  );
}