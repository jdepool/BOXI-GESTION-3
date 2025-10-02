import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package } from "lucide-react";

const productFormSchema = z.object({
  producto: z.string().min(1, "Producto es requerido"),
  sku: z.string().optional(),
  cantidad: z.coerce.number().int().min(1, "Cantidad debe ser al menos 1"),
  totalUsd: z.coerce.number().min(0.01, "Total US$ debe ser mayor a 0"),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: ProductFormData) => void;
}

export default function ProductDialog({ isOpen, onClose, onAdd }: ProductDialogProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      producto: "",
      sku: "",
      cantidad: 1,
      totalUsd: 0,
    },
  });

  // Fetch products for dropdown
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/productos"],
  });

  const handleSubmit = (data: ProductFormData) => {
    onAdd(data);
    form.reset();
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Agregar Producto
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU (Opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej: COL-KING-200X200" 
                      {...field} 
                      data-testid="input-sku"
                    />
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
                  <FormLabel>Total US$ *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0.01" 
                      placeholder="0.00" 
                      {...field} 
                      data-testid="input-total-usd"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                data-testid="button-add-product"
              >
                Agregar Producto
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
