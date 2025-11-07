import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Power, Clock, CheckCircle, XCircle, Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import type { CasheaAutomationConfig, CasheaAutomaticDownload } from "@shared/schema";
import * as XLSX from 'xlsx';

// Helper function to safely parse YYYY-MM-DD as local date
const parseLocalDate = (dateString: string) => {
  if (!dateString) return undefined;
  return parse(dateString, 'yyyy-MM-dd', new Date());
};

interface UploadZoneProps {
  recentUploads?: any[];
  showOnlyCashea?: boolean;
}

export default function UploadZone({ recentUploads, showOnlyCashea = false }: UploadZoneProps) {
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [isShowingPreview, setIsShowingPreview] = useState(false);
  
  // CASHEA download state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isDownloadingCashea, setIsDownloadingCashea] = useState(false);
  const [casheaPreviewData, setCasheaPreviewData] = useState<any[] | null>(null);
  const [isShowingCasheaPreview, setIsShowingCasheaPreview] = useState(false);
  
  // Historical import state
  const [historicalFile, setHistoricalFile] = useState<File | null>(null);
  const [historicalPreview, setHistoricalPreview] = useState<any[] | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isPreviewingHistorical, setIsPreviewingHistorical] = useState(false);
  const [isImportingHistorical, setIsImportingHistorical] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  
  const { toast } = useToast();

  // Fetch canales data for the dropdown
  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean }>>({
    queryKey: ["/api/admin/canales"],
  });

  // Automation config query
  const { data: automationConfig, isLoading: isLoadingConfig, error: configError } = useQuery<CasheaAutomationConfig>({
    queryKey: ['/api/cashea/automation/config'],
    enabled: showOnlyCashea || !showOnlyCashea, // Always fetch when CASHEA tab is available
  });

  // Automation history query
  const { data: automationHistory, isLoading: isLoadingHistory, error: historyError } = useQuery<CasheaAutomaticDownload[]>({
    queryKey: ['/api/cashea/automation/history'],
    enabled: showOnlyCashea || !showOnlyCashea,
  });

  // Update automation config mutation
  const updateAutomationMutation = useMutation({
    mutationFn: async ({ enabled, frequency, portal }: { enabled: boolean; frequency: string; portal?: string }) => {
      const res = await apiRequest('PUT', '/api/cashea/automation/config', { enabled, frequency, portal });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cashea/automation/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cashea/automation/history'] });
      toast({
        title: "Configuración actualizada",
        description: "La automatización se ha configurado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar configuración",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manual 24-hour download mutation
  const downloadNowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/cashea/automation/download-now', {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cashea/automation/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/orders'] });
      toast({
        title: "Descarga completada",
        description: `${data.recordsProcessed} nuevos registros procesados${data.duplicatesIgnored > 0 ? `, ${data.duplicatesIgnored} duplicados ignorados` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error en la descarga",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateAndSetFile = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      toast({
        title: "Archivo inválido",
        description: "Solo se aceptan archivos Excel (.xlsx, .xls) y CSV (.csv)",
        variant: "destructive",
      });
      return false;
    }
    setSelectedFile(file);
    generatePreview(file);
    return true;
  };

  const generatePreview = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      let data: any[][] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const text = new TextDecoder().decode(arrayBuffer);
        const lines = text.split('\n');
        data = lines.slice(0, 6).map(line => line.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1')));
      } else {
        // Parse Excel
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        data = jsonData.slice(0, 6) as any[][];
      }

      setPreviewData(data);
      setIsShowingPreview(true);
    } catch (error) {
      toast({
        title: "Error al generar preview",
        description: "No se pudo leer el contenido del archivo",
        variant: "destructive",
      });
      setPreviewData(null);
      setIsShowingPreview(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      validateAndSetFile(file);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setSelectedChannel("");
    setPreviewData(null);
    setIsShowingPreview(false);
    const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const confirmUpload = async () => {
    if (!selectedFile || !selectedChannel) {
      toast({
        title: "Información faltante",
        description: "Selecciona un archivo y un canal de ventas",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('canal', selectedChannel);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error uploading file');
      }

      const result = await response.json();

      toast({
        title: "Archivo cargado exitosamente",
        description: `${result.recordsProcessed} registros procesados correctamente`,
      });

      // Reset form
      resetUpload();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/uploads/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });

    } catch (error) {
      toast({
        title: "Error al cargar archivo",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetCashea = () => {
    setStartDate("");
    setEndDate("");
    setCasheaPreviewData(null);
    setIsShowingCasheaPreview(false);
  };

  const generateCasheaPreview = (data: any[]) => {
    // Convert CASHEA data to preview format similar to file preview
    if (!data || data.length === 0) {
      setCasheaPreviewData(null);
      setIsShowingCasheaPreview(false);
      return;
    }
    
    // Take first 5 records for preview
    const previewRecords = data.slice(0, 5);
    const previewData = [
      // Header row
      ['Orden', 'Cliente', 'Email', 'Total USD', 'Fecha', 'Canal'],
      // Data rows
      ...previewRecords.map(record => [
        record.orden || '',
        record.nombre || '',
        record.email || '',
        record.totalUsd || '',
        record.fecha || '',
        'cashea'
      ])
    ];
    
    setCasheaPreviewData(previewData);
    setIsShowingCasheaPreview(true);
  };

  const downloadCasheaData = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Fechas requeridas",
        description: "Selecciona las fechas de inicio y fin",
        variant: "destructive",
      });
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      toast({
        title: "Rango de fechas inválido",
        description: "La fecha de inicio debe ser anterior a la fecha de fin",
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingCashea(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 15;
        });
      }, 300);

      const response = await fetch('/api/cashea/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Error downloading CASHEA data');
      }

      const result = await response.json();

      // Generate preview of downloaded data
      generateCasheaPreview(result.data);

      toast({
        title: "Datos CASHEA descargados exitosamente",
        description: `${result.recordsProcessed} registros procesados. ${result.duplicatesIgnored > 0 ? `${result.duplicatesIgnored} duplicados ignorados.` : ''}`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/uploads/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });

    } catch (error) {
      toast({
        title: "Error al descargar datos CASHEA",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive",
      });
    } finally {
      setIsDownloadingCashea(false);
      setUploadProgress(0);
    }
  };

  // Handlers for automation config
  const handleAutomationToggle = (enabled: boolean) => {
    if (!automationConfig) return; // Wait for config to load
    const frequency = automationConfig.frequency;
    const portal = automationConfig.portal;
    updateAutomationMutation.mutate({ enabled, frequency, portal });
  };

  const handleFrequencyChange = (frequency: string) => {
    if (!automationConfig) return; // Wait for config to load
    const enabled = automationConfig.enabled;
    const portal = automationConfig.portal;
    updateAutomationMutation.mutate({ enabled, frequency, portal });
  };

  const handlePortalChange = (portal: string) => {
    if (!automationConfig) return; // Wait for config to load
    const enabled = automationConfig.enabled;
    const frequency = automationConfig.frequency;
    updateAutomationMutation.mutate({ enabled, frequency, portal });
  };

  // Historical import handlers
  const handleHistoricalFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Archivo inválido",
        description: "Solo se aceptan archivos Excel (.xlsx, .xls)",
        variant: "destructive",
      });
      return;
    }

    setHistoricalFile(file);
    setHistoricalPreview(null);
    setSelectedRows(new Set());
  };

  const handleHistoricalPreview = async () => {
    if (!historicalFile) {
      toast({
        title: "Archivo requerido",
        description: "Selecciona un archivo Excel para previsualizar",
        variant: "destructive",
      });
      return;
    }

    setIsPreviewingHistorical(true);

    try {
      const formData = new FormData();
      formData.append('file', historicalFile);

      const response = await fetch('/api/sales/import/preview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al generar vista previa');
      }

      const result = await response.json();
      setHistoricalPreview(result.preview);
      setSelectedRows(new Set());

      toast({
        title: "Vista previa generada",
        description: `${result.preview.length} registros encontrados`,
      });
    } catch (error) {
      toast({
        title: "Error al generar vista previa",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive",
      });
    } finally {
      setIsPreviewingHistorical(false);
    }
  };

  const handleSelectAll = () => {
    if (!historicalPreview) return;
    const allIndices = new Set(historicalPreview.map((_, index) => index));
    setSelectedRows(allIndices);
  };

  const handleDeselectAll = () => {
    setSelectedRows(new Set());
  };

  const handleRowToggle = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleHistoricalImport = async () => {
    if (!historicalPreview || selectedRows.size === 0) {
      toast({
        title: "Selección requerida",
        description: "Selecciona al menos un registro para importar",
        variant: "destructive",
      });
      return;
    }

    setIsImportingHistorical(true);

    try {
      const selectedData = Array.from(selectedRows).map(index => historicalPreview[index]);

      const response = await fetch('/api/sales/import/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          records: selectedData,
          replaceExisting: replaceExisting 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (result.error === "Validation errors found" && result.details) {
          const errorMessages = result.details.slice(0, 5).map((err: any) => 
            `Fila ${err.row} (Orden: ${err.orden || 'N/A'}): ${JSON.stringify(err.error)}`
          ).join('\n');
          
          toast({
            title: `Error de validación (${result.totalErrors} errores)`,
            description: errorMessages,
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(result.message || result.error || 'Error al importar datos');
      }

      toast({
        title: "Importación exitosa",
        description: `${result.recordsImported} registros importados correctamente`,
      });

      // Reset form
      setHistoricalFile(null);
      setHistoricalPreview(null);
      setSelectedRows(new Set());
      const fileInput = document.getElementById('historical-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/uploads/recent'] });

    } catch (error) {
      toast({
        title: "Error al importar",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive",
      });
    } finally {
      setIsImportingHistorical(false);
    }
  };

  // Frequency options
  const frequencyOptions = [
    { value: '30 minutes', label: 'Cada 30 minutos' },
    { value: '1 hour', label: 'Cada 1 hora' },
    { value: '2 hours', label: 'Cada 2 horas' },
    { value: '4 hours', label: 'Cada 4 horas' },
    { value: '8 hours', label: 'Cada 8 horas' },
    { value: '16 hours', label: 'Cada 16 horas' },
    { value: '24 hours', label: 'Cada 24 horas' },
  ];

  // CASHEA Download Content Component
  const casheaContent = (
    <div className="space-y-6 mt-6">
      {/* Automation Section */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Power className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-semibold text-foreground">Descarga Automática</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Descarga de ambos portales (Cashea y Cashea MP)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLoadingConfig && automationConfig?.enabled && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Activa
              </Badge>
            )}
            {isLoadingConfig ? (
              <div className="h-5 w-10 bg-muted animate-pulse rounded" />
            ) : (
              <Switch
                checked={automationConfig?.enabled || false}
                onCheckedChange={handleAutomationToggle}
                disabled={isLoadingConfig || !!configError || updateAutomationMutation.isPending}
                data-testid="automation-toggle"
              />
            )}
          </div>
        </div>

        {configError && (
          <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
            Error al cargar configuración: {configError instanceof Error ? configError.message : 'Error desconocido'}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label className="text-sm">Frecuencia de Descarga</Label>
            {isLoadingConfig ? (
              <div className="h-10 bg-muted animate-pulse rounded mt-1" />
            ) : (
              <Select
                value={automationConfig?.frequency || '2 hours'}
                onValueChange={handleFrequencyChange}
                disabled={!automationConfig?.enabled || isLoadingConfig || !!configError || updateAutomationMutation.isPending}
              >
                <SelectTrigger className="mt-1" data-testid="frequency-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="mt-4">
            <Button
              onClick={() => downloadNowMutation.mutate()}
              disabled={downloadNowMutation.isPending}
              className="w-full"
              variant="outline"
              data-testid="button-download-now"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadNowMutation.isPending ? 'Descargando...' : 'Descarga ahora'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Descarga pedidos de las últimas 24 horas (sin esperar el periodo programado)
            </p>
          </div>

          <div className="mt-4">
            <Label className="text-sm mb-2 block">Últimas Descargas Automáticas</Label>
            {isLoadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : historyError ? (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                Error al cargar historial
              </div>
            ) : automationHistory && automationHistory.length > 0 ? (
              <div className="space-y-2">
                {automationHistory.slice(0, 5).map((download: any) => (
                  <div
                    key={download.id}
                    className="flex items-center justify-between p-2 bg-background rounded border border-border text-xs"
                    data-testid={`auto-download-${download.id}`}
                  >
                    <div className="flex items-center gap-2">
                      {download.status === 'success' ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span className="text-muted-foreground">
                        {download.downloadedAt && !isNaN(new Date(download.downloadedAt).getTime()) 
                          ? format(new Date(download.downloadedAt), 'dd/MM/yyyy HH:mm')
                          : 'Fecha inválida'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {download.status === 'success' ? (
                        <span className="text-foreground">{download.recordsCount} registros</span>
                      ) : (
                        <span className="text-red-600 truncate max-w-[200px]" title={download.errorMessage}>
                          {download.errorMessage || 'Error'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground text-center">
                No hay descargas automáticas aún
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Download Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-foreground">Descarga Manual</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fecha de Inicio</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
                data-testid="start-date-input"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(parseLocalDate(startDate) || new Date(), "dd/MM/yyyy") : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseLocalDate(startDate)}
                onSelect={(date) => {
                  if (date) {
                    setStartDate(format(date, "yyyy-MM-dd"));
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label>Fecha de Fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
                data-testid="end-date-input"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(parseLocalDate(endDate) || new Date(), "dd/MM/yyyy") : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseLocalDate(endDate)}
                onSelect={(date) => {
                  if (date) {
                    setEndDate(format(date, "yyyy-MM-dd"));
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 border border-border">
        <div className="flex items-center space-x-2 mb-2">
          <i className="fas fa-info-circle text-primary"></i>
          <span className="text-sm font-medium">Información CASHEA</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecciona un rango de fechas para descargar órdenes desde CASHEA. 
          Los datos se integrarán automáticamente en tu Lista de Ventas con estado "En proceso".
          Se evitarán duplicados basados en número de orden.
        </p>
      </div>

      {(isUploading || isDownloadingCashea) && (
        <div className="bg-secondary rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-3">
            <i className="fas fa-spinner fa-spin text-primary"></i>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Descargando datos CASHEA...</p>
              <Progress value={uploadProgress} className="mt-2" />
            </div>
          </div>
        </div>
      )}

        <div className="space-y-3">
          <Button 
            onClick={downloadCasheaData}
            disabled={!startDate || !endDate || isDownloadingCashea}
            className="w-full"
            data-testid="cashea-download-button"
          >
            {isDownloadingCashea ? "Descargando..." : "Descargar Datos CASHEA"}
          </Button>
          <Button 
            variant="outline" 
            onClick={resetCashea}
            disabled={isDownloadingCashea}
            className="w-full"
            data-testid="reset-cashea-button"
          >
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          {showOnlyCashea ? "Descargar CASHEA" : "Cargar Datos"}
        </h3>
        
        {showOnlyCashea ? (
          casheaContent
        ) : (
          <Tabs defaultValue="cashea" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cashea">Descargar CASHEA</TabsTrigger>
              <TabsTrigger value="file">Cargar Archivo</TabsTrigger>
              <TabsTrigger value="historical">Importar Histórico</TabsTrigger>
            </TabsList>
          
          <TabsContent value="file" className="space-y-4 mt-6">
            <div 
              className={`upload-zone border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-all cursor-pointer ${
                isDragOver 
                  ? 'border-primary bg-primary/10 scale-105' 
                  : 'border-border hover:border-primary hover:bg-primary/2'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('excel-upload')?.click()}
            >
              <i className="fas fa-cloud-upload-alt text-4xl text-muted-foreground mb-4"></i>
              <p className="text-foreground font-medium mb-2">
                {selectedFile ? selectedFile.name : "Arrastra tu archivo aquí"}
              </p>
              <p className="text-muted-foreground text-sm mb-4">o haz clic para seleccionar</p>
              <input 
                type="file" 
                id="excel-upload" 
                accept=".xlsx,.xls,.csv" 
                className="hidden"
                onChange={handleFileSelect}
                data-testid="file-input"
              />
              <label htmlFor="excel-upload" className="inline-block">
                <Button variant="outline" asChild>
                  <span data-testid="file-select-button">Seleccionar Archivo</span>
                </Button>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Canal de Ventas</label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger data-testid="channel-select">
                  <SelectValue placeholder="Seleccionar canal..." />
                </SelectTrigger>
                <SelectContent>
                  {canales
                    .filter(canal => canal.activo !== false)
                    .map(canal => (
                      <SelectItem key={canal.id} value={canal.nombre.toLowerCase()}>
                        {canal.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {(isUploading || isDownloadingCashea) && (
              <div className="bg-secondary rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <i className="fas fa-spinner fa-spin text-primary"></i>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {isUploading ? "Procesando archivo..." : "Descargando datos CASHEA..."}
                    </p>
                    <Progress value={uploadProgress} className="mt-2" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button 
                onClick={confirmUpload}
                disabled={!selectedFile || !selectedChannel || isUploading}
                className="flex-1"
                data-testid="upload-button"
              >
                {isUploading ? "Procesando..." : "Cargar Archivo"}
              </Button>
              <Button 
                variant="outline" 
                onClick={resetUpload}
                disabled={isUploading}
                data-testid="reset-button"
              >
                Limpiar
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="cashea" className="space-y-4 mt-6">
            {casheaContent}
          </TabsContent>

          <TabsContent value="historical" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="fas fa-info-circle text-primary"></i>
                  <span className="text-sm font-medium">Importación Histórica</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Selecciona un archivo Excel con datos históricos de ventas. 
                  Podrás previsualizar y seleccionar qué registros importar antes de confirmar.
                </p>
              </div>

              <div>
                <Label>Archivo Excel</Label>
                <div className="mt-2">
                  <input 
                    type="file" 
                    id="historical-upload" 
                    accept=".xlsx,.xls" 
                    className="hidden"
                    onChange={handleHistoricalFileSelect}
                    data-testid="historical-file-input"
                  />
                  <label htmlFor="historical-upload">
                    <Button variant="outline" asChild className="w-full">
                      <span data-testid="historical-file-select-button">
                        <i className="fas fa-file-excel mr-2"></i>
                        {historicalFile ? historicalFile.name : "Seleccionar Archivo Excel"}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              {historicalFile && (
                <Button 
                  onClick={handleHistoricalPreview}
                  disabled={isPreviewingHistorical}
                  className="w-full"
                  data-testid="button-preview-historical"
                >
                  {isPreviewingHistorical ? "Generando vista previa..." : "Generar Vista Previa"}
                </Button>
              )}

              {historicalPreview && historicalPreview.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-secondary rounded-lg p-4">
                    <h4 className="text-md font-medium text-foreground mb-3 flex items-center justify-between">
                      <span className="flex items-center">
                        <i className="fas fa-table mr-2 text-primary"></i>
                        Vista Previa de Registros
                      </span>
                      <Badge variant="secondary" data-testid="selected-count">
                        {selectedRows.size} de {historicalPreview.length} seleccionados
                      </Badge>
                    </h4>

                    <div className="flex gap-2 mb-3">
                      <Button 
                        onClick={handleSelectAll}
                        variant="outline"
                        size="sm"
                        data-testid="button-select-all"
                      >
                        Seleccionar Todos
                      </Button>
                      <Button 
                        onClick={handleDeselectAll}
                        variant="outline"
                        size="sm"
                        data-testid="button-deselect-all"
                      >
                        Deseleccionar Todos
                      </Button>
                    </div>

                    <div className="bg-background rounded border max-h-96 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <i className="fas fa-check-square"></i>
                            </TableHead>
                            <TableHead className="font-medium text-xs">Orden</TableHead>
                            <TableHead className="font-medium text-xs">Nombre</TableHead>
                            <TableHead className="font-medium text-xs">Fecha</TableHead>
                            <TableHead className="font-medium text-xs">Canal</TableHead>
                            <TableHead className="font-medium text-xs">Producto</TableHead>
                            <TableHead className="font-medium text-xs">Tipo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historicalPreview.map((row: any, index: number) => (
                            <TableRow key={index} data-testid={`historical-row-${index}`}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedRows.has(index)}
                                  onChange={() => handleRowToggle(index)}
                                  className="h-4 w-4 cursor-pointer"
                                  data-testid={`checkbox-row-${index}`}
                                />
                              </TableCell>
                              <TableCell className="text-xs py-2">{row.orden || ''}</TableCell>
                              <TableCell className="text-xs py-2">{row.nombre || ''}</TableCell>
                              <TableCell className="text-xs py-2">{row.fecha || ''}</TableCell>
                              <TableCell className="text-xs py-2">{row.canal || ''}</TableCell>
                              <TableCell className="text-xs py-2">{row.producto || ''}</TableCell>
                              <TableCell className="text-xs py-2">{row.tipo || ''}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border border-border">
                        <input
                          type="checkbox"
                          id="replace-existing"
                          checked={replaceExisting}
                          onChange={(e) => setReplaceExisting(e.target.checked)}
                          className="h-4 w-4 cursor-pointer"
                          data-testid="checkbox-replace-existing"
                        />
                        <Label 
                          htmlFor="replace-existing" 
                          className="text-sm cursor-pointer flex-1"
                        >
                          Reemplazar datos existentes con el mismo número de orden
                        </Label>
                      </div>
                      {replaceExisting && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            <i className="fas fa-exclamation-triangle mr-1"></i>
                            Al activar esta opción, todos los registros existentes con los mismos números de orden serán eliminados antes de importar los nuevos datos.
                          </p>
                        </div>
                      )}
                      <Button 
                        onClick={handleHistoricalImport}
                        disabled={selectedRows.size === 0 || isImportingHistorical}
                        className="w-full"
                        data-testid="button-import-selected"
                      >
                        {isImportingHistorical 
                          ? "Importando..." 
                          : `Importar Seleccionados (${selectedRows.size})`
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {isPreviewingHistorical && (
                <div className="bg-secondary rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-spinner fa-spin text-primary"></i>
                    <p className="text-sm font-medium text-foreground">
                      Generando vista previa...
                    </p>
                  </div>
                </div>
              )}

              {isImportingHistorical && (
                <div className="bg-secondary rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-spinner fa-spin text-primary"></i>
                    <p className="text-sm font-medium text-foreground">
                      Importando registros seleccionados...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        )}

        {/* File Preview Section */}
        {isShowingPreview && previewData && previewData.length > 0 && (
          <div className="bg-secondary rounded-lg p-4 mt-4">
            <h4 className="text-md font-medium text-foreground mb-3 flex items-center">
              <i className="fas fa-eye mr-2 text-primary"></i>
              Vista Previa del Archivo
            </h4>
            <div className="bg-background rounded border max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewData[0]?.map((header: any, index: number) => (
                      <TableHead key={index} className="font-medium text-xs">
                        {header || `Columna ${index + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(1, 6).map((row: any[], rowIndex: number) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell: any, cellIndex: number) => (
                        <TableCell key={cellIndex} className="text-xs py-2">
                          {cell || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Se muestran las primeras 5 filas de datos. El archivo contiene más registros.
            </p>
          </div>
        )}

        {/* CASHEA Preview Section */}
        {isShowingCasheaPreview && casheaPreviewData && casheaPreviewData.length > 0 && (
          <div className="bg-secondary rounded-lg p-4 mt-4">
            <h4 className="text-md font-medium text-foreground mb-3 flex items-center">
              <i className="fas fa-eye mr-2 text-primary"></i>
              Vista Previa de Datos CASHEA
            </h4>
            <div className="bg-background rounded border max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {casheaPreviewData[0]?.map((header: any, index: number) => (
                      <TableHead key={index} className="font-medium text-xs">
                        {header || `Columna ${index + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {casheaPreviewData.slice(1, 6).map((row: any[], rowIndex: number) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell: any, cellIndex: number) => (
                        <TableCell key={cellIndex} className="text-xs py-2">
                          {cell || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Se muestran las primeras 5 filas descargadas. Todos los registros han sido procesados y agregados a la Lista de Ventas.
            </p>
          </div>
        )}

      </div>

      {!showOnlyCashea && recentUploads && recentUploads.length > 0 && (
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Cargas Recientes</h3>
          
          <div className="space-y-3">
            {recentUploads.slice(0, 5).map((upload) => (
              <div key={upload.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-3">
                  <i className="fas fa-file-excel text-green-600"></i>
                  <div>
                    <p className="text-sm font-medium text-foreground">{upload.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(upload.uploadedAt).toLocaleDateString()} - {upload.recordsCount} registros
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={upload.status === 'success' ? 'default' : 'destructive'}
                  data-testid={`upload-status-${upload.id}`}
                >
                  {upload.status === 'success' ? 'Exitoso' : 'Error'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
