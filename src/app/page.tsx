
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, LanguagesIcon, FileText, UploadCloud, FileCheck2, BrainCircuit } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState<boolean>(false); // For main text area
  const [apiResponse, setApiResponse] = useState<CheckContentErrorsOutput | null>(null); // For main text area
  const [userModifiedText, setUserModifiedText] = useState<string>(""); // For main text area

  // DOCX related states - keep for easier re-integration, but they won't be populated by UI
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedParagraphs, setParsedParagraphs] = useState<ParagraphItem[]>([]);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);
  const [isCheckingAll, setIsCheckingAll] = useState<boolean>(false);
  // isAiAssistanceEnabled state is removed as the toggle is hidden. AI is effectively always on for manual input.

  const { toast } = useToast();

  useEffect(() => {
    if (!apiResponse || inputText === "") {
      setUserModifiedText(inputText);
    }
  }, [inputText, apiResponse]);

  useEffect(() => {
    // AI assistance is now always on for manual input, so always show brain icon
    document.title = '🧠 ' + BASE_PAGE_TITLE;
  }, []);

  const handleMainSubmit = async () => {
    // AI assistance toggle check removed
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
    // No longer resetting DOCX states as that UI is hidden
    // setParsedParagraphs([]);
    // setUploadedFileName(null);
    setUserModifiedText(inputText); 

    try {
      const input: CheckContentErrorsInput = { content: inputText, language: selectedLanguage };
      const result = await checkContentErrors(input);
      setApiResponse(result);
      if (result.correctedContent) {
        setUserModifiedText(result.correctedContent);
      }
      toast({
        title: "Check Complete",
        description: "Errors and suggestions are now available for the text input.",
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

  // DOCX related functions are kept for easier future re-integration but are not called by current UI
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    // This function will not be called as the input is hidden
    const file = event.target.files?.[0];
    if (!file) return;
    // ... (rest of the function remains, but unreachable through UI)
    setIsFileProcessing(true);
    setUploadedFileName(file.name);
    setInputText(""); 
    setApiResponse(null); 
    setParsedParagraphs([]); 

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
  const anyOperationInProgress = isLoading || isFileProcessing || isCheckingAll;


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
            <CardDescription className="text-sm">Select language and paste text for AI-powered checking.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-grow">
            
            {/* Placeholder for "Enable AI Assistance" switch and DOCX Upload */}
            <div className="border p-4 rounded-md bg-card/50 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Advanced Features</span>
              </div>
              <p className="text-sm text-primary font-medium">Document Upload & Analysis: Coming Soon!</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI-powered checking for manually typed text (below) is currently active.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
                <Select 
                  value={selectedLanguage} 
                  onValueChange={(value: LanguageValue) => setSelectedLanguage(value)} 
                  disabled={anyOperationInProgress} // No longer checks isAiAssistanceEnabled
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
                onChange={(e) => { setInputText(e.target.value); setApiResponse(null); setUserModifiedText(e.target.value);}} // Removed DOCX state resets
                className="flex-grow min-h-[150px] sm:min-h-[200px] text-base bg-card border-input focus:ring-primary"
                rows={8}
                disabled={anyOperationInProgress}
              />
              <Button 
                onClick={handleMainSubmit} 
                disabled={anyOperationInProgress || !inputText.trim()}  // No longer checks isAiAssistanceEnabled
                className="w-full mt-3 text-base py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Checking Text...
                  </>
                ) : (
                  "Check Typed Text"
                )}
              </Button>
            </div>

            {/* DOCX File Upload section is removed */}

          </CardContent>
        </Card>

        <Card className="md:w-1/2 w-full flex flex-col shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary"/>
              Results & Corrections
            </CardTitle>
             <CardDescription className="text-sm">
              {apiResponse ? (
                "Review suggestions or view and edit the corrected text from your manual input."
              ) : (
                "Results for manually typed text will appear here. Support for DOCX file analysis is coming soon!"
              )}
            </CardDescription>
            {/* "Check All Paragraphs" button is removed as DOCX UI is hidden */}
          </CardHeader>
          <CardContent className="flex-grow">
            {isLoading && !apiResponse && ( // Simplified condition, no parsedParagraphs check
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary mb-4" />
                <p className="text-md md:text-lg">Analyzing your text...</p>
                <p className="text-sm">This might take a few moments.</p>
              </div>
            )}
            
            {/* Removed UI block for "AI Assistance Disabled" as toggle is hidden */}

            {!isLoading && !apiResponse && !isFileProcessing && ( // Simplified condition
               <div className="flex flex-col items-center justify-center h-full text-center p-4 rounded-lg border-2 border-dashed border-input">
                 <Image src="https://placehold.co/200x150.png" alt="Placeholder illustration" width={200} height={150} className="opacity-60 rounded mb-4" data-ai-hint="analysis document" />
                 <p className="text-muted-foreground text-md md:text-lg">Your content analysis will show up here.</p>
                 <p className="text-xs md:text-sm text-muted-foreground">Enter text on the left to get started.</p>
               </div>
            )}

            {apiResponse && ( // Simplified condition, no parsedParagraphs check
              <Tabs defaultValue="interactive" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="interactive">Interactive Corrections</TabsTrigger>
                  <TabsTrigger value="ai-corrected">Editable Corrected Text</TabsTrigger>
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
                    value={userModifiedText}
                    onChange={(e) => setUserModifiedText(e.target.value)}
                    className="h-full min-h-[200px] sm:min-h-[250px] md:min-h-[300px] text-base bg-card border-input focus:ring-primary"
                    rows={12}
                  />
                </TabsContent>
              </Tabs>
            )}

            {/* All UI related to parsedParagraphs (Accordion) is removed as DOCX upload is hidden */}

          </CardContent>
        </Card>
      </div>
      <footer className="text-center mt-8 md:mt-12 py-4 text-xs md:text-sm text-muted-foreground">
        Deepak Checker AI &copy; {new Date().getFullYear()} | Powered by Generative AI
      </footer>
    </div>
  );
}
    
