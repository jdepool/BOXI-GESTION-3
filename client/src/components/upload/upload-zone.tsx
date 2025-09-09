import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

interface UploadZoneProps {
  recentUploads?: any[];
}

export default function UploadZone({ recentUploads }: UploadZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [isShowingPreview, setIsShowingPreview] = useState(false);
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

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Cargar Archivo Excel/CSV</h3>
        
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

        {isUploading && (
          <div className="bg-secondary rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              <i className="fas fa-spinner fa-spin text-primary"></i>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Procesando archivo...</p>
                <Progress value={uploadProgress} className="mt-2" />
              </div>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {isShowingPreview && previewData && previewData.length > 0 && (
          <div className="bg-secondary rounded-lg p-4 mb-4">
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isShowingPreview ? (
            <>
              <Button 
                variant="outline"
                onClick={resetUpload}
                disabled={isUploading}
                className="flex-1"
                data-testid="cancel-upload-button"
              >
                <i className="fas fa-times mr-2"></i>
                Cancelar
              </Button>
              <Button 
                onClick={confirmUpload}
                disabled={!selectedFile || !selectedChannel || isUploading}
                className="flex-1"
                data-testid="confirm-upload-button"
              >
                <i className="fas fa-check mr-2"></i>
                Confirmar Carga
              </Button>
            </>
          ) : (
            <Button 
              className="w-full" 
              onClick={() => {
                if (!selectedFile || !selectedChannel) {
                  toast({
                    title: "Información faltante",
                    description: "Selecciona un archivo y un canal de ventas",
                    variant: "destructive",
                  });
                  return;
                }
                setIsShowingPreview(true);
              }}
              disabled={!selectedFile || !selectedChannel || isUploading}
              data-testid="preview-button"
            >
              <i className="fas fa-eye mr-2"></i>
              Ver Vista Previa
            </Button>
          )}
        </div>
      </div>

      {recentUploads && recentUploads.length > 0 && (
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
