import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Transportista } from "@shared/schema";

export function TransportistasTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransportista, setEditingTransportista] = useState<Transportista | null>(null);
  const [formData, setFormData] = useState({ nombre: "", telefono: "", email: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transportistas = [], isLoading } = useQuery<Transportista[]>({
    queryKey: ["/api/admin/transportistas"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { nombre: string; telefono: string; email: string }) =>
      apiRequest("POST", "/api/admin/transportistas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transportistas"] });
      setIsDialogOpen(false);
      setFormData({ nombre: "", telefono: "", email: "" });
      toast({ title: "Transportista creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear transportista", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string; telefono: string; email: string } }) =>
      apiRequest("PUT", `/api/admin/transportistas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transportistas"] });
      setIsDialogOpen(false);
      setEditingTransportista(null);
      setFormData({ nombre: "", telefono: "", email: "" });
      toast({ title: "Transportista actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar transportista", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/transportistas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transportistas"] });
      toast({ title: "Transportista eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar transportista", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTransportista) {
      updateMutation.mutate({ id: editingTransportista.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (transportista: Transportista) => {
    setEditingTransportista(transportista);
    setFormData({ 
      nombre: transportista.nombre, 
      telefono: transportista.telefono || "", 
      email: transportista.email || "" 
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTransportista(null);
    setFormData({ nombre: "", telefono: "", email: "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Transportistas</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de empresas de transporte
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="add-transportista-button">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Transportista
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTransportista ? "Editar Transportista" : "Agregar Transportista"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Transportes La Victoria"
                  required
                  data-testid="input-nombre"
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Ej: 04121234567"
                  data-testid="input-telefono"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ej: contacto@transportes.com"
                  data-testid="input-email"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="cancel-button"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="save-button"
                >
                  {editingTransportista ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  Cargando transportistas...
                </TableCell>
              </TableRow>
            ) : transportistas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No hay transportistas registrados
                </TableCell>
              </TableRow>
            ) : (
              transportistas.map((transportista) => (
                <TableRow key={transportista.id} data-testid={`transportista-row-${transportista.id}`}>
                  <TableCell className="font-medium">{transportista.nombre}</TableCell>
                  <TableCell>{transportista.telefono || 'N/A'}</TableCell>
                  <TableCell>{transportista.email || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(transportista)}
                        data-testid={`edit-transportista-${transportista.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("¿Estás seguro de que quieres eliminar este transportista?")) {
                            deleteMutation.mutate(transportista.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        data-testid={`delete-transportista-${transportista.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
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
