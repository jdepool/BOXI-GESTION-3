import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Estado, Ciudad } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function EstadosCiudadesTab() {
  const [isEstadoDialogOpen, setIsEstadoDialogOpen] = useState(false);
  const [isCiudadDialogOpen, setIsCiudadDialogOpen] = useState(false);
  const [editingEstado, setEditingEstado] = useState<Estado | null>(null);
  const [editingCiudad, setEditingCiudad] = useState<Ciudad | null>(null);
  const [selectedEstadoForCiudad, setSelectedEstadoForCiudad] = useState<Estado | null>(null);
  const [estadoFormData, setEstadoFormData] = useState({ nombre: "" });
  const [ciudadFormData, setCiudadFormData] = useState({ nombre: "", estadoId: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'estado' | 'ciudad', id: string } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: estados = [], isLoading: estadosLoading } = useQuery<Estado[]>({
    queryKey: ["/api/admin/estados"],
  });

  const { data: ciudades = [], isLoading: ciudadesLoading } = useQuery<Ciudad[]>({
    queryKey: ["/api/admin/ciudades"],
  });

  // Get ciudades for a specific estado
  const getCiudadesForEstado = (estadoId: string) => {
    return ciudades.filter(c => c.estadoId === estadoId);
  };

  // Estado mutations
  const createEstadoMutation = useMutation({
    mutationFn: (data: { nombre: string }) =>
      apiRequest("POST", "/api/admin/estados", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estados"] });
      setIsEstadoDialogOpen(false);
      setEstadoFormData({ nombre: "" });
      toast({ title: "Estado creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear estado", variant: "destructive" });
    },
  });

  const updateEstadoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string } }) =>
      apiRequest("PUT", `/api/admin/estados/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estados"] });
      setIsEstadoDialogOpen(false);
      setEditingEstado(null);
      setEstadoFormData({ nombre: "" });
      toast({ title: "Estado actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    },
  });

  const deleteEstadoMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/estados/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estados"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ciudades"] });
      toast({ title: "Estado eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar estado", variant: "destructive" });
    },
  });

  // Ciudad mutations
  const createCiudadMutation = useMutation({
    mutationFn: (data: { nombre: string; estadoId: string }) =>
      apiRequest("POST", "/api/admin/ciudades", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ciudades"] });
      setIsCiudadDialogOpen(false);
      setCiudadFormData({ nombre: "", estadoId: "" });
      setSelectedEstadoForCiudad(null);
      toast({ title: "Ciudad creada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear ciudad", variant: "destructive" });
    },
  });

  const updateCiudadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre: string; estadoId: string } }) =>
      apiRequest("PUT", `/api/admin/ciudades/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ciudades"] });
      setIsCiudadDialogOpen(false);
      setEditingCiudad(null);
      setCiudadFormData({ nombre: "", estadoId: "" });
      toast({ title: "Ciudad actualizada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar ciudad", variant: "destructive" });
    },
  });

  const deleteCiudadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/ciudades/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ciudades"] });
      toast({ title: "Ciudad eliminada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar ciudad", variant: "destructive" });
    },
  });

  const handleCreateEstado = () => {
    setEditingEstado(null);
    setEstadoFormData({ nombre: "" });
    setIsEstadoDialogOpen(true);
  };

  const handleEditEstado = (estado: Estado) => {
    setEditingEstado(estado);
    setEstadoFormData({ nombre: estado.nombre });
    setIsEstadoDialogOpen(true);
  };

  const handleSaveEstado = () => {
    if (editingEstado) {
      updateEstadoMutation.mutate({ id: editingEstado.id, data: estadoFormData });
    } else {
      createEstadoMutation.mutate(estadoFormData);
    }
  };

  const handleCreateCiudad = (estado: Estado) => {
    setEditingCiudad(null);
    setSelectedEstadoForCiudad(estado);
    setCiudadFormData({ nombre: "", estadoId: estado.id });
    setIsCiudadDialogOpen(true);
  };

  const handleEditCiudad = (ciudad: Ciudad) => {
    setEditingCiudad(ciudad);
    const estado = estados.find(e => e.id === ciudad.estadoId);
    setSelectedEstadoForCiudad(estado || null);
    setCiudadFormData({ nombre: ciudad.nombre, estadoId: ciudad.estadoId });
    setIsCiudadDialogOpen(true);
  };

  const handleSaveCiudad = () => {
    if (editingCiudad) {
      updateCiudadMutation.mutate({ id: editingCiudad.id, data: ciudadFormData });
    } else {
      createCiudadMutation.mutate(ciudadFormData);
    }
  };

  const handleDeleteClick = (type: 'estado' | 'ciudad', id: string) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'estado') {
      deleteEstadoMutation.mutate(itemToDelete.id);
    } else {
      deleteCiudadMutation.mutate(itemToDelete.id);
    }
    
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  if (estadosLoading || ciudadesLoading) {
    return <div data-testid="loading-estados-ciudades">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Estados y Ciudades</h2>
        <Button onClick={handleCreateEstado} data-testid="button-add-estado">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Estado
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Estado</TableHead>
              <TableHead>Ciudades</TableHead>
              <TableHead className="w-[150px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estados.map((estado) => {
              const estadoCiudades = getCiudadesForEstado(estado.id);
              return (
                <TableRow key={estado.id} data-testid={`row-estado-${estado.id}`}>
                  <TableCell className="font-medium" data-testid={`text-estado-nombre-${estado.id}`}>
                    {estado.nombre}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {estadoCiudades.map((ciudad) => (
                        <div key={ciudad.id} className="flex items-center justify-between">
                          <span className="text-sm" data-testid={`text-ciudad-${ciudad.id}`}>
                            {ciudad.nombre}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCiudad(ciudad)}
                              data-testid={`button-edit-ciudad-${ciudad.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick('ciudad', ciudad.id)}
                              data-testid={`button-delete-ciudad-${ciudad.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateCiudad(estado)}
                        className="mt-2"
                        data-testid={`button-add-ciudad-${estado.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar Ciudad
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEstado(estado)}
                        data-testid={`button-edit-estado-${estado.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick('estado', estado.id)}
                        data-testid={`button-delete-estado-${estado.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Estado Dialog */}
      <Dialog open={isEstadoDialogOpen} onOpenChange={setIsEstadoDialogOpen}>
        <DialogContent data-testid="dialog-estado">
          <DialogHeader>
            <DialogTitle>{editingEstado ? "Editar Estado" : "Nuevo Estado"}</DialogTitle>
            <DialogDescription>
              {editingEstado ? "Modifica los datos del estado" : "Agrega un nuevo estado"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="estado-nombre">Nombre del Estado *</Label>
              <Input
                id="estado-nombre"
                value={estadoFormData.nombre}
                onChange={(e) => setEstadoFormData({ nombre: e.target.value })}
                placeholder="Ej: Miranda"
                data-testid="input-estado-nombre"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEstadoDialogOpen(false)}
                data-testid="button-cancel-estado"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEstado}
                disabled={!estadoFormData.nombre.trim()}
                data-testid="button-save-estado"
              >
                {editingEstado ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ciudad Dialog */}
      <Dialog open={isCiudadDialogOpen} onOpenChange={setIsCiudadDialogOpen}>
        <DialogContent data-testid="dialog-ciudad">
          <DialogHeader>
            <DialogTitle>{editingCiudad ? "Editar Ciudad" : "Nueva Ciudad"}</DialogTitle>
            <DialogDescription>
              {editingCiudad 
                ? "Modifica los datos de la ciudad" 
                : `Agrega una nueva ciudad a ${selectedEstadoForCiudad?.nombre || ''}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ciudad-nombre">Nombre de la Ciudad *</Label>
              <Input
                id="ciudad-nombre"
                value={ciudadFormData.nombre}
                onChange={(e) => setCiudadFormData({ ...ciudadFormData, nombre: e.target.value })}
                placeholder="Ej: Caracas"
                data-testid="input-ciudad-nombre"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCiudadDialogOpen(false)}
                data-testid="button-cancel-ciudad"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCiudad}
                disabled={!ciudadFormData.nombre.trim()}
                data-testid="button-save-ciudad"
              >
                {editingCiudad ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'estado' 
                ? "Esta acción eliminará el estado y todas sus ciudades asociadas. Esta acción no se puede deshacer."
                : "Esta acción eliminará la ciudad. Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} data-testid="button-confirm-delete">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
