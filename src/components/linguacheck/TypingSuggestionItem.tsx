
"use client";

import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';

interface TypingSuggestionItemProps {
  suggestion: string;
  typingSpeed?: number;
  initialDelay?: number; // milliseconds before starting to type
  onFinishedTyping?: () => void; // Optional callback
}

export const TypingSuggestionItem: FC<TypingSuggestionItemProps> = ({
  suggestion,
  typingSpeed = 30, // Default typing speed in ms per character
  initialDelay = 0,
  onFinishedTyping,
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

  // Render placeholder if suggestion is empty or initial delay hasn't passed and no text is displayed
  // This helps maintain list item height and prevent layout shifts
  if (!hasStarted && !displayedText && !suggestion) {
    return <li className="min-h-[1.2em]">&nbsp;</li>; // Use 1.2em to match typical line height
  }
  
  return <li className="min-h-[1.2em]">{displayedText || <>&nbsp;</>}</li>;
};
