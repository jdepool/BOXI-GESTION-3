import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface UploadZoneProps {
  recentUploads?: any[];
}

export default function UploadZone({ recentUploads }: UploadZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Archivo inválido",
          description: "Solo se aceptan archivos Excel (.xlsx, .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
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
      setSelectedFile(null);
      setSelectedChannel("");
      const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

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
        <h3 className="text-lg font-semibold mb-4 text-foreground">Cargar Archivo Excel</h3>
        
        <div className="upload-zone border-2 border-dashed border-border rounded-lg p-8 text-center mb-4 hover:border-primary hover:bg-primary/2 transition-all">
          <i className="fas fa-cloud-upload-alt text-4xl text-muted-foreground mb-4"></i>
          <p className="text-foreground font-medium mb-2">
            {selectedFile ? selectedFile.name : "Arrastra tu archivo aquí"}
          </p>
          <p className="text-muted-foreground text-sm mb-4">o haz clic para seleccionar</p>
          <input 
            type="file" 
            id="excel-upload" 
            accept=".xlsx,.xls" 
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

        <Button 
          className="w-full" 
          onClick={handleUpload}
          disabled={!selectedFile || !selectedChannel || isUploading}
          data-testid="upload-submit-button"
        >
          <i className="fas fa-upload mr-2"></i>
          {isUploading ? 'Cargando...' : 'Cargar Datos'}
        </Button>
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
