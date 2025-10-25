import { useState, useEffect, useRef } from "react";

/**
 * Custom hook for debounced search input
 * Prevents API calls on every keystroke by waiting for user to stop typing
 * 
 * @param initialValue - Initial search value
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Object with inputValue (for controlled input), debouncedValue (for API calls), and setInputValue
 */
export function useDebouncedSearch(initialValue: string = "", delay: number = 500) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      setDebouncedValue(inputValue);
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
