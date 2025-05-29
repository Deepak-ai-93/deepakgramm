
"use client";

import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TypingSuggestionItemProps {
  suggestion: string;
  typingSpeed?: number;
  initialDelay?: number; // milliseconds before starting to type
  onFinishedTyping?: () => void; // Optional callback
  onClick?: (suggestion: string) => void; // Callback for when suggestion is clicked
}

export const TypingSuggestionItem: FC<TypingSuggestionItemProps> = ({
  suggestion,
  typingSpeed = 30, // Default typing speed in ms per character
  initialDelay = 0,
  onFinishedTyping,
  onClick,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const startTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset component state and clear timeouts when the suggestion prop changes
    setDisplayedText('');
    setCurrentIndex(0);
    setHasStarted(false);
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (suggestion && suggestion.length > 0) {
      startTimeoutRef.current = setTimeout(() => {
        setHasStarted(true);
      }, initialDelay);
    }

    return () => {
      // Cleanup timeouts on unmount or before re-running due to prop change
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [suggestion, initialDelay]);

  useEffect(() => {
    if (!hasStarted || currentIndex >= suggestion.length) {
      // If typing is complete for this suggestion
      if (hasStarted && currentIndex === suggestion.length && suggestion.length > 0) {
        onFinishedTyping?.();
      }
      return; // Stop if not started, or if suggestion is fully typed
    }

    // Typing effect logic
    typingTimeoutRef.current = setTimeout(() => {
      setDisplayedText((prev) => prev + suggestion[currentIndex]);
      setCurrentIndex((prev) => prev + 1);
    }, typingSpeed);

    return () => {
      // Cleanup typing timeout if effect re-runs or component unmounts
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [hasStarted, currentIndex, suggestion, typingSpeed, onFinishedTyping]);

  const handleClick = () => {
    if (onClick && currentIndex >= suggestion.length) { // Only allow click if fully typed
      onClick(suggestion);
    }
  };

  // Render placeholder if suggestion is empty or initial delay hasn't passed and no text is displayed
  // This helps maintain list item height and prevent layout shifts
  if (!hasStarted && !displayedText && !suggestion) {
    return <li className="min-h-[1.5em]">&nbsp;</li>; // Use 1.5em to match typical line height for button-like li
  }
  
  const isFullyTyped = currentIndex >= suggestion.length;

  return (
    <li
      className={cn(
        "min-h-[1.5em] p-1.5 rounded-md",
        isFullyTyped && onClick && "cursor-pointer hover:bg-accent/20 transition-colors",
        !isFullyTyped && "opacity-70" // Dim slightly if not fully typed
      )}
      onClick={handleClick}
      role={isFullyTyped && onClick ? "button" : undefined}
      tabIndex={isFullyTyped && onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (isFullyTyped && onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {displayedText || <>&nbsp;</>}
    </li>
  );
};

