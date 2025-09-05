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
        <button
          onClick={handleToggleTheme}
          className="text-primary font-bold text-sm hover:text-primary/80 transition-colors duration-200 cursor-pointer"
          data-testid="theme-toggle-button"
        >
          THEME
          <span className="sr-only">{getTooltipText()}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
}