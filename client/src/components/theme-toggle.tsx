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
          variant="default"
          size="icon"
          onClick={handleToggleTheme}
          className="bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary shadow-lg hover:shadow-xl transition-all duration-200 font-bold"
          data-testid="theme-toggle-button"
        >
          <i className={`${getIcon()} text-lg`}></i>
          <span className="sr-only">{getTooltipText()}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
}