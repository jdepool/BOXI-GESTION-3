import { Badge } from "@/components/ui/badge";
import { Package, Banknote } from "lucide-react";

interface NotesDisplayProps {
  notes: string | null;
  className?: string;
}

const BADGE_MESSAGES = [
  {
    text: "ENTREGADO EN TIENDA",
    icon: Package,
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700"
  },
  {
    text: "EFECTIVO CONTRA ENTREGA",
    icon: Banknote,
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 border-red-300 dark:border-red-700"
  }
];

export function NotesDisplay({ notes, className = "" }: NotesDisplayProps) {
  if (!notes) {
    return <span className="text-muted-foreground italic">Click para agregar nota</span>;
  }

  // Split notes into lines
  const lines = notes.split('\n');
  const badges: JSX.Element[] = [];
  const remainingLines: string[] = [];

  // Check each line to see if it matches a badge message
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    const matchedBadge = BADGE_MESSAGES.find(badge => badge.text === trimmedLine);
    
    if (matchedBadge) {
      const Icon = matchedBadge.icon;
      badges.push(
        <Badge 
          key={`badge-${index}`} 
          variant="outline" 
          className={`${matchedBadge.badgeClass} font-semibold mb-1`}
        >
          <Icon className="h-3 w-3 mr-1" />
          {matchedBadge.text}
        </Badge>
      );
    } else if (trimmedLine) {
      // Only add non-empty lines
      remainingLines.push(line);
    }
  });

  return (
    <div className={className}>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {badges}
        </div>
      )}
      {remainingLines.length > 0 && (
        <div className="break-words">
          {remainingLines.join('\n')}
        </div>
      )}
    </div>
  );
}
