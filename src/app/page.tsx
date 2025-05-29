
"use client";

import { useState, ChangeEvent } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Type } from "lucide-react"; // Using a generic text icon

export default function TextEditorPage() {
  const [inputText, setInputText] = useState<string>("");

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background text-foreground font-sans">
      <header className="mb-6 md:mb-8 text-center">
        <div className="inline-flex items-center justify-center gap-2 md:gap-3">
           <Type className="h-10 w-10 md:h-12 md:w-12 text-primary" />
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground bg-primary px-3 py-1 md:px-4 md:py-2 rounded-lg shadow-md">
            Deepak Text Editor
          </h1>
        </div>
        <p className="mt-2 md:mt-3 text-md md:text-lg text-muted-foreground">
          Your simple space for drafting and editing text.
        </p>
      </header>

      <div className="flex flex-col gap-4 md:gap-6 flex-grow items-center">
        <Card className="w-full md:w-3/4 lg:w-2/3 flex flex-col shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <Type className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              Your Text
            </CardTitle>
            <CardDescription className="text-sm">Enter or paste your content below.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-grow">
            <Textarea
              id="manual-text-input"
              placeholder="Start typing or paste your content here..."
              value={inputText}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
              className="flex-grow min-h-[250px] sm:min-h-[300px] md:min-h-[400px] text-base bg-card border-input focus:ring-primary"
              rows={15}
            />
          </CardContent>
        </Card>
      </div>
      <footer className="text-center mt-8 md:mt-12 py-4 text-xs md:text-sm text-muted-foreground">
        Deepak Text Editor &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
