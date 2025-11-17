import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Trash2, ExternalLink, Copy, Filter } from "lucide-react";
import { format } from "date-fns";

type GuestScope = {
  despacho?: string[];
  inventario?: string[];
};

type GuestToken = {
  id: string;
  token: string;
  scopes: GuestScope;
  expiresAt: string | null;
  isRevoked: boolean;
  issuedBy: string;
  createdAt: string;
};

type AuditLog = {
  id: string;
  actorType: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  fieldChanges: Record<string, any>;
  ipAddress: string | null;
  timestamp: string;
};

export function GuestAccessTab() {
  const { toast } = useToast();
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<{ despacho: boolean; inventario: boolean }>({
    despacho: false,
    inventario: false,
  });
  const [generatedUrls, setGeneratedUrls] = useState<{ despacho?: string; inventario?: string }>({});
  
  // Audit log filters
  const [auditFilters, setAuditFilters] = useState({
    entityType: "all",
    startDate: "",
    endDate: "",
  });

  // Fetch active tokens
  const { data: tokens = [], isLoading: tokensLoading } = useQuery<GuestToken[]>({
    queryKey: ["/api/admin/guest-tokens"],
  });

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: auditLogsLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs", auditFilters],
  });

  // Generate token mutation
  const generateTokenMutation = useMutation<{ token: string }, Error, GuestScope>({
    mutationFn: async (scopes: GuestScope) => {
      const res = await apiRequest("/api/admin/guest-tokens", "POST", scopes);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guest-tokens"] });
      const baseUrl = window.location.origin;
      const urls: { despacho?: string; inventario?: string } = {};
      
      if (selectedScopes.despacho) {
        urls.despacho = `${baseUrl}/guest/despacho?token=${data.token}`;
      }
      if (selectedScopes.inventario) {
        urls.inventario = `${baseUrl}/guest/inventario?token=${data.token}`;
      }
      
      setGeneratedUrls(urls);
      toast({
        title: "Token generado",
        description: "El enlace de acceso de invitado ha sido generado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el token",
        variant: "destructive",
      });
    },
  });

  // Revoke token mutation
  const revokeTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      await apiRequest(`/api/admin/guest-tokens/${tokenId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guest-tokens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({
        title: "Token revocado",
        description: "El token de acceso ha sido revocado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo revocar el token",
        variant: "destructive",
      });
    },
  });

  const handleGenerateToken = () => {
    const scopes: GuestScope = {};
    if (selectedScopes.despacho) {
      scopes.despacho = ["fechaDespacho"];
    }
    if (selectedScopes.inventario) {
      scopes.inventario = ["edit"];
    }
    generateTokenMutation.mutate(scopes);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "El enlace ha sido copiado al portapapeles.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Generate Token Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generar Acceso de Invitado</CardTitle>
          <CardDescription>
            Crea un enlace de acceso temporal para usuarios externos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-generate-guest-token">
                <UserPlus className="h-4 w-4 mr-2" />
                Generar Nuevo Token
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurar Acceso de Invitado</DialogTitle>
                <DialogDescription>
                  Selecciona los permisos que tendrá este usuario invitado
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="despacho-scope"
                    checked={selectedScopes.despacho}
                    onCheckedChange={(checked) =>
                      setSelectedScopes((prev) => ({ ...prev, despacho: !!checked }))
                    }
                    data-testid="checkbox-scope-despacho"
                  />
                  <Label htmlFor="despacho-scope" className="cursor-pointer">
                    <div className="font-medium">Despacho</div>
                    <div className="text-sm text-muted-foreground">
                      Permite editar solo la fecha de despacho
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inventario-scope"
                    checked={selectedScopes.inventario}
                    onCheckedChange={(checked) =>
                      setSelectedScopes((prev) => ({ ...prev, inventario: !!checked }))
                    }
                    data-testid="checkbox-scope-inventario"
                  />
                  <Label htmlFor="inventario-scope" className="cursor-pointer">
                    <div className="font-medium">Inventario</div>
                    <div className="text-sm text-muted-foreground">
                      Permite editar inventario (excepto costos y precios)
                    </div>
                  </Label>
                </div>

                {(generatedUrls.despacho || generatedUrls.inventario) && (
                  <div className="mt-6 p-4 bg-muted rounded-lg space-y-4">
                    {generatedUrls.despacho && (
                      <div>
                        <Label>Enlace de Acceso - Despacho</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input value={generatedUrls.despacho} readOnly data-testid="input-generated-url-despacho" />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(generatedUrls.despacho!)}
                            data-testid="button-copy-url-despacho"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => window.open(generatedUrls.despacho, "_blank")}
                            data-testid="button-open-url-despacho"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {generatedUrls.inventario && (
                      <div>
                        <Label>Enlace de Acceso - Inventario</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input value={generatedUrls.inventario} readOnly data-testid="input-generated-url-inventario" />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(generatedUrls.inventario!)}
                            data-testid="button-copy-url-inventario"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => window.open(generatedUrls.inventario, "_blank")}
                            data-testid="button-open-url-inventario"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsGenerateDialogOpen(false);
                    setGeneratedUrls({});
                    setSelectedScopes({ despacho: false, inventario: false });
                  }}
                  data-testid="button-cancel-token"
                >
                  {(generatedUrls.despacho || generatedUrls.inventario) ? "Cerrar" : "Cancelar"}
                </Button>
                {!(generatedUrls.despacho || generatedUrls.inventario) && (
                  <Button
                    onClick={handleGenerateToken}
                    disabled={!selectedScopes.despacho && !selectedScopes.inventario}
                    data-testid="button-confirm-token"
                  >
                    Generar Token
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Active Tokens Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tokens Activos</CardTitle>
          <CardDescription>Lista de tokens de acceso de invitado actualmente válidos</CardDescription>
        </CardHeader>
        <CardContent>
          {tokensLoading ? (
            <div className="text-center py-4">Cargando...</div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No hay tokens activos
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Emitido Por</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <TableCell data-testid={`text-token-created-${token.id}`}>
                      {format(new Date(token.createdAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {token.scopes.despacho && (
                          <Badge variant="outline" data-testid={`badge-scope-despacho-${token.id}`}>
                            Despacho
                          </Badge>
                        )}
                        {token.scopes.inventario && (
                          <Badge variant="outline" data-testid={`badge-scope-inventario-${token.id}`}>
                            Inventario
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={token.isRevoked ? "destructive" : "default"}
                        data-testid={`badge-status-${token.id}`}
                      >
                        {token.isRevoked ? "Revocado" : "Activo"}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-issued-by-${token.id}`}>
                      {token.issuedBy}
                    </TableCell>
                    <TableCell className="text-right">
                      {!token.isRevoked && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => revokeTokenMutation.mutate(token.id)}
                          data-testid={`button-revoke-${token.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Revocar
                        </Button>
                      )}
                    </TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs Section */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Auditoría</CardTitle>
          <CardDescription>Historial de todas las acciones realizadas por invitados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Tipo de Entidad</Label>
              <Select
                value={auditFilters.entityType}
                onValueChange={(value) =>
                  setAuditFilters((prev) => ({ ...prev, entityType: value === "all" ? "" : value }))
                }
              >
                <SelectTrigger data-testid="select-entity-type">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sale">Ventas</SelectItem>
                  <SelectItem value="inventario">Inventario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={auditFilters.startDate}
                onChange={(e) =>
                  setAuditFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
                data-testid="input-start-date"
              />
            </div>
            <div className="flex-1">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={auditFilters.endDate}
                onChange={(e) =>
                  setAuditFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
                data-testid="input-end-date"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setAuditFilters({ entityType: "all", startDate: "", endDate: "" })}
              data-testid="button-clear-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>

          {auditLogsLoading ? (
            <div className="text-center py-4">Cargando...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No hay registros de auditoría
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>ID Entidad</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Cambios</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <TableCell data-testid={`text-timestamp-${log.id}`}>
                      {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-entity-type-${log.id}`}>
                        {log.entityType}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-entity-id-${log.id}`}>
                      {log.entityId}
                    </TableCell>
                    <TableCell data-testid={`text-action-${log.id}`}>{log.action}</TableCell>
                    <TableCell data-testid={`text-changes-${log.id}`}>
                      <div className="text-xs max-w-xs truncate">
                        {JSON.stringify(log.fieldChanges)}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-ip-${log.id}`}>
                      {log.ipAddress || "-"}
                    </TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
