
"use client";

import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// import { Input } from "@/components/ui/input"; // Keep for potential future re-enablement
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardFooter
import { Accordion } from "@/components/ui/accordion"; // Keep for future
import { InteractiveCorrector } from "@/components/linguacheck/InteractiveCorrector";
import { checkContentErrors, CheckContentErrorsInput, CheckContentErrorsOutput } from "@/ai/flows/check-content-errors";
import { suggestContent, SuggestContentInput, SuggestContentOutput } from "@/ai/flows/suggest-content-flow";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LanguagesIcon, FileText, UploadCloud, BrainCircuit, Lightbulb, FileCheck2 } from "lucide-react";
import Image from 'next/image';
import mammoth from 'mammoth'; // Keep for potential future re-enablement
import { ScrollArea } from '@/components/ui/scroll-area';

const languages = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi (हिन्दी)' },
  { value: 'gujarati', label: 'Gujarati (ગુજરાતી)' },
] as const;

type LanguageValue = typeof languages[number]['value'];

interface ParagraphItem {
  id: string;
  originalText: string;
  apiResponse?: CheckContentErrorsOutput;
  isLoading: boolean;
  userModifiedText: string;
  previewText?: string; // Added for explicit preview before check
}

const BASE_PAGE_TITLE = 'Deepak Checker AI: AI-Powered Content Checker';
const MIN_WORDS_FOR_AUTO_SUGGESTIONS = 5;
const DEBOUNCE_DELAY = 1500; // 1.5 seconds

// Simple debounce function
function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const debouncedFunction = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
  debouncedFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  return debouncedFunction;
}


export default function LinguaCheckPage() {
  const [inputText, setInputText] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageValue>('english');
  
  const [isLoadingGrammar, setIsLoadingGrammar] = useState<boolean>(false);
  const [grammarApiResponse, setGrammarApiResponse] = useState<CheckContentErrorsOutput | null>(null);
  const [userModifiedText, setUserModifiedText] = useState<string>("");

  const [isSuggestingContent, setIsSuggestingContent] = useState<boolean>(false);
  const [contentSuggestions, setContentSuggestions] = useState<string[] | null>(null);

  // DOCX related states are effectively unused with current UI
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedParagraphs, setParsedParagraphs] = useState<ParagraphItem[]>([]);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);
  const [isCheckingAll, setIsCheckingAll] = useState<boolean>(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!grammarApiResponse || inputText === "") {
      setUserModifiedText(inputText);
    }
  }, [inputText, grammarApiResponse]);

  useEffect(() => {
    document.title = '🧠 ' + BASE_PAGE_TITLE; // AI is always on for manual input now
  }, []);

  const handleGrammarCheckSubmit = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter some text to check for grammar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingGrammar(true);
    setGrammarApiResponse(null);
    setUserModifiedText(inputText); 
    // contentSuggestions are not cleared here, user might want to see them alongside grammar
    try {
      const input: CheckContentErrorsInput = { content: userModifiedText, language: selectedLanguage }; // Use userModifiedText
      const result = await checkContentErrors(input);
      setGrammarApiResponse(result);
      if (result.correctedContent) {
        setUserModifiedText(result.correctedContent);
      }
      toast({
        title: "Grammar Check Complete",
        description: "Errors and suggestions are now available.",
      });
    } catch (error) {
      console.error("Error checking grammar:", error);
      toast({
        title: "Error",
        description: "Failed to check grammar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGrammar(false);
    }
  };

  // Core logic for fetching suggestions, used by both manual button and debounced call
  const fetchContentSuggestions = async (textToSuggestFor: string, lang: LanguageValue, showToastOnSuccess: boolean) => {
    if (!textToSuggestFor.trim()) {
      setContentSuggestions(null);
      setIsSuggestingContent(false);
      return;
    }
    setIsSuggestingContent(true);
    // setContentSuggestions(null); // Clear previous ones immediately
    // setGrammarApiResponse(null); // Clear grammar if getting new suggestions for the same text
    
    try {
      const input: SuggestContentInput = { content: textToSuggestFor, language: lang };
      const result = await suggestContent(input);
      setContentSuggestions(result.suggestions);
      if (showToastOnSuccess) {
        toast({
          title: "Content Suggestions Ready",
          description: "AI has generated some content ideas for you.",
        });
      }
    } catch (error) {
      console.error("Error suggesting content:", error);
      if (showToastOnSuccess) { // Only toast errors for manual button clicks to avoid noise
        toast({
          title: "Suggestion Error",
          description: "Failed to get content suggestions. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSuggestingContent(false);
    }
  };
  
  // Debounced version for "as-you-type"
  const debouncedFetchSuggestions = useCallback(
    debounce((text: string, lang: LanguageValue) => {
      fetchContentSuggestions(text, lang, false); // No toast for automatic suggestions
    }, DEBOUNCE_DELAY),
    [selectedLanguage, toast] // Dependencies for useCallback
  );

  // Effect for "as-you-type" suggestions
  useEffect(() => {
    const trimmedText = inputText.trim();
    if (trimmedText.split(/\s+/).length >= MIN_WORDS_FOR_AUTO_SUGGESTIONS) {
      debouncedFetchSuggestions(inputText, selectedLanguage);
    } else {
      setContentSuggestions(null); // Clear suggestions if input is too short
      if (isSuggestingContent && !isLoadingGrammar) { // Only clear if it was due to auto-suggest
         // setIsSuggestingContent(false); // fetchContentSuggestions handles this
      }
      debouncedFetchSuggestions.cancel(); // Cancel any pending debounced call
    }
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [inputText, selectedLanguage, debouncedFetchSuggestions, isSuggestingContent, isLoadingGrammar]);


  // Handler for the manual "Get Content Suggestions" button
  const handleSuggestContentButtonClick = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter some text to get content suggestions.",
        variant: "destructive",
      });
      return;
    }
    // Clear previous grammar results if getting new suggestions explicitly
    setGrammarApiResponse(null); 
    fetchContentSuggestions(inputText, selectedLanguage, true); // Show toast for manual button click
  };


  // DOCX related functions remain for potential re-enablement but are not active
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => { /* ... */ };
  const handleCheckParagraph = async (paragraphId: string) => { /* ... */ };
  const handleCheckAllParagraphs = async () => { /* ... */ };
  const handleParagraphTextChange = (paragraphId: string, newText: string) => { /* ... */ };

  const anyOperationInProgress = isLoadingGrammar || isFileProcessing || isCheckingAll || isSuggestingContent;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background text-foreground font-sans">
      <header className="mb-6 md:mb-8 text-center">
        <div className="inline-flex items-center justify-center gap-2 md:gap-3">
           <BrainCircuit className="h-10 w-10 md:h-12 md:w-12 text-primary" />
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground bg-primary px-3 py-1 md:px-4 md:py-2 rounded-lg shadow-md">
            Deepak Checker AI
          </h1>
        </div>
        <p className="mt-2 md:mt-3 text-md md:text-lg text-muted-foreground">
          Your AI-powered assistant for flawless writing in multiple languages.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-grow">
        <Card className="md:w-1/2 w-full flex flex-col shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <LanguagesIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              Input Options
            </CardTitle>
            <CardDescription className="text-sm">Select language, then paste or type text for AI suggestions & grammar checks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-grow">
            
            <div className="border p-4 rounded-md bg-card/50 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Advanced Features</span>
              </div>
              <p className="text-sm text-primary font-medium">Document Upload & Analysis: Coming Soon!</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI-powered suggestions (as you type) and grammar checking for manually entered text (below) are currently active.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
                <Select 
                  value={selectedLanguage} 
                  onValueChange={(value: LanguageValue) => setSelectedLanguage(value)} 
                  disabled={anyOperationInProgress}
                >
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
              </div>

            <div className="border p-4 rounded-md bg-card/50">
              <label htmlFor="manual-text-input" className="block text-sm font-medium text-muted-foreground mb-1">Enter Text Manually:</label>
              <Textarea
                id="manual-text-input"
                placeholder="Start typing or paste your content here... (suggestions appear as you type)"
                value={inputText}
                onChange={(e) => { 
                  setInputText(e.target.value); 
                  setGrammarApiResponse(null); // Clear grammar results on new input
                  setUserModifiedText(e.target.value); // Keep userModifiedText in sync
                  // Content suggestions are handled by useEffect watching inputText
                }}
                className="flex-grow min-h-[150px] sm:min-h-[200px] text-base bg-card border-input focus:ring-primary"
                rows={8}
                disabled={anyOperationInProgress && !isSuggestingContent} // Allow typing if only auto-suggesting
              />
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleSuggestContentButtonClick} 
                  disabled={anyOperationInProgress || !inputText.trim()}
                  className="w-full sm:w-1/2 text-base py-3"
                  variant="outline"
                >
                  {isSuggestingContent && !isLoadingGrammar ? ( // Show loader only if it's for suggestions
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Getting Suggestions...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="mr-2 h-5 w-5" />
                      Get Content Suggestions
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleGrammarCheckSubmit} 
                  disabled={anyOperationInProgress || !inputText.trim()}
                  className="w-full sm:w-1/2 text-base py-3"
                >
                  {isLoadingGrammar ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Checking Grammar...
                    </>
                  ) : (
                     "Check Typed Text (Grammar)"
                  )}
                </Button>
              </div>
            </div>

            {isSuggestingContent && !isLoadingGrammar && ( // Show this only for suggestion loading, not grammar
                <div className="flex items-center justify-center text-muted-foreground mt-4">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <p>AI is thinking of suggestions...</p>
                </div>
            )}

            {contentSuggestions && contentSuggestions.length > 0 && (
              <Card className="mt-4 bg-card/70 border-input">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Content Suggestions
                  </CardTitle>
                  <CardDescription className="text-xs">Consider these ideas to enhance your text. You can copy-paste or retype them into the text area above.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-auto max-h-[200px] ">
                    <ul className="space-y-2 text-sm">
                      {contentSuggestions.map((suggestion, index) => (
                        <li key={index} className="p-2 border border-dashed border-border rounded-md bg-background/50 hover:bg-background/70">
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card className="md:w-1/2 w-full flex flex-col shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary"/>
              Results & Corrections
            </CardTitle>
             <CardDescription className="text-sm">
              {grammarApiResponse ? (
                "Review grammar suggestions or view and edit the corrected text from your manual input."
              ) : (
                "Grammar check results for manually typed text will appear here. Support for DOCX file analysis is coming soon!"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {(isLoadingGrammar && !grammarApiResponse) && ( // This specific loader is for grammar check
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary mb-4" />
                <p className="text-md md:text-lg">Analyzing your text for grammar...</p>
                <p className="text-sm">This might take a few moments.</p>
              </div>
            )}
            
            {!isLoadingGrammar && !grammarApiResponse && !isFileProcessing && (!isSuggestingContent || contentSuggestions === null || contentSuggestions.length === 0) && (
               <div className="flex flex-col items-center justify-center h-full text-center p-4 rounded-lg border-2 border-dashed border-input">
                 <Image src="https://placehold.co/200x150.png" alt="Placeholder illustration" width={200} height={150} className="opacity-60 rounded mb-4" data-ai-hint="analysis document" />
                 <p className="text-muted-foreground text-md md:text-lg">Your content analysis will show up here.</p>
                 <p className="text-xs md:text-sm text-muted-foreground">Enter text and use the buttons on the left to get started, or wait for automatic suggestions.</p>
               </div>
            )}
             {!isLoadingGrammar && !grammarApiResponse && !isFileProcessing && isSuggestingContent && (!contentSuggestions || contentSuggestions.length === 0) && ( // If suggesting but no suggestions yet
                 <div className="flex flex-col items-center justify-center h-full text-center p-4 rounded-lg border-2 border-dashed border-input">
                    <Image src="https://placehold.co/200x150.png" alt="Placeholder illustration" width={200} height={150} className="opacity-60 rounded mb-4" data-ai-hint="thinking lightbulb" />
                    <p className="text-muted-foreground text-md md:text-lg">AI is generating suggestions for your text on the left...</p>
                 </div>
            )}
             {!isLoadingGrammar && !grammarApiResponse && !isFileProcessing && !isSuggestingContent && contentSuggestions && contentSuggestions.length > 0 && ( // If suggestions are shown, but no grammar check yet
                 <div className="flex flex-col items-center justify-center h-full text-center p-4 rounded-lg border-2 border-dashed border-input">
                    <Image src="https://placehold.co/200x150.png" alt="Placeholder illustration" width={200} height={150} className="opacity-60 rounded mb-4" data-ai-hint="editing document" />
                    <p className="text-muted-foreground text-md md:text-lg">Review the content suggestions on the left.</p>
                    <p className="text-xs md:text-sm text-muted-foreground">After refining your text, click "Check Typed Text (Grammar)" to proceed.</p>
                 </div>
            )}

            {grammarApiResponse && (
              <Tabs defaultValue="interactive" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="interactive">Interactive Corrections</TabsTrigger>
                  <TabsTrigger value="ai-corrected">Editable Corrected Text</TabsTrigger>
                </TabsList>
                <TabsContent value="interactive" className="flex-grow mt-4 overflow-y-auto">
                   <InteractiveCorrector
                    text={userModifiedText} // Should be the text AI operated on or user further modified
                    aiSuggestions={grammarApiResponse.suggestions || []}
                    onTextChange={setUserModifiedText}
                    className="min-h-[200px] sm:min-h-[250px] md:min-h-[300px]"
                  />
                </TabsContent>
                <TabsContent value="ai-corrected" className="flex-grow mt-4">
                  <Textarea
                    value={userModifiedText}
                    onChange={(e) => setUserModifiedText(e.target.value)}
                    className="h-full min-h-[200px] sm:min-h-[250px] md:min-h-[300px] text-base bg-card border-input focus:ring-primary"
                    rows={12}
                  />
                </TabsContent>
              </Tabs>
            )}

          </CardContent>
        </Card>
      </div>
      <footer className="text-center mt-8 md:mt-12 py-4 text-xs md:text-sm text-muted-foreground">
        Deepak Checker AI &copy; {new Date().getFullYear()} | Powered by Generative AI
      </footer>
    </div>
  );
}
    
