import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, User, Package, Plus, Trash2, Pencil } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";
import ProductDialog, { ProductFormData } from "./product-dialog";

const editSaleSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  cedula: z.string().regex(/^[A-Za-z0-9]{6,10}$/, "La cédula debe tener entre 6 y 10 caracteres alfanuméricos").optional().or(z.literal("")),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  canal: z.string().optional(),
  totalUsd: z.string().min(1, "Total USD es requerido"),
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
  const [products, setProducts] = useState<ProductFormData[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{product: ProductFormData; index: number} | null>(null);

  const form = useForm<EditSaleFormData>({
    resolver: zodResolver(editSaleSchema),
    defaultValues: {
      nombre: "",
      cedula: "",
      telefono: "",
      email: "",
      canal: "",
      totalUsd: "",
    },
  });

  // Fetch all products for the order
  const { data: orderProducts = [], isLoading: isLoadingProducts } = useQuery<Sale[]>({
    queryKey: ["/api/sales/order", sale?.orden],
    queryFn: async () => {
      if (!sale?.orden) return [];
      const response = await fetch(`/api/sales/order/${encodeURIComponent(sale.orden)}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      return response.json();
    },
    enabled: !!sale?.orden && open,
  });

  // Fetch active canales
  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: string }>>({
    queryKey: ["/api/admin/canales"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Initialize form and products when sale/order data changes
  useEffect(() => {
    if (sale && open && canales.length > 0) {
      // Find matching canal from canales list (case-insensitive)
      const matchingCanal = canales.find(
        c => c.nombre.toLowerCase() === sale.canal?.toLowerCase()
      );
      
      form.reset({
        nombre: sale.nombre || "",
        cedula: sale.cedula || "",
        telefono: sale.telefono || "",
        email: sale.email || "",
        canal: matchingCanal?.nombre || sale.canal || "",
        totalUsd: sale.totalOrderUsd?.toString() || sale.totalUsd?.toString() || "",
      });

      // Load all products from the order
      if (orderProducts.length > 0) {
        const productsData: ProductFormData[] = orderProducts.map(item => ({
          producto: item.product,
          sku: item.sku || "",
          cantidad: item.cantidad,
          totalUsd: parseFloat(item.totalUsd?.toString() || "0"),
          hasMedidaEspecial: !!item.medidaEspecial,
          medidaEspecial: item.medidaEspecial || "",
        }));
        setProducts(productsData);
      } else {
        // Reset products if no order products returned
        setProducts([]);
      }
    }
  }, [sale, orderProducts, canales, open, form]);

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

  const updateSaleMutation = useMutation({
    mutationFn: async (data: EditSaleFormData) => {
      if (!sale) throw new Error("No sale to update");
      
      // Update all rows with the same order number
      const updateData = {
        ...data,
        products: products,
        orden: sale.orden,
      };

      return apiRequest("PUT", `/api/sales/order/${encodeURIComponent(sale.orden || '')}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Venta actualizada",
        description: "La venta y todos sus productos han sido actualizados exitosamente.",
      });
      onOpenChange(false);
      setProducts([]);
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
    if (products.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un producto.",
        variant: "destructive",
      });
      return;
    }
    updateSaleMutation.mutate(data);
  };

  if (!sale) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Editar Venta - Orden #{sale.orden}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Customer Information Card */}
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
                            placeholder="Nombre completo" 
                            {...field} 
                            data-testid="input-nombre"
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
                            placeholder="12345678 para Cédula, J123456789 para RIF, sin espacios ni guiones" 
                            {...field} 
                            data-testid="input-cedula"
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
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0414-1234567" 
                            {...field} 
                            data-testid="input-telefono"
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
                            data-testid="input-email"
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-canal">
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

              {/* Products Card */}
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
                  {isLoadingProducts ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Cargando productos...
                    </p>
                  ) : products.length === 0 ? (
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
                            <TableCell data-testid={`text-product-name-${index}`}>
                              {product.producto}
                            </TableCell>
                            <TableCell data-testid={`text-product-sku-${index}`}>
                              {product.sku || "N/A"}
                            </TableCell>
                            <TableCell data-testid={`text-product-cantidad-${index}`}>
                              {product.cantidad}
                            </TableCell>
                            <TableCell data-testid={`text-product-total-${index}`}>
                              ${product.totalUsd.toFixed(2)}
                            </TableCell>
                            <TableCell data-testid={`text-product-medida-${index}`}>
                              {product.medidaEspecial || "N/A"}
                            </TableCell>
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
                            data-testid="input-total-orden-usd" 
                          />
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
                  onClick={() => {
                    onOpenChange(false);
                    setProducts([]);
                  }}
                  disabled={updateSaleMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateSaleMutation.isPending} 
                  data-testid="button-save-changes"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateSaleMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Product Dialog for adding and editing products */}
      <ProductDialog
        isOpen={isProductDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveProduct}
        product={editingProduct?.product}
        index={editingProduct?.index}
      />
    </>
  );
}