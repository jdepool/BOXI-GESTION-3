import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SeguimientoConfig } from "@shared/schema";

export function SeguimientoConfigTab() {
  const [formData, setFormData] = useState({
    diasFase1: 2,
    diasFase2: 4,
    diasFase3: 7,
    emailRecordatorio: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery<SeguimientoConfig>({
    queryKey: ["/api/admin/seguimiento-config"],
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
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiRequest("PUT", "/api/admin/seguimiento-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seguimiento-config"] });
      toast({ title: "Configuración actualizada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar configuración", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Configuración de Seguimiento</h2>
        <p className="text-sm text-muted-foreground">
          Configuración de días entre seguimientos y email para recordatorios
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

            <div className="space-y-2">
              <Label htmlFor="emailRecordatorio">
                Email para Recordatorios
                <span className="text-xs text-muted-foreground ml-2">
                  (opcional - se usará para enviar recordatorios automáticos)
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
    </div>
  );
}
