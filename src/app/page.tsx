
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InteractiveCorrector } from "@/components/linguacheck/InteractiveCorrector";
import { checkContentErrors, CheckContentErrorsInput, CheckContentErrorsOutput } from "@/ai/flows/check-content-errors";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookText, LanguagesIcon } from "lucide-react";
import Image from 'next/image';

const languages = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi (हिन्दी)' },
  { value: 'gujarati', label: 'Gujarati (ગુજરાતી)' },
] as const;

type LanguageValue = typeof languages[number]['value'];

export default function LinguaCheckPage() {
  const [inputText, setInputText] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageValue>('english');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<CheckContentErrorsOutput | null>(null);
  // userModifiedText will store the state of the text being interactively corrected.
  // It's initialized with inputText when an API call is made, or when inputText changes before any API call.
  const [userModifiedText, setUserModifiedText] = useState<string>(""); 
  const { toast } = useToast();

  useEffect(() => {
    // If no API response yet, or if input text is cleared, userModifiedText should mirror inputText.
    if (!apiResponse || inputText === "") {
      setUserModifiedText(inputText);
    }
    // If there IS an apiResponse, userModifiedText is managed by InteractiveCorrector
    // and this effect should not overwrite its changes unless inputText itself is cleared.
  }, [inputText]);


  const handleSubmit = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter some text to check.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setApiResponse(null); 
    setUserModifiedText(inputText); // Initialize userModifiedText with the current input for the new check

    try {
      const input: CheckContentErrorsInput = { content: inputText, language: selectedLanguage };
      const result = await checkContentErrors(input);
      setApiResponse(result);
      toast({
        title: "Check Complete",
        description: "Errors and suggestions are now available.",
      });
    } catch (error) {
      console.error("Error checking content:", error);
      toast({
        title: "Error",
        description: "Failed to check content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background text-foreground font-sans">
      <header className="mb-6 md:mb-8 text-center">
        <div className="inline-flex items-center justify-center gap-2 md:gap-3">
           <BookText className="h-10 w-10 md:h-12 md:w-12 text-primary" />
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground bg-primary px-3 py-1 md:px-4 md:py-2 rounded-lg shadow-md">
            LinguaCheck
          </h1>
        </div>
        <p className="mt-2 md:mt-3 text-md md:text-lg text-muted-foreground">
          Your AI-powered assistant for flawless writing in multiple languages.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-grow">
        {/* Left Panel: Input */}
        <Card className="md:w-1/2 w-full flex flex-col shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <LanguagesIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              Input Your Text
            </CardTitle>
            <CardDescription className="text-sm">Paste your content below and select the language.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-grow">
            <Textarea
              placeholder="Start typing or paste your content here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-grow min-h-[200px] sm:min-h-[250px] md:min-h-[300px] text-base bg-card border-input focus:ring-primary"
              rows={12}
            />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
              <Select value={selectedLanguage} onValueChange={(value: LanguageValue) => setSelectedLanguage(value)}>
                <SelectTrigger className="w-full sm:w-auto sm:flex-grow-[0.5] bg-card border-input focus:ring-primary">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto sm:flex-grow-[0.5] text-base py-3">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Content"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel: Output */}
        <Card className="md:w-1/2 w-full flex flex-col shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl">Results & Corrections</CardTitle>
            <CardDescription className="text-sm">
              {apiResponse ? "Review suggestions or view the AI-corrected text." : "Results will appear here after checking."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {isLoading && !apiResponse && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary mb-4" />
                <p className="text-md md:text-lg">Analyzing your text...</p>
                <p className="text-sm">This might take a few moments.</p>
              </div>
            )}
            {!isLoading && !apiResponse && (
               <div className="flex flex-col items-center justify-center h-full text-center p-4 rounded-lg border-2 border-dashed border-input">
                 <Image src="https://placehold.co/200x150.png" alt="Placeholder illustration" width={200} height={150} className="opacity-60 rounded mb-4" data-ai-hint="analysis chart" />
                 <p className="text-muted-foreground text-md md:text-lg">Your content analysis will show up here.</p>
                 <p className="text-xs md:text-sm text-muted-foreground">Enter text on the left and click "Check Content".</p>
               </div>
            )}
            {apiResponse && (
              <Tabs defaultValue="interactive" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="interactive">Interactive Corrections</TabsTrigger>
                  <TabsTrigger value="ai-corrected">AI Corrected Text</TabsTrigger>
                </TabsList>
                <TabsContent value="interactive" className="flex-grow mt-4 overflow-y-auto">
                  <InteractiveCorrector
                    text={userModifiedText}
                    aiSuggestions={apiResponse.suggestions || []}
                    onTextChange={setUserModifiedText}
                    className="min-h-[200px] sm:min-h-[250px] md:min-h-[300px]"
                  />
                </TabsContent>
                <TabsContent value="ai-corrected" className="flex-grow mt-4">
                  <Textarea
                    readOnly
                    value={apiResponse.correctedContent}
                    className="h-full min-h-[200px] sm:min-h-[250px] md:min-h-[300px] text-base bg-card border-input focus:ring-0"
                    rows={12}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
      <footer className="text-center mt-8 md:mt-12 py-4 text-xs md:text-sm text-muted-foreground">
        LinguaCheck &copy; {new Date().getFullYear()} | Powered by Generative AI
      </footer>
    </div>
  );
}
