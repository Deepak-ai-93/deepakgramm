
"use client";

import { useState, ChangeEvent, useEffect, useCallback } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { InteractiveCorrector } from "@/components/linguacheck/InteractiveCorrector";
import { TypingSuggestionItem } from "@/components/linguacheck/TypingSuggestionItem";
import { checkContentErrors, type CheckContentErrorsInput, type CheckContentErrorsOutput } from "@/ai/flows/check-content-errors";
import { suggestContent, type SuggestContentInput, type SuggestContentOutput } from "@/ai/flows/suggest-content-flow";
import mammoth from 'mammoth';
import { Type, UploadCloud, CheckCircle2, AlertCircle, BrainCircuit, Loader2, Lightbulb, Languages, FileCheck2, FileText, Wand2 } from "lucide-react";

type Language = 'english' | 'hindi' | 'gujarati';
type Tone = 
  | 'neutral' 
  | 'formal' 
  | 'casual' 
  | 'persuasive' 
  | 'creative' 
  | 'professional' 
  | 'medical_healthcare' 
  | 'financial_investment' 
  | 'technical'
  | 'tips'
  | 'explain'
  | 'information'
  | 'process'
  | 'education'
  | 'engaging'
  | 'guide';


interface ParagraphCheckState {
  id: string;
  originalText: string;
  isLoading: boolean;
  result: CheckContentErrorsOutput | null;
  error: string | null;
  userModifiedText: string | null; // For editable corrected text
}

export default function LinguaCheckPage() {
  const [inputText, setInputText] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('english');
  const [selectedTone, setSelectedTone] = useState<Tone | undefined>(undefined);
  
  const [isLoadingCheck, setIsLoadingCheck] = useState<boolean>(false);
  const [isLoadingSuggest, setIsLoadingSuggest] = useState<boolean>(false);
  
  const [checkContentResult, setCheckContentResult] = useState<CheckContentErrorsOutput | null>(null);
  const [userModifiedText, setUserModifiedText] = useState<string | null>(null); // For main text area
  const [contentSuggestion, setContentSuggestion] = useState<string | null>(null); // Changed from string[]
  const { toast } = useToast();

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [parsedParagraphs, setParsedParagraphs] = useState<ParagraphCheckState[]>([]);
  const [isCheckingAll, setIsCheckingAll] = useState<boolean>(false);

  const [isAiAssistanceEnabled, setIsAiAssistanceEnabled] = useState<boolean>(false); 

  const baseTitle = "Deepak Checker AI: AI-Powered Content Checker";

  useEffect(() => {
    if (isAiAssistanceEnabled) {
      document.title = `D | ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [isAiAssistanceEnabled, baseTitle]);

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value as Language);
    setCheckContentResult(null);
    setUserModifiedText(null);
    setContentSuggestion(null); 
    if (parsedParagraphs.length > 0) {
      setParsedParagraphs(prev => prev.map(p => ({ ...p, result: null, error: null, userModifiedText: null, isLoading: false })));
    }
  };

  const handleToneChange = (value: string) => {
    setSelectedTone(value === "none" ? undefined : value as Tone);
    setContentSuggestion(null); 
  };

  const handleCheckContent = async (textToCheck: string, isParagraph: boolean = false, paragraphId?: string) => {
    if (!isAiAssistanceEnabled) {
      toast({ title: "AI Disabled", description: "AI assistance is currently disabled. Please enable it first.", variant: "destructive" });
      return;
    }
    if (!textToCheck.trim()) {
      toast({ title: "No Content", description: "Please enter some text to check.", variant: "destructive" });
      return;
    }

    if (!isParagraph) setIsLoadingCheck(true);
    else {
      setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, isLoading: true, error: null, result: null, userModifiedText: null } : p));
    }

    try {
      const input: CheckContentErrorsInput = { content: textToCheck, language: selectedLanguage };
      const result = await checkContentErrors(input);
      if (!isParagraph) {
        setCheckContentResult(result);
        setUserModifiedText(result.correctedContent);
        toast({ title: "Content Checked", description: "Grammar and spelling analysis complete." });
      } else {
        setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, isLoading: false, result, userModifiedText: result.correctedContent } : p));
      }
    } catch (error) {
      console.error("Error checking content:", error);
      const errorMsg = error instanceof Error ? error.message : "An unknown error occurred.";
      if (!isParagraph) {
        setCheckContentResult({ correctedContent: textToCheck, suggestions: [] });
        setUserModifiedText(textToCheck);
      } else {
        setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, isLoading: false, error: errorMsg, userModifiedText: textToCheck } : p));
      }
      toast({ title: "Error Checking Content", description: errorMsg, variant: "destructive" });
    } finally {
      if (!isParagraph) setIsLoadingCheck(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!isAiAssistanceEnabled || !inputText.trim()) {
      toast({
        title: !isAiAssistanceEnabled ? "AI Disabled" : "No Content",
        description: !isAiAssistanceEnabled ? "Enable AI assistance first." : "Please enter some text to get suggestions.",
        variant: "destructive"
      });
      setContentSuggestion(null);
      return;
    }
    
    setIsLoadingSuggest(true);
    setContentSuggestion(null); 
    try {
      const input: SuggestContentInput = {
        content: inputText,
        language: selectedLanguage,
        tone: selectedTone
      };
      const result = await suggestContent(input);
      setContentSuggestion(result.enhancedContent);
      toast({ title: "Suggestion Ready", description: "Enhanced suggestion has been generated." });
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      const errorMsg = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error Fetching Suggestion", description: errorMsg, variant: "destructive" });
      setContentSuggestion(null);
    } finally {
      setIsLoadingSuggest(false);
    }
  };


  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    // This feature is marked as "coming soon"
  };

  const handleCheckAllParagraphs = async () => {
    if (!isAiAssistanceEnabled) {
      toast({ title: "AI Disabled", description: "Cannot check paragraphs when AI assistance is disabled.", variant: "destructive" });
      return;
    }
    if (parsedParagraphs.length === 0) return;
    setIsCheckingAll(true);
    toast({ title: "Bulk Check Started", description: "Checking all unanalyzed paragraphs..." });

    for (const para of parsedParagraphs) {
      if (!para.result && !para.isLoading && !para.error) {
        await handleCheckContent(para.originalText, true, para.id);
      }
    }
    setIsCheckingAll(false);
    toast({ title: "Bulk Check Complete", description: "All paragraphs have been processed." });
  };

  const handleUserModifiedTextChange = (newText: string) => {
    setUserModifiedText(newText);
  };

  const handleParagraphUserModifiedTextChange = (paragraphId: string, newText: string) => {
    setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, userModifiedText: newText } : p));
  };

  const handleApplySuggestionToInput = (suggestion: string) => {
    setInputText(suggestion);
    setCheckContentResult(null); 
    setUserModifiedText(null);   
    setContentSuggestion(null);   
  };

  const currentWorkingText = userModifiedText ?? inputText;
  const canCheckOrSuggest = isAiAssistanceEnabled && !isLoadingCheck && !isLoadingSuggest && !isCheckingAll && !isUploading;

  const renderEnhancedSuggestion = () => {
    if (!isAiAssistanceEnabled) return null;

    const suggestionMessage = () => {
      if (selectedTone) return `Enhanced suggestion (style/tone: "${selectedTone}") - click to apply:`;
      return "Enhanced suggestion - click to apply:";
    };

    if (isLoadingSuggest) {
      return (
        <div className="mt-3 mb-3 p-3 border rounded-md bg-card/50 min-h-[60px] flex flex-col justify-center items-center shadow">
          <Loader2 className="animate-spin h-5 w-5 mr-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Fetching enhanced suggestion...</p>
        </div>
      );
    }

    if (contentSuggestion) {
      return (
        <div className="mt-3 mb-3 p-3 border rounded-md bg-card/50 min-h-[60px] flex flex-col shadow">
          <p className="text-sm text-muted-foreground mb-2 px-1">
            {suggestionMessage()}
          </p>
          <ul className="space-y-1 text-sm">
            <TypingSuggestionItem
              key={`${contentSuggestion}-${selectedLanguage}-${selectedTone || 'general'}`}
              suggestion={contentSuggestion}
              initialDelay={100} 
              typingSpeed={20}
              onClick={handleApplySuggestionToInput}
            />
          </ul>
        </div>
      );
    }
    
    if (!isLoadingSuggest && !contentSuggestion && inputText.trim().length > 0) {
         return (
            <div className="mt-3 mb-3 p-3 border rounded-md bg-card/50 min-h-[60px] flex flex-col justify-center items-center shadow">
                 <p className="text-sm text-muted-foreground text-center px-1">
                    Click "Get Enhanced Suggestion" to generate an idea for your text.
                </p>
            </div>
         );
    }
    return null;
  };


  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background text-foreground font-sans">
      <header className="mb-6 md:mb-8 text-center">
        <div className="inline-flex items-center justify-center gap-2 md:gap-3">
          <Type className="h-10 w-10 md:h-12 md:w-12 text-primary" />
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground bg-primary px-3 py-1 md:px-4 md:py-2 rounded-lg shadow-md">
            Deepak Checker AI
          </h1>
        </div>
        <p className="mt-2 md:mt-3 text-md md:text-lg text-muted-foreground">
          Your intelligent assistant for drafting, correcting, and enhancing text.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 flex-grow">
        {/* Left Panel: Input & Options */}
        <div className="lg:w-1/2 flex flex-col gap-4 md:gap-6">
          <Card className="shadow-xl border-border flex-grow flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Input Options
              </CardTitle>
              <CardDescription>Configure AI assistance, language, and content style/tone.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 flex-grow">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ai-assistance-toggle"
                  checked={isAiAssistanceEnabled}
                  onCheckedChange={(checked) => {
                    setIsAiAssistanceEnabled(checked);
                    if (!checked) {
                      setContentSuggestion(null);
                      setParsedParagraphs([]); 
                      setUploadedFile(null);
                      setCheckContentResult(null);
                      setUserModifiedText(null);
                    }
                  }}
                  disabled={isLoadingCheck || isLoadingSuggest || isCheckingAll || isUploading}
                />
                <Label htmlFor="ai-assistance-toggle" className="flex items-center gap-1.5">
                  <BrainCircuit className="h-4 w-4" /> Enable AI Assistance
                </Label>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="language-select" className="flex items-center gap-1.5"><Languages className="h-4 w-4"/> Language</Label>
                <Select
                  value={selectedLanguage}
                  onValueChange={handleLanguageChange}
                  disabled={!isAiAssistanceEnabled || isLoadingCheck || isLoadingSuggest || isCheckingAll || isUploading}
                >
                  <SelectTrigger id="language-select" className="w-full md:w-[180px]">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                    <SelectItem value="gujarati">Gujarati</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="tone-select" className="flex items-center gap-1.5"><Wand2 className="h-4 w-4"/> Content Style/Tone (for Enhanced Suggestion)</Label>
                <Select
                  value={selectedTone || "none"}
                  onValueChange={handleToneChange}
                  disabled={!isAiAssistanceEnabled || isLoadingSuggest || isLoadingCheck || isCheckingAll || isUploading}
                >
                  <SelectTrigger id="tone-select" className="w-full md:w-[220px]">
                    <SelectValue placeholder="Select style/tone (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (General Creative)</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="persuasive">Persuasive</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="medical_healthcare">Medical / Healthcare</SelectItem>
                    <SelectItem value="financial_investment">Financial / Investment</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="tips">Tips</SelectItem>
                    <SelectItem value="explain">Explain</SelectItem>
                    <SelectItem value="information">Information</SelectItem>
                    <SelectItem value="process">Process</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="engaging">Engaging</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                 <Label htmlFor="file-upload-input" className="flex items-center gap-1.5"><UploadCloud className="h-4 w-4"/> Upload DOCX File</Label>
                 <p className="text-xs text-amber-600 p-2 border border-amber-500/50 rounded-md bg-amber-500/10">Feature coming soon! Use manual text input for now.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-border">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">Enter Text Manually</CardTitle>
              <CardDescription>Type or paste content. Click "Get Enhanced Suggestion" to analyze your text and receive a style/tone-aware idea. Then, check grammar and spelling.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                id="manual-text-input"
                placeholder="Start typing or paste your content here..."
                value={inputText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  setInputText(e.target.value);
                  setCheckContentResult(null);
                  setUserModifiedText(null);
                  setContentSuggestion(null); 
                  if (uploadedFile) setUploadedFile(null); 
                  if (parsedParagraphs.length > 0) setParsedParagraphs([]); 
                }}
                className="flex-grow min-h-[200px] sm:min-h-[250px] text-base bg-card border-input focus:ring-primary"
                rows={10}
                disabled={parsedParagraphs.length > 0 && !inputText} 
              />
              
              {renderEnhancedSuggestion()}

              <div className="flex flex-col sm:flex-row gap-2">
                 <Button
                  onClick={fetchSuggestions}
                  disabled={!canCheckOrSuggest || !inputText.trim()}
                  className="flex-1"
                  variant="outline"
                >
                  {isLoadingSuggest ? <Loader2 className="animate-spin" /> : <Lightbulb />}
                  Get Enhanced Suggestion
                </Button>
                <Button
                  onClick={() => handleCheckContent(inputText)}
                  disabled={!canCheckOrSuggest || !inputText.trim()}
                  className="flex-1"
                >
                  {isLoadingCheck ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  Check Typed Text (Grammar)
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Panel: Results & Corrections */}
        <div className="lg:w-1/2 flex flex-col">
          <Card className="shadow-xl border-border flex-grow flex flex-col min-h-[400px] lg:min-h-0">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Results & Corrections
              </CardTitle>
              {!isAiAssistanceEnabled ? (
                 <CardDescription className="text-sm text-amber-500 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> AI assistance is currently disabled. Enable it from 'Input Options' to analyze content.
                 </CardDescription>
              ) : (
                <CardDescription>
                  {parsedParagraphs.length > 0 
                    ? "Document paragraphs are listed below. Expand to preview. Click 'Check' or 'Check All' for AI analysis and editing. (File upload feature coming soon!)"
                    : "Enter text manually and click 'Check Typed Text (Grammar)' to see results. Or upload a DOCX file (feature coming soon!)."}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4">
              {isAiAssistanceEnabled && (
                <>
                  {checkContentResult && parsedParagraphs.length === 0 && (
                    <Tabs defaultValue="interactive" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="interactive">Interactive Corrections</TabsTrigger>
                        <TabsTrigger value="corrected">Editable Corrected Text</TabsTrigger>
                      </TabsList>
                      <TabsContent value="interactive">
                        <InteractiveCorrector
                          text={currentWorkingText}
                          aiSuggestions={checkContentResult.suggestions || []}
                          onTextChange={(newText) => {
                            setUserModifiedText(newText);
                          }}
                        />
                      </TabsContent>
                      <TabsContent value="corrected">
                        <Textarea
                          value={userModifiedText ?? checkContentResult.correctedContent ?? ''}
                          onChange={(e) => handleUserModifiedTextChange(e.target.value)}
                          className="min-h-[200px] text-base bg-card border-input focus:ring-primary"
                          rows={10}
                          placeholder="AI corrected text will appear here. You can edit it further."
                        />
                      </TabsContent>
                    </Tabs>
                  )}

                  {parsedParagraphs.length > 0 && (
                    // DOCX paragraph handling (currently disabled due to "coming soon")
                    <div className="text-center text-muted-foreground p-4">
                      <FileText className="h-12 w-12 mx-auto mb-2" />
                      <p>DOCX file processing and paragraph-wise checking feature is under development and will be available soon.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
             {!isAiAssistanceEnabled && (
                <CardFooter className="text-center text-muted-foreground text-sm p-4 flex-col items-center justify-center">
                    <BrainCircuit className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p>AI Assistance is currently disabled.</p>
                    <p>Enable it from 'Input Options' to use checking and suggestion features.</p>
                </CardFooter>
             )}
          </Card>
        </div>
      </div>

      <footer className="text-center mt-8 md:mt-12 py-4 text-xs md:text-sm text-muted-foreground">
        Deepak Checker AI &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
    
