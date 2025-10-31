import { useState, useEffect, useRef } from "react";

/**
 * Custom hook for debounced search input
 * Prevents API calls on every keystroke by waiting for user to stop typing
 * 
 * @param initialValue - Initial search value (not synced after mount)
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Object with inputValue (for controlled input), debouncedValue (for API calls), and setInputValue
 */
export function useDebouncedSearch(initialValue: string = "", delay: number = 500) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  // Debounce inputValue changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [inputValue, delay]);

  return {
    inputValue,
    debouncedValue,
    setInputValue,
  };
}
