import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleToggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const getIcon = () => {
    if (theme === "dark") {
      return "fas fa-sun"; // Sun icon for switching to light mode
    }
    return "fas fa-moon"; // Moon icon for switching to dark mode
  };

  const getTooltipText = () => {
    if (theme === "dark") {
      return "Cambiar a tema claro";
    }
    return "Cambiar a tema oscuro";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={handleToggleTheme}
          className="bg-card border-2 border-primary/20 hover:bg-primary/10 hover:border-primary/40 text-foreground hover:text-primary transition-all duration-200 shadow-sm"
          data-testid="theme-toggle-button"
        >
          <i className={getIcon()}></i>
          <span className="sr-only">{getTooltipText()}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
}