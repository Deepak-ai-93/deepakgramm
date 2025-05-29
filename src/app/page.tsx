
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input"; // Keep for potential future re-enablement, though not used in current UI
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InteractiveCorrector } from "@/components/linguacheck/InteractiveCorrector";
import { checkContentErrors, CheckContentErrorsInput, CheckContentErrorsOutput } from "@/ai/flows/check-content-errors";
import { suggestContent, SuggestContentInput, SuggestContentOutput } from "@/ai/flows/suggest-content-flow"; // Import new flow
import { useToast } from "@/hooks/use-toast";
import { Loader2, LanguagesIcon, FileText, UploadCloud, FileCheck2, BrainCircuit, Lightbulb } from "lucide-react";
import Image from 'next/image';
import mammoth from 'mammoth'; // Keep for potential future re-enablement
import { ScrollArea } from '@/components/ui/scroll-area';
// Switch and Label are no longer used directly in the UI for AI toggle
// import { Switch } from "@/components/ui/switch";
// import { Label } from "@/components/ui/label";

const languages = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi (हिन्दी)' },
  { value: 'gujarati', label: 'Gujarati (ગુજરાતી)' },
] as const;

type LanguageValue = typeof languages[number]['value'];

interface ParagraphItem { // Keep for potential future re-enablement
  id: string;
  originalText: string;
  apiResponse?: CheckContentErrorsOutput;
  isLoading: boolean;
  userModifiedText: string;
}

const BASE_PAGE_TITLE = 'Deepak Checker AI: AI-Powered Content Checker';

export default function LinguaCheckPage() {
  const [inputText, setInputText] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageValue>('english');
  
  // States for grammar check
  const [isLoadingGrammar, setIsLoadingGrammar] = useState<boolean>(false);
  const [grammarApiResponse, setGrammarApiResponse] = useState<CheckContentErrorsOutput | null>(null);
  const [userModifiedText, setUserModifiedText] = useState<string>("");

  // States for content suggestions
  const [isSuggestingContent, setIsSuggestingContent] = useState<boolean>(false);
  const [contentSuggestions, setContentSuggestions] = useState<string[] | null>(null);


  // DOCX related states - keep for easier re-integration, but they won't be populated by UI
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
    // AI assistance is now always on for manual input, so always show brain icon
    document.title = '🧠 ' + BASE_PAGE_TITLE;
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
    setUserModifiedText(inputText); // Reset user modified text to current input before grammar check
    // No longer resetting DOCX states as that UI is hidden
    //setContentSuggestions(null); // Optionally clear content suggestions or keep them

    try {
      const input: CheckContentErrorsInput = { content: inputText, language: selectedLanguage };
      const result = await checkContentErrors(input);
      setGrammarApiResponse(result);
      if (result.correctedContent) {
        setUserModifiedText(result.correctedContent);
      }
      toast({
        title: "Grammar Check Complete",
        description: "Errors and suggestions are now available for the text input.",
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

  const handleSuggestContentSubmit = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter some text to get content suggestions.",
        variant: "destructive",
      });
      return;
    }
    setIsSuggestingContent(true);
    setContentSuggestions(null);
    setGrammarApiResponse(null); // Clear previous grammar results if getting new suggestions
    
    try {
      const input: SuggestContentInput = { content: inputText, language: selectedLanguage };
      const result = await suggestContent(input);
      setContentSuggestions(result.suggestions);
      toast({
        title: "Content Suggestions Ready",
        description: "AI has generated some content ideas for you.",
      });
    } catch (error) {
      console.error("Error suggesting content:", error);
      toast({
        title: "Error",
        description: "Failed to get content suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingContent(false);
    }
  };


  // DOCX related functions are kept for easier future re-integration but are not called by current UI
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    // This function will not be called as the input is hidden
    const file = event.target.files?.[0];
    if (!file) return;
    // ... (rest of the function remains, but unreachable through UI)
    setIsFileProcessing(true);
    setUploadedFileName(file.name);
    setInputText(""); 
    setGrammarApiResponse(null); 
    setParsedParagraphs([]); 
    setContentSuggestions(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const pElements = tempDiv.getElementsByTagName('p');

      const paragraphs: ParagraphItem[] = Array.from(pElements)
        .map((p, index) => ({
          id: `para_${index}_${Date.now()}`,
          originalText: p.textContent?.trim() || '',
          isLoading: false,
          userModifiedText: p.textContent?.trim() || '', 
        }))
        .filter(p => p.originalText.length > 0);

      if (paragraphs.length === 0) {
        toast({
          title: "No Content Found",
          description: "The uploaded DOCX file seems to be empty or contains no parsable paragraphs.",
          variant: "destructive",
        });
        setUploadedFileName(null);
      } else {
        setParsedParagraphs(paragraphs);
        toast({
          title: "File Processed",
          description: `Found ${paragraphs.length} paragraph(s) in ${file.name}. You can now check them.`,
        });
      }
    } catch (error) {
      console.error("Error processing DOCX file:", error);
      toast({
        title: "File Processing Error",
        description: "Could not read or parse the DOCX file. Please ensure it's a valid .docx file.",
        variant: "destructive",
      });
      setUploadedFileName(null);
    } finally {
      setIsFileProcessing(false);
      event.target.value = ""; 
    }
  };

  const handleCheckParagraph = async (paragraphId: string) => {
    // This function will not be called as the UI is hidden
    const paragraphIndex = parsedParagraphs.findIndex(p => p.id === paragraphId);
    if (paragraphIndex === -1) return;
    // ... (rest of the function remains, but unreachable through UI)
    const paragraph = parsedParagraphs[paragraphIndex];
    
    setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, isLoading: true, apiResponse: undefined } : p));

    try {
      const contentToCheck = paragraph.userModifiedText !== paragraph.originalText ? paragraph.userModifiedText : paragraph.originalText;
      const input: CheckContentErrorsInput = { content: contentToCheck, language: selectedLanguage };
      const result = await checkContentErrors(input);
      setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, isLoading: false, apiResponse: result, userModifiedText: result.correctedContent || contentToCheck } : p));
      toast({
        title: `Paragraph ${paragraphIndex + 1} Checked`,
        description: "Errors and suggestions are available for this paragraph.",
      });
    } catch (error) {
      console.error(`Error checking paragraph ${paragraphId}:`, error);
      toast({
        title: `Error Checking Paragraph ${paragraphIndex + 1}`,
        description: "Failed to check this paragraph. Please try again.",
        variant: "destructive",
      });
      setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, isLoading: false } : p));
    }
  };

  const handleCheckAllParagraphs = async () => {
    // This function will not be called as the UI is hidden
    if (!parsedParagraphs.some(p => !p.apiResponse && !p.isLoading)) {
      toast({
        title: "All Checked",
        description: "All paragraphs have already been checked or are currently being processed.",
      });
      return;
    }
    // ... (rest of the function remains, but unreachable through UI)
    setIsCheckingAll(true);
    toast({
      title: "Processing All Paragraphs",
      description: "Checking all unchecked paragraphs. This may take some time.",
    });
    
    const paragraphsToCheck = [...parsedParagraphs];

    for (const para of paragraphsToCheck) {
        const currentParaState = parsedParagraphs.find(p => p.id === para.id); 
        if (currentParaState && !currentParaState.apiResponse && !currentParaState.isLoading) {
            setParsedParagraphs(prev => prev.map(p => p.id === para.id ? { ...p, isLoading: true, apiResponse: undefined } : p));
            try {
                const contentToCheck = currentParaState.userModifiedText !== currentParaState.originalText ? currentParaState.userModifiedText : currentParaState.originalText;
                const input: CheckContentErrorsInput = { content: contentToCheck, language: selectedLanguage };
                const result = await checkContentErrors(input);
                setParsedParagraphs(prev => prev.map(p =>
                    p.id === para.id ? { ...p, isLoading: false, apiResponse: result, userModifiedText: result.correctedContent || contentToCheck } : p
                ));
            } catch (error) {
                console.error(`Error checking paragraph ${para.id} during 'Check All':`, error);
                const paragraphIndexOriginal = paragraphsToCheck.findIndex(p => p.id === para.id);
                toast({
                    title: `Error Checking Paragraph ${paragraphIndexOriginal + 1}`,
                    description: "Failed to check this paragraph. Skipping.",
                    variant: "destructive",
                });
                setParsedParagraphs(prev => prev.map(p => p.id === para.id ? { ...p, isLoading: false } : p));
            }
        }
    }

    setIsCheckingAll(false);
    toast({
        title: "Processing Complete",
        description: "All paragraphs have been processed.",
    });
  };

  const handleParagraphTextChange = (paragraphId: string, newText: string) => {
    // This function will not be called as the UI is hidden
    setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, userModifiedText: newText } : p));
  };

  // Simplified as DOCX processing states are not triggered by UI
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
            <CardDescription className="text-sm">Select language, paste text for AI suggestions & grammar checks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-grow">
            
            <div className="border p-4 rounded-md bg-card/50 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Advanced Features</span>
              </div>
              <p className="text-sm text-primary font-medium">Document Upload & Analysis: Coming Soon!</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI-powered suggestions and checking for manually typed text (below) is currently active.
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
                placeholder="Start typing or paste your content here..."
                value={inputText}
                onChange={(e) => { 
                  setInputText(e.target.value); 
                  setGrammarApiResponse(null); // Clear grammar results on new input
                  setContentSuggestions(null); // Clear content suggestions on new input
                  setUserModifiedText(e.target.value);
                }}
                className="flex-grow min-h-[150px] sm:min-h-[200px] text-base bg-card border-input focus:ring-primary"
                rows={8}
                disabled={anyOperationInProgress}
              />
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleSuggestContentSubmit} 
                  disabled={anyOperationInProgress || !inputText.trim()}
                  className="w-full sm:w-1/2 text-base py-3"
                  variant="outline"
                >
                  {isSuggestingContent ? (
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

            {isSuggestingContent && (
                <div className="flex items-center justify-center text-muted-foreground mt-4">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <p>Generating content ideas...</p>
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
            {(isLoadingGrammar && !grammarApiResponse) && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary mb-4" />
                <p className="text-md md:text-lg">Analyzing your text for grammar...</p>
                <p className="text-sm">This might take a few moments.</p>
              </div>
            )}
            

            {!isLoadingGrammar && !grammarApiResponse && !isFileProcessing && !isSuggestingContent && (!contentSuggestions || contentSuggestions.length === 0) && (
               <div className="flex flex-col items-center justify-center h-full text-center p-4 rounded-lg border-2 border-dashed border-input">
                 <Image src="https://placehold.co/200x150.png" alt="Placeholder illustration" width={200} height={150} className="opacity-60 rounded mb-4" data-ai-hint="analysis document" />
                 <p className="text-muted-foreground text-md md:text-lg">Your content analysis will show up here.</p>
                 <p className="text-xs md:text-sm text-muted-foreground">Enter text and use the buttons on the left to get started.</p>
               </div>
            )}
             {!isLoadingGrammar && !grammarApiResponse && !isFileProcessing && !isSuggestingContent && contentSuggestions && contentSuggestions.length > 0 && (
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
                    text={userModifiedText}
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
    
