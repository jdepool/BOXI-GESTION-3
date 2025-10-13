import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  title: string;
  description?: string;
}

export default function Header({ title, description }: HeaderProps) {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <header className="bg-card border-b border-border p-4 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <button 
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="notifications-button"
        >
          <i className="fas fa-bell"></i>
        </button>
        
        {user && (
          <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-border">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              disabled={isLoggingOut}
              data-testid="logout-button"
            >
              {isLoggingOut ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-sign-out-alt mr-2"></i>
              )}
              Salir
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
