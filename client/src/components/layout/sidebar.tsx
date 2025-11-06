import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import boxiSleepLogo from "@assets/image_1757033740709.png";

const navigationItems = [
  {
    href: "/sales",
    icon: "fas fa-table", 
    label: "Ventas Boxi",
    testId: "nav-ventas", // Keep test ID stable
  },
  {
    href: "/mompox",
    icon: "fas fa-shopping-bag",
    label: "Ventas Mompox",
  },
  {
    href: "/despachos",
    icon: "fas fa-truck",
    label: "Despachos",
  },
  {
    href: "/devoluciones",
    icon: "fas fa-undo",
    label: "Devoluciones/Cancelaciones",
  },
  {
    href: "/egresos",
    icon: "fas fa-dollar-sign",
    label: "Egresos",
  },
  {
    href: "/verificacion",
    icon: "fas fa-check-circle",
    label: "Verificación",
  },
  {
    href: "/reportes",
    icon: "fas fa-chart-bar",
    label: "Reportes",
  },
  {
    href: "/administracion",
    icon: "fas fa-cogs",
    label: "Administración",
  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-56 h-56 flex items-center justify-center">
            <img 
              src={boxiSleepLogo} 
              alt="BoxiSleep Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-lg font-bold text-foreground text-center">Sistema de Gestión</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href;
            
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
                    data-testid={item.testId || `nav-${item.label.toLowerCase().replace(' ', '-')}`}
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
