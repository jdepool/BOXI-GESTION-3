import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, MapPin, Package, Plus, Trash2, User, Pencil } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertProspectoSchema, type Prospecto } from "@shared/schema";
import { z } from "zod";
import ProductDialog, { ProductFormData } from "../sales/product-dialog";

const prospectoFormSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  cedula: z.string().optional(),
  telefono: z.string().min(1, "Teléfono es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  canal: z.string().optional(),
  asesorId: z.string().optional().nullable(),
  fechaEntrega: z.date().optional().nullable(),
  totalUsd: z.string().optional(),
  direccionDespachoIgualFacturacion: z.boolean().default(true),
  direccionDespachoPais: z.string().optional(),
  direccionDespachoEstado: z.string().optional(),
  direccionDespachoCiudad: z.string().optional(),
  direccionDespachoDireccion: z.string().optional(),
  direccionDespachoUrbanizacion: z.string().optional(),
  direccionDespachoReferencia: z.string().optional(),
  direccionFacturacionPais: z.string().optional(),
  direccionFacturacionEstado: z.string().optional(),
  direccionFacturacionCiudad: z.string().optional(),
  direccionFacturacionDireccion: z.string().optional(),
  direccionFacturacionUrbanizacion: z.string().optional(),
  direccionFacturacionReferencia: z.string().optional(),
});

type ProspectoFormValues = z.infer<typeof prospectoFormSchema> & {
  products: ProductFormData[];
};

interface ProspectoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospecto?: Prospecto | null;
}

export default function ProspectoDialog({ open, onOpenChange, prospecto }: ProspectoDialogProps) {
  const { toast } = useToast();
  const isEditMode = !!prospecto;
  const [products, setProducts] = useState<ProductFormData[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{product: ProductFormData; index: number} | null>(null);

  const form = useForm<ProspectoFormValues>({
    resolver: zodResolver(prospectoFormSchema),
    defaultValues: {
      nombre: "",
      cedula: "",
      telefono: "",
      email: "",
      canal: "Tienda",
      asesorId: null,
      fechaEntrega: undefined,
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

  // Auto-calculate Total USD from sum of products
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

  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: string }>>({
    queryKey: ["/api/admin/canales"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: asesores = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean }>>({
    queryKey: ["/api/admin/asesores"],
    staleTime: 5 * 60 * 1000,
  });

  const activeAsesores = asesores.filter((a) => a.activo);

  useEffect(() => {
    if (prospecto) {
      const parsedProducts = prospecto.products ? JSON.parse(prospecto.products) : [];
      setProducts(parsedProducts);
      
      form.reset({
        nombre: prospecto.nombre,
        cedula: prospecto.cedula || "",
        telefono: prospecto.telefono,
        email: prospecto.email || "",
        canal: prospecto.canal || "Tienda",
        asesorId: prospecto.asesorId,
        fechaEntrega: prospecto.fechaEntrega ? new Date(prospecto.fechaEntrega) : undefined,
        totalUsd: prospecto.totalUsd || "",
        direccionFacturacionPais: prospecto.direccionFacturacionPais || "Venezuela",
        direccionFacturacionEstado: prospecto.direccionFacturacionEstado || "",
        direccionFacturacionCiudad: prospecto.direccionFacturacionCiudad || "",
        direccionFacturacionDireccion: prospecto.direccionFacturacionDireccion || "",
        direccionFacturacionUrbanizacion: prospecto.direccionFacturacionUrbanizacion || "",
        direccionFacturacionReferencia: prospecto.direccionFacturacionReferencia || "",
        direccionDespachoIgualFacturacion: prospecto.direccionDespachoIgualFacturacion === "true",
        direccionDespachoPais: prospecto.direccionDespachoPais || "Venezuela",
        direccionDespachoEstado: prospecto.direccionDespachoEstado || "",
        direccionDespachoCiudad: prospecto.direccionDespachoCiudad || "",
        direccionDespachoDireccion: prospecto.direccionDespachoDireccion || "",
        direccionDespachoUrbanizacion: prospecto.direccionDespachoUrbanizacion || "",
        direccionDespachoReferencia: prospecto.direccionDespachoReferencia || "",
        products: [],
      });
    } else {
      setProducts([]);
      form.reset({
        nombre: "",
        cedula: "",
        telefono: "",
        email: "",
        canal: "Tienda",
        asesorId: null,
        fechaEntrega: undefined,
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
        products: [],
      });
    }
  }, [prospecto, form]);

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

  const handleCloseProductDialog = () => {
    setIsProductDialogOpen(false);
    setEditingProduct(null);
  };

  const createMutation = useMutation({
    mutationFn: async (data: ProspectoFormValues) => {
      const formattedData = {
        nombre: data.nombre,
        cedula: data.cedula || null,
        telefono: data.telefono,
        email: data.email || null,
        canal: data.canal || null,
        asesorId: data.asesorId || null,
        fechaEntrega: data.fechaEntrega?.toISOString() || null,
        totalUsd: data.totalUsd || null,
        products: JSON.stringify(products),
        direccionFacturacionPais: data.direccionFacturacionPais || null,
        direccionFacturacionEstado: data.direccionFacturacionEstado || null,
        direccionFacturacionCiudad: data.direccionFacturacionCiudad || null,
        direccionFacturacionDireccion: data.direccionFacturacionDireccion || null,
        direccionFacturacionUrbanizacion: data.direccionFacturacionUrbanizacion || null,
        direccionFacturacionReferencia: data.direccionFacturacionReferencia || null,
        direccionDespachoIgualFacturacion: data.direccionDespachoIgualFacturacion ? "true" : "false",
        direccionDespachoPais: data.direccionDespachoPais || null,
        direccionDespachoEstado: data.direccionDespachoEstado || null,
        direccionDespachoCiudad: data.direccionDespachoCiudad || null,
        direccionDespachoDireccion: data.direccionDespachoDireccion || null,
        direccionDespachoUrbanizacion: data.direccionDespachoUrbanizacion || null,
        direccionDespachoReferencia: data.direccionDespachoReferencia || null,
      };
      return apiRequest("POST", "/api/prospectos", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospectos"] });
      toast({
        title: "Prospecto creado",
        description: "El prospecto ha sido registrado exitosamente.",
      });
      handleClose();
    },
    onError: (error: any) => {
      console.error("Failed to create prospecto:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el prospecto. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProspectoFormValues }) => {
      const formattedData = {
        nombre: data.nombre,
        cedula: data.cedula || null,
        telefono: data.telefono,
        email: data.email || null,
        canal: data.canal || null,
        asesorId: data.asesorId || null,
        fechaEntrega: data.fechaEntrega?.toISOString() || null,
        totalUsd: data.totalUsd || null,
        products: JSON.stringify(products),
        direccionFacturacionPais: data.direccionFacturacionPais || null,
        direccionFacturacionEstado: data.direccionFacturacionEstado || null,
        direccionFacturacionCiudad: data.direccionFacturacionCiudad || null,
        direccionFacturacionDireccion: data.direccionFacturacionDireccion || null,
        direccionFacturacionUrbanizacion: data.direccionFacturacionUrbanizacion || null,
        direccionFacturacionReferencia: data.direccionFacturacionReferencia || null,
        direccionDespachoIgualFacturacion: data.direccionDespachoIgualFacturacion ? "true" : "false",
        direccionDespachoPais: data.direccionDespachoPais || null,
        direccionDespachoEstado: data.direccionDespachoEstado || null,
        direccionDespachoCiudad: data.direccionDespachoCiudad || null,
        direccionDespachoDireccion: data.direccionDespachoDireccion || null,
        direccionDespachoUrbanizacion: data.direccionDespachoUrbanizacion || null,
        direccionDespachoReferencia: data.direccionDespachoReferencia || null,
      };
      return apiRequest("PATCH", `/api/prospectos/${id}`, formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospectos"] });
      toast({
        title: "Prospecto actualizado",
        description: "El prospecto ha sido actualizado exitosamente.",
      });
      handleClose();
    },
    onError: (error: any) => {
      console.error("Failed to update prospecto:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el prospecto. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProspectoFormValues) => {
    if (isEditMode && prospecto) {
      updateMutation.mutate({ id: prospecto.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClose = () => {
    form.reset();
    setProducts([]);
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-prospecto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar Prospecto" : "Nuevo Prospecto"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            data-testid="input-prospecto-nombre" 
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
                        <FormLabel>Cédula</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="12345678 para Cédula, J123456789 para RIF" 
                            {...field} 
                            value={field.value || ""} 
                            data-testid="input-prospecto-cedula" 
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
                            data-testid="input-prospecto-telefono" 
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
                            data-testid="input-prospecto-email" 
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
                        <FormLabel>Fecha de Entrega</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="input-prospecto-fecha-entrega"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "dd/MM/yyyy") : "Seleccionar fecha"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
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
                        <Select onValueChange={field.onChange} value={field.value || "Tienda"} data-testid="select-prospecto-canal">
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
                          onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                          data-testid="select-prospecto-asesor"
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
                      data-testid="button-add-product-prospecto"
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
                          <TableRow key={index} data-testid={`product-row-prospecto-${index}`}>
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
                                  data-testid={`button-edit-product-prospecto-${index}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveProduct(index)}
                                  data-testid={`button-remove-product-prospecto-${index}`}
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
                      <FormItem className="max-w-xs mt-4">
                        <FormLabel>Total USD</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0.00" 
                            {...field} 
                            data-testid="input-prospecto-total-usd"
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
                            data-testid="input-prospecto-despacho-pais" 
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
                            data-testid="input-prospecto-despacho-estado" 
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
                            data-testid="input-prospecto-despacho-ciudad" 
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
                            placeholder="Calle, Avenida, Número de casa/apartamento" 
                            {...field} 
                            data-testid="input-prospecto-despacho-direccion" 
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
                            data-testid="input-prospecto-despacho-urbanizacion" 
                            autoComplete="off" 
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
                            placeholder="Punto de referencia para la entrega" 
                            {...field} 
                            data-testid="input-prospecto-despacho-referencia" 
                            autoComplete="off" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Same Address Checkbox */}
              <FormField
                control={form.control}
                name="direccionDespachoIgualFacturacion"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-prospecto-same-address"
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

              {/* Billing Address (conditional) */}
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
                          <FormLabel>País</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Venezuela" 
                              {...field} 
                              data-testid="input-prospecto-facturacion-pais" 
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
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Distrito Capital" 
                              {...field} 
                              data-testid="input-prospecto-facturacion-estado" 
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
                          <FormLabel>Ciudad</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Caracas" 
                              {...field} 
                              data-testid="input-prospecto-facturacion-ciudad" 
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
                          <FormLabel>Dirección</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Calle, Avenida, Número de casa/apartamento" 
                              {...field} 
                              data-testid="input-prospecto-facturacion-direccion" 
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
                              data-testid="input-prospecto-facturacion-urbanizacion" 
                              autoComplete="off" 
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
                              placeholder="Punto de referencia para la entrega" 
                              {...field} 
                              data-testid="input-prospecto-facturacion-referencia" 
                              autoComplete="off" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                  data-testid="button-cancel-prospecto"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-prospecto">
                  {isPending ? "Guardando..." : isEditMode ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ProductDialog
        isOpen={isProductDialogOpen}
        onClose={handleCloseProductDialog}
        onSave={handleSaveProduct}
        product={editingProduct?.product}
        index={editingProduct?.index}
      />
    </>
  );
}
