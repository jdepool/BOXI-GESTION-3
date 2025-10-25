import * as React from "react"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface QuickMessage {
  text: string;
  icon: React.ReactNode;
  tooltipText: string;
}

export interface AutoExpandingTextareaProps
  extends React.ComponentProps<"textarea"> {
  minRows?: number;
  maxRows?: number;
  maxLength?: number;
  showCharacterCount?: boolean;
  label?: string;
  quickMessages?: QuickMessage[];
}

const AutoExpandingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoExpandingTextareaProps
>(({ className, minRows = 5, maxRows = 10, maxLength, showCharacterCount = true, label, quickMessages, onChange, value, onBlur, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [rows, setRows] = React.useState(minRows);

  const handleResize = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset rows to minRows to get accurate scrollHeight
    textarea.rows = minRows;
    
    // Calculate the number of rows needed based on scrollHeight
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10) || 20;
    const calculatedRows = Math.ceil(textarea.scrollHeight / lineHeight);
    
    // Set rows within min and max bounds
    const newRows = Math.min(Math.max(calculatedRows, minRows), maxRows);
    setRows(newRows);
  }, [minRows, maxRows]);

  React.useEffect(() => {
    handleResize();
  }, [value, handleResize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleResize();
    onChange?.(e);
  };

  const handleQuickMessageClick = (messageText: string) => {
    const currentValue = typeof value === 'string' ? value : '';
    const newValue = currentValue.trim() 
      ? `${messageText}\n${currentValue}` 
      : messageText;
    
    // Create a synthetic event to trigger onChange
    const syntheticEvent = {
      target: { value: newValue },
      currentTarget: { value: newValue },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    onChange?.(syntheticEvent);
  };

  const currentLength = typeof value === 'string' ? value.length : 0;
  const isAtLimit = maxLength && currentLength >= maxLength * 0.9; // Red at 90% (450+ chars)
  const isNearLimit = maxLength && currentLength >= maxLength * 0.8 && currentLength < maxLength * 0.9; // Amber at 80-90% (400-449 chars)

  return (
    <div className="relative">
      {(label || quickMessages) && (
        <div className="flex items-center gap-2 mb-1">
          {label && <span className="text-sm font-medium">{label}</span>}
          {quickMessages && quickMessages.length > 0 && (
            <TooltipProvider>
              <div className="flex items-center gap-1">
                {quickMessages.map((msg, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleQuickMessageClick(msg.text)}
                        onMouseDown={(e) => e.preventDefault()}
                        className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-accent transition-colors"
                        data-testid={`button-quick-message-${idx}`}
                      >
                        {msg.icon}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{msg.tooltipText}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          )}
        </div>
      )}
      <textarea
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
          className
        )}
        ref={(node) => {
          textareaRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        rows={rows}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        maxLength={maxLength}
        {...props}
      />
      {showCharacterCount && maxLength && (
        <div className="flex justify-end mt-1">
          <span className={cn(
            "text-xs",
            isAtLimit ? "text-red-500 font-semibold" : isNearLimit ? "text-amber-500" : "text-muted-foreground"
          )}>
            {currentLength} / {maxLength}
          </span>
        </div>
      )}
    </div>
  )
})
AutoExpandingTextarea.displayName = "AutoExpandingTextarea"

export { AutoExpandingTextarea }
