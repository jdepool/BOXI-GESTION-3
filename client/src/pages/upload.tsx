import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import UploadZone from "@/components/upload/upload-zone";
import { useQuery } from "@tanstack/react-query";

export default function Upload() {
  const { data: recentUploads } = useQuery<any[]>({
    queryKey: ["/api/uploads/recent"],
  });

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Cargar Datos"
          description="Importar archivos Excel de ventas"
        />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            <UploadZone recentUploads={recentUploads} />
          </div>
        </div>
      </main>
    </div>
  );
}
