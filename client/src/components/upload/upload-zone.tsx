import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

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
  
  const { toast } = useToast();

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

  // CASHEA Download Content Component
  const casheaContent = (
    <div className="space-y-4 mt-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start-date">Fecha de Inicio</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            data-testid="start-date-input"
          />
        </div>
        <div>
          <Label htmlFor="end-date">Fecha de Fin</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            data-testid="end-date-input"
          />
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 border border-border">
        <div className="flex items-center space-x-2 mb-2">
          <i className="fas fa-info-circle text-primary"></i>
          <span className="text-sm font-medium">Información CASHEA</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecciona un rango de fechas para descargar órdenes desde CASHEA. 
          Los datos se integrarán automáticamente en tu Lista de Ventas con estado "En Proceso".
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cashea">Descargar CASHEA</TabsTrigger>
              <TabsTrigger value="file">Cargar Archivo</TabsTrigger>
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
                  <SelectItem value="cashea">Cashea</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="treble">Treble</SelectItem>
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
