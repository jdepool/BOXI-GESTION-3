import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Package } from "lucide-react";
import { type ProductLine } from "@/lib/canalFilters";

const productFormSchema = z.object({
  producto: z.string().min(1, "Producto es requerido"),
  sku: z.string().optional(),
  cantidad: z.coerce.number().int().min(1, "Cantidad debe ser al menos 1"),
  totalUsd: z.coerce.number().min(0, "Total US$ debe ser mayor o igual a 0"),
  esObsequio: z.boolean().default(false),
  hasMedidaEspecial: z.boolean().default(false),
  medidaEspecial: z.string().max(10, "Máximo 10 caracteres").optional(),
}).refine(data => {
  if (data.hasMedidaEspecial) {
    return data.medidaEspecial && data.medidaEspecial.trim().length > 0;
  }
  return true;
}, {
  message: "Debe especificar la medida cuando está marcada",
  path: ["medidaEspecial"],
});

export type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductFormData, index?: number) => void;
  product?: ProductFormData;
  index?: number;
  productLine?: ProductLine;
}

export default function ProductDialog({ isOpen, onClose, onSave, product, index, productLine = 'boxi' }: ProductDialogProps) {
  const isEditMode = product !== undefined;
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      producto: "",
      sku: "",
      cantidad: 1,
      totalUsd: "" as any,
      esObsequio: false,
      hasMedidaEspecial: false,
      medidaEspecial: "",
    },
  });

  // Fetch products for dropdown
  const { data: allProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/productos"],
  });

  // Filter products based on productLine and marca
  const products = useMemo(() => {
    if (productLine === 'mompox') {
      // For Mompox: only show products where marcaNombre is "Mompox"
      return allProducts.filter((p) => p.marcaNombre === 'Mompox');
    } else {
      // For Boxi: show products where marcaNombre is "Boxi" or null/undefined (backward compatibility)
      return allProducts.filter((p) => p.marcaNombre === 'Boxi' || !p.marcaNombre);
    }
  }, [allProducts, productLine]);

  const watchHasMedidaEspecial = form.watch("hasMedidaEspecial");

  useEffect(() => {
    if (isOpen && product) {
      form.reset(product);
    } else if (isOpen && !product) {
      form.reset({
        producto: "",
        sku: "",
        cantidad: 1,
        totalUsd: "" as any,
        esObsequio: false,
        hasMedidaEspecial: false,
        medidaEspecial: "",
      });
    }
  }, [isOpen, product, form]);

  const handleSubmit = (data: ProductFormData) => {
    onSave(data, index);
    form.reset();
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleProductChange = (productName: string) => {
    form.setValue("producto", productName);
    
    const selectedProduct = products.find(p => p.nombre === productName);
    form.setValue("sku", selectedProduct?.sku || "", { shouldDirty: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditMode ? "Editar Producto" : "Agregar Producto"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="producto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto *</FormLabel>
                  <Select onValueChange={handleProductChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-producto">
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((producto) => (
                        <SelectItem 
                          key={producto.id} 
                          value={producto.nombre}
                          data-testid={`option-producto-${producto.id}`}
                        >
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
                      {...field} 
                      data-testid="input-cantidad"
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
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder="Ingrese total" 
                      {...field} 
                      data-testid="input-total-usd"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="esObsequio"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-es-obsequio-producto"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal text-muted-foreground">
                      Este producto es obsequio
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasMedidaEspecial"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-medida-especial-producto"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal text-muted-foreground">
                      Este producto requiere medida especial
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
                        data-testid="input-medida-especial-producto"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                data-testid="button-cancel-product"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                data-testid={isEditMode ? "button-save-product" : "button-add-product"}
              >
                {isEditMode ? "Guardar Cambios" : "Agregar Producto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
