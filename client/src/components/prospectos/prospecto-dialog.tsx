import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertProspectoSchema, type Prospecto, type InsertProspecto } from "@shared/schema";
import { z } from "zod";

const prospectoFormSchema = insertProspectoSchema.extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  telefono: z.string().min(1, "El teléfono es requerido"),
  canal: z.string().default("Tienda"),
});

type ProspectoFormValues = z.infer<typeof prospectoFormSchema>;

interface ProspectoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospecto?: Prospecto | null;
}

export default function ProspectoDialog({ open, onOpenChange, prospecto }: ProspectoDialogProps) {
  const { toast } = useToast();
  const isEditMode = !!prospecto;

  const form = useForm<ProspectoFormValues>({
    resolver: zodResolver(prospectoFormSchema),
    defaultValues: {
      nombre: "",
      telefono: "",
      canal: "Tienda",
      asesorId: null,
    },
  });

  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean }>>({
    queryKey: ["/api/admin/canales"],
  });

  const { data: asesores = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean }>>({
    queryKey: ["/api/admin/asesores"],
  });

  const activeCanales = canales.filter((c) => c.activo);
  const activeAsesores = asesores.filter((a) => a.activo);

  useEffect(() => {
    if (prospecto) {
      form.reset({
        nombre: prospecto.nombre,
        telefono: prospecto.telefono,
        canal: prospecto.canal || "Tienda",
        asesorId: prospecto.asesorId,
      });
    } else {
      form.reset({
        nombre: "",
        telefono: "",
        canal: "Tienda",
        asesorId: null,
      });
    }
  }, [prospecto, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertProspecto) => apiRequest("POST", "/api/prospectos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospectos"] });
      toast({
        title: "Prospecto creado",
        description: "El prospecto ha sido registrado exitosamente.",
      });
      onOpenChange(false);
      form.reset();
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
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProspecto> }) =>
      apiRequest("PATCH", `/api/prospectos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospectos"] });
      toast({
        title: "Prospecto actualizado",
        description: "El prospecto ha sido actualizado exitosamente.",
      });
      onOpenChange(false);
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-prospecto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Prospecto" : "Nuevo Prospecto"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Nombre del prospecto"
                      data-testid="input-prospecto-nombre"
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
                      {...field}
                      placeholder="Teléfono del prospecto"
                      data-testid="input-prospecto-telefono"
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
                  <Select
                    value={field.value || "Tienda"}
                    onValueChange={field.onChange}
                    data-testid="select-prospecto-canal"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un canal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeCanales.map((canal) => (
                        <SelectItem key={canal.id} value={canal.nombre} data-testid={`option-canal-${canal.nombre}`}>
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
                    value={field.value || ""}
                    onValueChange={(value) => field.onChange(value || null)}
                    data-testid="select-prospecto-asesor"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un asesor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="" data-testid="option-asesor-none">Sin asesor</SelectItem>
                      {activeAsesores.map((asesor) => (
                        <SelectItem key={asesor.id} value={asesor.id} data-testid={`option-asesor-${asesor.id}`}>
                          {asesor.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
  );
}
