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
      return "☀️"; // Sun emoji for switching to light mode
    }
    return "🌙"; // Moon emoji for switching to dark mode
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
          className="bg-primary text-primary-foreground px-3 py-2 rounded-md font-bold text-lg hover:bg-primary/90 transition-all duration-200 cursor-pointer shadow-md"
          data-testid="theme-toggle-button"
        >
          <span className="text-xl">{getIcon()}</span>
          <span className="sr-only">{getTooltipText()}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
}