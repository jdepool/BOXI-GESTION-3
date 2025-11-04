import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Autorizador } from "@shared/schema";

export function AutorizadoresTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAutorizador, setEditingAutorizador] = useState<Autorizador | null>(null);
  const [formData, setFormData] = useState({ nombre: "", criterio: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: autorizadores = [], isLoading } = useQuery({
    queryKey: ["/api/admin/autorizadores"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { nombre: string; criterio?: string }) =>
      apiRequest("POST", "/api/admin/autorizadores", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autorizadores"] });
      setIsDialogOpen(false);
      setFormData({ nombre: "", criterio: "" });
      toast({ title: "Autorizador creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear autorizador", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string; criterio?: string } }) =>
      apiRequest("PUT", `/api/admin/autorizadores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autorizadores"] });
      setIsDialogOpen(false);
      setEditingAutorizador(null);
      setFormData({ nombre: "", criterio: "" });
      toast({ title: "Autorizador actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar autorizador", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/autorizadores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autorizadores"] });
      toast({ title: "Autorizador eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar autorizador", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }

    if (editingAutorizador) {
      updateMutation.mutate({ id: editingAutorizador.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (autorizador: Autorizador) => {
    setEditingAutorizador(autorizador);
    setFormData({ nombre: autorizador.nombre, criterio: autorizador.criterio || "" });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAutorizador(null);
    setFormData({ nombre: "", criterio: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Autorizadores de Egresos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona las personas que autorizan egresos y los criterios para asignación
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          else setIsDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="add-autorizador">
              <Plus className="h-4 w-4" />
              Nuevo Autorizador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAutorizador ? "Editar Autorizador" : "Nuevo Autorizador"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del autorizador"
                  required
                  data-testid="input-nombre"
                />
              </div>
              <div>
                <Label htmlFor="criterio">Criterio (opcional)</Label>
                <Textarea
                  id="criterio"
                  value={formData.criterio}
                  onChange={(e) => setFormData({ ...formData, criterio: e.target.value })}
                  placeholder="Ej: Autoriza egresos mayores a $1,000"
                  rows={3}
                  data-testid="input-criterio"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Descripción de cuándo usar este autorizador
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {editingAutorizador ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Criterio</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : autorizadores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No hay autorizadores registrados
                </TableCell>
              </TableRow>
            ) : (
              (autorizadores as Autorizador[]).map((autorizador) => (
                <TableRow key={autorizador.id}>
                  <TableCell className="font-medium" data-testid={`text-nombre-${autorizador.id}`}>
                    {autorizador.nombre}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm" data-testid={`text-criterio-${autorizador.id}`}>
                    {autorizador.criterio || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(autorizador)}
                        data-testid={`edit-autorizador-${autorizador.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("¿Estás seguro de que deseas eliminar este autorizador?")) {
                            deleteMutation.mutate(autorizador.id);
                          }
                        }}
                        data-testid={`delete-autorizador-${autorizador.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
