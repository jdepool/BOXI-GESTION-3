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
import type { Moneda } from "@shared/schema";

const monedasPredefinidas = [
  { codigo: "USD", nombre: "Dólar Estadounidense" },
  { codigo: "BS", nombre: "Bolívar Soberano" },
  { codigo: "COP", nombre: "Peso Colombiano" },
  { codigo: "BS/USD", nombre: "Bolívar/Dólar" },
  { codigo: "COP/USD", nombre: "Peso Colombiano/Dólar" },
  { codigo: "COP/BS", nombre: "Peso Colombiano/Bolívar" }
];

export function MonedasTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMoneda, setEditingMoneda] = useState<Moneda | null>(null);
  const [formData, setFormData] = useState({ codigo: "", nombre: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: monedas = [], isLoading } = useQuery({
    queryKey: ["/api/admin/monedas"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { codigo: string; nombre: string }) =>
      apiRequest("POST", "/api/admin/monedas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/monedas"] });
      setIsDialogOpen(false);
      setFormData({ codigo: "", nombre: "" });
      toast({ title: "Moneda creada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear moneda", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { codigo: string; nombre: string } }) =>
      apiRequest("PUT", `/api/admin/monedas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/monedas"] });
      setIsDialogOpen(false);
      setEditingMoneda(null);
      setFormData({ codigo: "", nombre: "" });
      toast({ title: "Moneda actualizada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar moneda", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/monedas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/monedas"] });
      toast({ title: "Moneda eliminada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar moneda", variant: "destructive" });
    },
  });

  const cargarMonedasPredefinidas = useMutation({
    mutationFn: async () => {
      const promises = monedasPredefinidas.map(moneda =>
        apiRequest("POST", "/api/admin/monedas", moneda)
      );
      return Promise.allSettled(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/monedas"] });
      toast({ title: "Monedas predefinidas cargadas exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al cargar monedas predefinidas", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMoneda) {
      updateMutation.mutate({ id: editingMoneda.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (moneda: Moneda) => {
    setEditingMoneda(moneda);
    setFormData({ codigo: moneda.codigo, nombre: moneda.nombre });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingMoneda(null);
    setFormData({ codigo: "", nombre: "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Monedas</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de monedas y tipos de cambio utilizados
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => cargarMonedasPredefinidas.mutate()}
            disabled={cargarMonedasPredefinidas.isPending}
            data-testid="load-predefined-monedas"
          >
            Cargar Predefinidas
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-moneda-button">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Moneda
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMoneda ? "Editar Moneda" : "Agregar Moneda"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="codigo">Código de Moneda</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ej: USD, BS, COP"
                    required
                    data-testid="input-moneda-codigo"
                  />
                </div>
                <div>
                  <Label htmlFor="nombre">Nombre de la Moneda</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Dólar Estadounidense"
                    required
                    data-testid="input-moneda-nombre"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="submit-moneda"
                  >
                    {editingMoneda ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (monedas as Moneda[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No hay monedas registradas. Usa "Cargar Predefinidas" para agregar las monedas estándar.
                </TableCell>
              </TableRow>
            ) : (
              (monedas as Moneda[]).map((moneda: Moneda) => (
                <TableRow key={moneda.id} data-testid={`moneda-row-${moneda.id}`}>
                  <TableCell className="font-bold">{moneda.codigo}</TableCell>
                  <TableCell>{moneda.nombre}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(moneda)}
                        data-testid={`edit-moneda-${moneda.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(moneda.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`delete-moneda-${moneda.id}`}
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