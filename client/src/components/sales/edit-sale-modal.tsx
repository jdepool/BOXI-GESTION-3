import { useEffect } from "react";
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
import { Save, User, Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";

const editSaleSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  cedula: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  product: z.string().min(1, "Producto es requerido"),
  sku: z.string().optional(),
  cantidad: z.number().min(1),
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
      product: "",
      sku: "",
      cantidad: 1,
    },
  });

  // Get products for dropdown
  const { data: products = [] } = useQuery({
    queryKey: ["/api/admin/productos"],
  });

  // Initialize form when sale changes
  useEffect(() => {
    if (sale && open) {
      form.reset({
        nombre: sale.nombre || "",
        cedula: sale.cedula || "",
        telefono: sale.telefono || "",
        email: sale.email || "",
        product: sale.product || "",
        sku: sale.sku || "",
        cantidad: sale.cantidad || 1,
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

            {/* Product Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Producto
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="product"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producto *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-product">
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
                          data-testid="input-cantidad"
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