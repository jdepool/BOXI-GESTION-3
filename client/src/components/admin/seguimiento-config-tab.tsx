import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, Send } from "lucide-react";
import type { SeguimientoConfig, Asesor } from "@shared/schema";

type AsesorEmailPair = {
  asesorId: string;
  email: string;
};

export function SeguimientoConfigTab() {
  const [formData, setFormData] = useState({
    diasFase1: 2,
    diasFase2: 4,
    diasFase3: 7,
    emailRecordatorio: "",
  });
  const [asesorEmailPairs, setAsesorEmailPairs] = useState<AsesorEmailPair[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery<SeguimientoConfig>({
    queryKey: ["/api/admin/seguimiento-config"],
  });

  const { data: asesores } = useQuery<Asesor[]>({
    queryKey: ["/api/admin/asesores"],
  });

  // Load config data into form when fetched
  useEffect(() => {
    if (config) {
      setFormData({
        diasFase1: config.diasFase1,
        diasFase2: config.diasFase2,
        diasFase3: config.diasFase3,
        emailRecordatorio: config.emailRecordatorio || "",
      });
      
      // Load asesor email pairs
      if (config.asesorEmails && Array.isArray(config.asesorEmails)) {
        setAsesorEmailPairs(config.asesorEmails as AsesorEmailPair[]);
      }
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: { 
      diasFase1: number; 
      diasFase2: number; 
      diasFase3: number; 
      emailRecordatorio: string | null;
      asesorEmails: AsesorEmailPair[] | null;
    }) => apiRequest("PUT", "/api/admin/seguimiento-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seguimiento-config"] });
      toast({ title: "Configuración actualizada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar configuración", variant: "destructive" });
    },
  });

  const triggerRemindersMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/trigger-seguimiento-reminders", {}),
    onSuccess: () => {
      toast({ 
        title: "Recordatorios enviados", 
        description: "Se han enviado los recordatorios de seguimiento por email"
      });
    },
    onError: () => {
      toast({ 
        title: "Error al enviar recordatorios", 
        description: "Ocurrió un error al intentar enviar los recordatorios",
        variant: "destructive" 
      });
    },
  });

  const handleAddAsesorEmail = () => {
    if (asesorEmailPairs.length >= 5) {
      toast({ title: "Máximo 5 asesores permitidos", variant: "destructive" });
      return;
    }
    setAsesorEmailPairs([...asesorEmailPairs, { asesorId: "", email: "" }]);
  };

  const handleRemoveAsesorEmail = (index: number) => {
    setAsesorEmailPairs(asesorEmailPairs.filter((_, i) => i !== index));
  };

  const handleAsesorEmailChange = (index: number, field: "asesorId" | "email", value: string) => {
    const updated = [...asesorEmailPairs];
    updated[index] = { ...updated[index], [field]: value };
    setAsesorEmailPairs(updated);
  };

  const validateAsesorEmails = (): boolean => {
    // Check for duplicate asesores
    const asesorIds = asesorEmailPairs
      .filter(pair => pair.asesorId)
      .map(pair => pair.asesorId);
    const uniqueAsesorIds = new Set(asesorIds);
    
    if (asesorIds.length !== uniqueAsesorIds.size) {
      toast({ title: "Cada asesor solo puede tener un email asignado", variant: "destructive" });
      return false;
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Check for empty fields and validate email format
    for (const pair of asesorEmailPairs) {
      if (pair.asesorId && !pair.email) {
        toast({ title: "Todos los asesores deben tener un email", variant: "destructive" });
        return false;
      }
      if (!pair.asesorId && pair.email) {
        toast({ title: "Todos los emails deben tener un asesor asignado", variant: "destructive" });
        return false;
      }
      if (pair.email && !emailRegex.test(pair.email)) {
        toast({ title: `Email inválido para asesor: ${pair.email}`, variant: "destructive" });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate asesor emails
    if (!validateAsesorEmails()) {
      return;
    }

    // Filter out empty pairs
    const validPairs = asesorEmailPairs.filter(pair => pair.asesorId && pair.email);

    // Convert empty string to null for optional email field
    const dataToSubmit = {
      ...formData,
      emailRecordatorio: formData.emailRecordatorio.trim() || null,
      asesorEmails: validPairs.length > 0 ? validPairs : null,
    };
    updateMutation.mutate(dataToSubmit);
  };

  // Get available asesores for a specific dropdown (excluding already selected ones)
  const getAvailableAsesores = (currentIndex: number) => {
    const selectedAsesorIds = asesorEmailPairs
      .map((pair, idx) => idx !== currentIndex ? pair.asesorId : null)
      .filter(Boolean);
    
    return asesores?.filter(asesor => 
      asesor.activo && !selectedAsesorIds.includes(asesor.id)
    ) || [];
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Configuración de Seguimiento</h2>
        <p className="text-sm text-muted-foreground">
          Configuración de días entre seguimientos y emails para recordatorios por asesor
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Protocolo de Seguimiento</CardTitle>
          <CardDescription>
            Define los días entre cada fase del seguimiento a prospectos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="diasFase1">
                  Días para Seguimiento 1
                  <span className="text-xs text-muted-foreground ml-2">
                    (después del registro)
                  </span>
                </Label>
                <Input
                  id="diasFase1"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.diasFase1}
                  onChange={(e) => setFormData({ ...formData, diasFase1: parseInt(e.target.value) || 0 })}
                  required
                  data-testid="input-dias-fase1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diasFase2">
                  Días para Seguimiento 2
                  <span className="text-xs text-muted-foreground ml-2">
                    (después del Seguimiento 1)
                  </span>
                </Label>
                <Input
                  id="diasFase2"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.diasFase2}
                  onChange={(e) => setFormData({ ...formData, diasFase2: parseInt(e.target.value) || 0 })}
                  required
                  data-testid="input-dias-fase2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diasFase3">
                  Días para Seguimiento 3
                  <span className="text-xs text-muted-foreground ml-2">
                    (después del Seguimiento 2)
                  </span>
                </Label>
                <Input
                  id="diasFase3"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.diasFase3}
                  onChange={(e) => setFormData({ ...formData, diasFase3: parseInt(e.target.value) || 0 })}
                  required
                  data-testid="input-dias-fase3"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Emails de Recordatorio por Asesor</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Asigna un email a cada asesor para recibir recordatorios de seguimiento (máximo 5)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAsesorEmail}
                  disabled={asesorEmailPairs.length >= 5}
                  data-testid="button-add-asesor-email"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Asesor
                </Button>
              </div>

              {asesorEmailPairs.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                  No hay asesores configurados. Haz clic en "Agregar Asesor" para comenzar.
                </div>
              )}

              <div className="space-y-3">
                {asesorEmailPairs.map((pair, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`asesor-${index}`}>Asesor</Label>
                      <Select
                        value={pair.asesorId}
                        onValueChange={(value) => handleAsesorEmailChange(index, "asesorId", value)}
                      >
                        <SelectTrigger id={`asesor-${index}`} data-testid={`select-asesor-${index}`}>
                          <SelectValue placeholder="Seleccionar asesor" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableAsesores(index).map((asesor) => (
                            <SelectItem key={asesor.id} value={asesor.id}>
                              {asesor.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`email-${index}`}>Email</Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        value={pair.email}
                        onChange={(e) => handleAsesorEmailChange(index, "email", e.target.value)}
                        placeholder="ejemplo@boxisleep.com"
                        data-testid={`input-email-${index}`}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAsesorEmail(index)}
                      data-testid={`button-remove-asesor-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="emailRecordatorio">
                  Email General para Recordatorios (Opcional)
                  <span className="text-xs text-muted-foreground ml-2">
                    (se usará como fallback si un asesor no tiene email configurado)
                  </span>
                </Label>
                <Input
                  id="emailRecordatorio"
                  type="email"
                  value={formData.emailRecordatorio}
                  onChange={(e) => setFormData({ ...formData, emailRecordatorio: e.target.value })}
                  placeholder="ejemplo@boxisleep.com"
                  data-testid="input-email-recordatorio"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save-config"
              >
                {updateMutation.isPending ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Probar Recordatorios de Email</CardTitle>
          <CardDescription>
            Envía inmediatamente los recordatorios de seguimiento para prospectos con seguimientos programados para hoy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Este botón enviará un email a cada asesor con los prospectos que tienen seguimiento programado para hoy.
              </p>
              <p className="text-sm text-muted-foreground">
                Los recordatorios automáticos se envían diariamente a la 1:00 AM.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => triggerRemindersMutation.mutate()}
              disabled={triggerRemindersMutation.isPending}
              data-testid="button-test-reminders"
            >
              <Send className="w-4 h-4 mr-2" />
              {triggerRemindersMutation.isPending ? "Enviando..." : "Enviar Recordatorios Ahora"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
