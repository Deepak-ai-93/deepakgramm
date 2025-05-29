
"use client";

import type { CheckContentErrorsOutput } from "@/ai/flows/check-content-errors";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import React, { useState, useEffect } from "react";

interface TextPart {
  id: string;
  text: string;
  isError: boolean;
  originalWord?: string;
  suggestions?: string[];
}

type InteractiveCorrectorProps = {
  text: string;
  aiSuggestions: CheckContentErrorsOutput["suggestions"];
  onTextChange: (newText: string) => void;
  className?: string;
};

// Helper to escape regex special characters
const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export function InteractiveCorrector({ text, aiSuggestions, onTextChange, className }: InteractiveCorrectorProps) {
  const [displayedParts, setDisplayedParts] = useState<TextPart[]>([]);

  useEffect(() => {
    const createSegments = (): TextPart[] => {
      const segments: TextPart[] = [];
      let currentIndex = 0;
      let partIdCounter = 0;

      const uniqueErrorWords = Array.from(new Set(aiSuggestions.map(s => s.word)));
      
      if (uniqueErrorWords.length === 0 || !text) {
        return [{ id: `part_${partIdCounter++}`, text: text || "", isError: false }];
      }
      
      // Sort by length descending to match longer words first if they are substrings
      const sortedErrorWords = uniqueErrorWords.sort((a, b) => b.length - a.length);
      const escapedErrorWords = sortedErrorWords.map(escapeRegex);
      const regex = new RegExp(`(${escapedErrorWords.join('|')})`, 'g');
      
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > currentIndex) {
          segments.push({
            id: `part_${partIdCounter++}`,
            text: text.substring(currentIndex, match.index),
            isError: false,
          });
        }
        const matchedWord = match[0];
        // Find the original suggestion detail (could be multiple if same word has different suggestions, though unlikely with current AI output structure)
        const suggestionDetails = aiSuggestions.find(s => s.word === matchedWord);
        segments.push({
          id: `error_${partIdCounter++}`,
          text: matchedWord,
          isError: true,
          originalWord: matchedWord,
          suggestions: suggestionDetails?.suggestions || [],
        });
        currentIndex = regex.lastIndex;
      }

      if (currentIndex < text.length) {
        segments.push({
          id: `part_${partIdCounter++}`,
          text: text.substring(currentIndex),
          isError: false,
        });
      }
      return segments.length > 0 ? segments : [{ id: `part_${partIdCounter++}`, text, isError: false }];
    };

    setDisplayedParts(createSegments());
  }, [text, aiSuggestions]);

  const handleSuggestionApply = (partId: string, newText: string) => {
    const updatedParts = displayedParts.map(part =>
      part.id === partId ? { ...part, text: newText, isError: false, suggestions: [] } : part
    );
    setDisplayedParts(updatedParts);
    const newFullText = updatedParts.map(p => p.text).join('');
    onTextChange(newFullText);
  };

  if (!text && aiSuggestions.length === 0) {
    return <div className={cn("p-4 border rounded-md bg-card text-card-foreground min-h-[200px] flex items-center justify-center", className)}>Enter text and click "Check Content" to see interactive corrections.</div>;
  }
  
  // If text exists, but no suggestions from AI, and displayedParts are all non-error (can happen if text is clean or AI provides no suggestions)
  if (text && aiSuggestions.length === 0 && displayedParts.every(p => !p.isError)) {
     return <div className={cn("p-4 border rounded-md bg-card text-card-foreground min-h-[200px] whitespace-pre-wrap leading-relaxed", className)}>{text}</div>;
  }


  return (
    <div className={cn("p-4 border rounded-md bg-card text-card-foreground min-h-[200px] whitespace-pre-wrap leading-relaxed", className)}>
      {displayedParts.map((part) =>
        part.isError && part.suggestions && part.suggestions.length > 0 ? (
          <Popover key={part.id}>
            <PopoverTrigger asChild>
              <span className="bg-accent/30 text-accent-foreground px-1 rounded-sm cursor-pointer hover:bg-accent/50 transition-colors relative group">
                {part.text}
                <ChevronDown className="w-3 h-3 inline-block ml-0.5 opacity-70 group-hover:opacity-100 transition-opacity" />
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 space-y-1 shadow-xl" side="bottom" align="start">
              <p className="text-xs text-muted-foreground mb-1 px-1">Suggestions for "{part.originalWord}":</p>
              {part.suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-auto py-1 px-2 text-sm"
                  onClick={() => handleSuggestionApply(part.id, suggestion)}
                >
                  <Check className="w-3.5 h-3.5 mr-2 text-green-400" />
                  {suggestion}
                </Button>
              ))}
               <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-auto py-1 px-2 text-sm text-muted-foreground"
                  onClick={() => handleSuggestionApply(part.id, part.originalWord || part.text)}
                >
                  Keep original
                </Button>
            </PopoverContent>
          </Popover>
        ) : (
          <span key={part.id}>{part.text}</span>
        )
      )}
    </div>
  );
}
