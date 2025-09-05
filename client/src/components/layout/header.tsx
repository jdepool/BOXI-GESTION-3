import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  title: string;
  description?: string;
}

export default function Header({ title, description }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border p-6 flex justify-between items-center">
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
        <Link href="/upload">
          <Button data-testid="upload-button">
            <i className="fas fa-plus mr-2"></i>
            Cargar Datos
          </Button>
        </Link>
      </div>
    </header>
  );
}
