import { useState, useEffect, useRef } from "react";

/**
 * Custom hook for debounced search input
 * Prevents API calls on every keystroke by waiting for user to stop typing
 * Syncs with external filter value changes (e.g., when filters are cleared)
 * 
 * @param initialValue - Initial search value (syncs when changed externally)
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Object with inputValue (for controlled input), debouncedValue (for API calls), and setInputValue
 */
export function useDebouncedSearch(initialValue: string = "", delay: number = 500) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Sync with external filter changes (e.g., cleared filters)
  // Always sync when filter is explicitly cleared (empty string)
  // Otherwise, only sync if user is not actively typing
  useEffect(() => {
    const isFilterCleared = initialValue === "";
    if ((isFilterCleared || !isTypingRef.current) && initialValue !== inputValue) {
      setInputValue(initialValue);
      setDebouncedValue(initialValue);
      // Reset typing flag when filter is cleared
      if (isFilterCleared) {
        isTypingRef.current = false;
      }
    }
  }, [initialValue]);

  // Debounce inputValue changes
  useEffect(() => {
    // Mark that user is typing
    isTypingRef.current = true;
    
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      setDebouncedValue(inputValue);
      // Mark typing as done after debounce completes
      isTypingRef.current = false;
    }, delay);

    // Cleanup on unmount or when inputValue/delay changes
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [inputValue, delay]);

  return {
    inputValue,
    debouncedValue,
    setInputValue,
  };
}
