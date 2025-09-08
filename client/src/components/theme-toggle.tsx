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
          className="text-gray-400 hover:text-gray-300 transition-colors duration-200 cursor-pointer p-1"
          data-testid="theme-toggle-button"
        >
          <span className="text-2xl">{getIcon()}</span>
          <span className="sr-only">{getTooltipText()}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
}