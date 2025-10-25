import * as React from "react"

import { cn } from "@/lib/utils"

export interface AutoExpandingTextareaProps
  extends React.ComponentProps<"textarea"> {
  minRows?: number;
  maxRows?: number;
}

const AutoExpandingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoExpandingTextareaProps
>(({ className, minRows = 5, maxRows = 10, onChange, value, ...props }, ref) => {
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

  return (
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
      {...props}
    />
  )
})
AutoExpandingTextarea.displayName = "AutoExpandingTextarea"

export { AutoExpandingTextarea }
