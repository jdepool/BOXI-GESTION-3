import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    href: "/dashboard",
    icon: "fas fa-chart-line",
    label: "Dashboard",
  },
  {
    href: "/upload", 
    icon: "fas fa-upload",
    label: "Cargar Datos",
  },
  {
    href: "/sales",
    icon: "fas fa-table", 
    label: "Ventas",
  },
  {
    href: "/addresses",
    icon: "fas fa-map-marker-alt",
    label: "Direcciones",
  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-bed text-primary-foreground text-sm"></i>
          </div>
          <span className="text-xl font-bold text-foreground">BoxiSleep</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Sistema de Ventas</p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div 
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg transition-colors cursor-pointer",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <i className={item.icon}></i>
                    <span>{item.label}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <i className="fas fa-user text-secondary-foreground text-sm"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Admin User</p>
            <p className="text-xs text-muted-foreground truncate">Administrador</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
