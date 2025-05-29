
"use client";

import { useState, ChangeEvent, useEffect, useCallback, useMemo } from 'react';
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
type Tone = 'neutral' | 'formal' | 'casual' | 'persuasive' | 'creative';

interface ParagraphCheckState {
  id: string;
  originalText: string;
  isLoading: boolean;
  result: CheckContentErrorsOutput | null;
  error: string | null;
  userModifiedText: string | null; // For editable corrected text
}

const MIN_WORDS_FOR_AUTO_SUGGEST = 5;
const AUTO_SUGGEST_DEBOUNCE_TIME = 1500; // 1.5 seconds

export default function LinguaCheckPage() {
  const [inputText, setInputText] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('english');
  const [selectedTone, setSelectedTone] = useState<Tone | undefined>(undefined);
  const [isLoadingCheck, setIsLoadingCheck] = useState<boolean>(false);
  const [isLoadingSuggest, setIsLoadingSuggest] = useState<boolean>(false);
  const [checkContentResult, setCheckContentResult] = useState<CheckContentErrorsOutput | null>(null);
  const [userModifiedText, setUserModifiedText] = useState<string | null>(null); // For main text area
  const [contentSuggestions, setContentSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [parsedParagraphs, setParsedParagraphs] = useState<ParagraphCheckState[]>([]);
  const [isCheckingAll, setIsCheckingAll] = useState<boolean>(false);

  const [isAiAssistanceEnabled, setIsAiAssistanceEnabled] = useState<boolean>(false); // Default to OFF

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
    setContentSuggestions([]); // Clear suggestions on language change
    if (parsedParagraphs.length > 0) {
      setParsedParagraphs(prev => prev.map(p => ({ ...p, result: null, error: null, userModifiedText: null, isLoading: false })));
    }
  };

  const handleToneChange = (value: string) => {
    setSelectedTone(value === "none" ? undefined : value as Tone);
    setContentSuggestions([]); // Clear suggestions on tone change for as-you-type
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

  const fetchSuggestions = useCallback(async (textToSuggest: string, applyTone: boolean = true) => {
    if (!isAiAssistanceEnabled || !textToSuggest.trim() || textToSuggest.split(/\s+/).filter(Boolean).length < MIN_WORDS_FOR_AUTO_SUGGEST) {
      setContentSuggestions([]);
      if (isLoadingSuggest) setIsLoadingSuggest(false); 
      return;
    }
    setIsLoadingSuggest(true);
    try {
      const input: SuggestContentInput = {
        content: textToSuggest,
        language: selectedLanguage,
        tone: applyTone ? selectedTone : undefined
      };
      const result = await suggestContent(input);
      setContentSuggestions(result.suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setContentSuggestions([]);
    } finally {
      setIsLoadingSuggest(false);
    }
  }, [selectedLanguage, selectedTone, isAiAssistanceEnabled, isLoadingSuggest]);


  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const debouncedFunc = (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });

    (debouncedFunc as any).cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };
    return debouncedFunc as F & { cancel: () => void };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetchSuggestions = useMemo(() => debounce(fetchSuggestions, AUTO_SUGGEST_DEBOUNCE_TIME), [fetchSuggestions]);

  useEffect(() => {
    if (inputText.split(/\s+/).filter(Boolean).length >= MIN_WORDS_FOR_AUTO_SUGGEST && isAiAssistanceEnabled) {
      debouncedFetchSuggestions(inputText, true); // true for applyTone
    } else {
      debouncedFetchSuggestions.cancel();
      setContentSuggestions([]);
      if(isLoadingSuggest && inputText.split(/\s+/).filter(Boolean).length < MIN_WORDS_FOR_AUTO_SUGGEST) {
        setIsLoadingSuggest(false); 
      }
    }
    return () => {
        debouncedFetchSuggestions.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, isAiAssistanceEnabled, selectedLanguage, selectedTone]); // Add selectedLanguage and selectedTone dependencies


  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!isAiAssistanceEnabled) {
      toast({ title: "AI Disabled", description: "Cannot upload files when AI assistance is disabled.", variant: "destructive" });
      if (event.target) event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (event.target) event.target.value = ""; // Reset file input

    if (file) {
      if (file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        toast({ title: "Invalid File Type", description: "Please upload a .docx file.", variant: "destructive" });
        return;
      }
      setUploadedFile(file);
      setIsUploading(true);
      setInputText(""); // Clear manual input
      setCheckContentResult(null);
      setUserModifiedText(null);
      setContentSuggestions([]);
      setParsedParagraphs([]);
      toast({ title: "File Uploading...", description: `Processing ${file.name}` });

      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const paragraphs = result.value.split('\n').filter(p => p.trim() !== '');
        setParsedParagraphs(paragraphs.map((p, index) => ({
          id: `para_${index}_${Date.now()}`,
          originalText: p,
          isLoading: false,
          result: null,
          error: null,
          userModifiedText: null,
        })));
        toast({ title: "File Processed", description: "Paragraphs are ready for review." });
      } catch (error) {
        console.error("Error parsing DOCX file:", error);
        toast({ title: "Error Parsing File", description: "Could not read the DOCX file.", variant: "destructive" });
        setUploadedFile(null);
        setParsedParagraphs([]);
      } finally {
        setIsUploading(false);
      }
    }
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
    setContentSuggestions([]);   
    debouncedFetchSuggestions.cancel(); 
  };

  const currentWorkingText = userModifiedText ?? inputText;
  const canCheckOrSuggest = isAiAssistanceEnabled && !isLoadingCheck && !isLoadingSuggest && !isCheckingAll && !isUploading;
  const currentInputWordCount = inputText.split(/\s+/).filter(Boolean).length;

  const renderAsYouTypeSuggestions = () => {
    if (!isAiAssistanceEnabled) return null;

    const suggestionsArea = (
      <div className="mt-3 mb-3 p-3 border rounded-md bg-card/50 min-h-[100px] flex flex-col justify-center shadow">
        {isLoadingSuggest && contentSuggestions.length === 0 ? (
          <div className="flex items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
            Fetching suggestions...
          </div>
        ) : contentSuggestions.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-2 px-1">
              {selectedTone ? `Suggestions (tone: "${selectedTone}") - click to apply:` : "Suggestions - click to apply:"}
            </p>
            <ul className="space-y-1 text-sm">
              {contentSuggestions.map((suggestion, index) => (
                <TypingSuggestionItem
                  key={`${suggestion}-${index}-${selectedLanguage}-${selectedTone || 'general'}`}
                  suggestion={suggestion}
                  initialDelay={index * 150}
                  typingSpeed={25}
                  onClick={handleApplySuggestionToInput}
                />
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center px-1">
            {currentInputWordCount < MIN_WORDS_FOR_AUTO_SUGGEST
              ? `Type at least ${MIN_WORDS_FOR_AUTO_SUGGEST} words for automatic, tone-aware suggestions for your full text.`
              : "No specific suggestions at this moment. Keep typing, adjust your text, or try changing the tone."}
          </p>
        )}
      </div>
    );
    return suggestionsArea;
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
              <CardDescription>Configure AI assistance, language, and tone.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 flex-grow">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ai-assistance-toggle"
                  checked={isAiAssistanceEnabled}
                  onCheckedChange={(checked) => {
                    setIsAiAssistanceEnabled(checked);
                    if (!checked) {
                      setContentSuggestions([]);
                      debouncedFetchSuggestions.cancel();
                      if (isLoadingSuggest) setIsLoadingSuggest(false);
                      setParsedParagraphs([]); // Clear DOCX paragraphs
                      setUploadedFile(null);
                      setCheckContentResult(null);
                      setUserModifiedText(null);
                    } else {
                      if (inputText.split(/\s+/).filter(Boolean).length >= MIN_WORDS_FOR_AUTO_SUGGEST) {
                        debouncedFetchSuggestions(inputText, true);
                      }
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
                <Label htmlFor="tone-select" className="flex items-center gap-1.5"><Wand2 className="h-4 w-4"/> Tone (for As-You-Type Suggestions)</Label>
                <Select
                  value={selectedTone || "none"}
                  onValueChange={handleToneChange}
                  disabled={!isAiAssistanceEnabled || isLoadingSuggest || isLoadingCheck || isCheckingAll || isUploading}
                >
                  <SelectTrigger id="tone-select" className="w-full md:w-[220px]">
                    <SelectValue placeholder="Select tone (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (General)</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="persuasive">Persuasive</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="file-upload-input" className="flex items-center gap-1.5"><UploadCloud className="h-4 w-4"/> Upload DOCX File</Label>
                 <Input
                    id="file-upload-input"
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileUpload} 
                    className="file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                    disabled={!isAiAssistanceEnabled || isUploading || isLoadingCheck || isLoadingSuggest || isCheckingAll}
                  />
                {/* <p className="text-xs text-amber-600">Feature coming soon! Use manual text input for now.</p> */}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-border">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">Enter Text Manually</CardTitle>
              <CardDescription>Type or paste content. Tone-aware suggestions for your full text appear automatically below as you type (min {MIN_WORDS_FOR_AUTO_SUGGEST} words).</CardDescription>
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
                  if (uploadedFile) setUploadedFile(null); 
                  if (parsedParagraphs.length > 0) setParsedParagraphs([]); 
                }}
                className="flex-grow min-h-[200px] sm:min-h-[250px] text-base bg-card border-input focus:ring-primary"
                rows={10}
                disabled={parsedParagraphs.length > 0 && !inputText} 
              />
              
              {renderAsYouTypeSuggestions()}

              <div className="flex flex-col sm:flex-row gap-2">
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
                  {uploadedFile && parsedParagraphs.length > 0 
                    ? "Document paragraphs are listed below. Expand to preview. Click 'Check' or 'Check All' for AI analysis and editing." 
                    : "Enter text manually and click 'Check Typed Text (Grammar)' to see results, or upload a DOCX file."}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4">
              {isAiAssistanceEnabled && (
                <>
                  {checkContentResult && !uploadedFile && parsedParagraphs.length === 0 && (
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
                          value={userModifiedText ?? ''}
                          onChange={(e) => handleUserModifiedTextChange(e.target.value)}
                          className="min-h-[200px] text-base bg-card border-input focus:ring-primary"
                          rows={10}
                          placeholder="AI corrected text will appear here. You can edit it further."
                        />
                      </TabsContent>
                    </Tabs>
                  )}

                  {parsedParagraphs.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Document Paragraphs ({parsedParagraphs.length})</h3>
                        <Button 
                          onClick={handleCheckAllParagraphs} 
                          disabled={!canCheckOrSuggest || isCheckingAll || parsedParagraphs.every(p => p.result || p.error)}
                          size="sm"
                          variant="outline"
                        >
                          {isCheckingAll ? <Loader2 className="animate-spin"/> : <FileCheck2/>}
                          Check All Paragraphs
                        </Button>
                      </div>
                      <Accordion type="multiple" className="w-full space-y-2">
                        {parsedParagraphs.map((para, index) => (
                          <AccordionItem value={para.id} key={para.id} className="border bg-card rounded-md shadow-sm">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                              <div className="flex items-center gap-3 flex-1 text-left">
                                {para.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : 
                                 para.result ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : 
                                 para.error ? <AlertCircle className="h-5 w-5 text-destructive" /> :
                                 <FileText className="h-5 w-5 text-muted-foreground" />}
                                <span className="truncate">
                                  Paragraph {index + 1}: {para.originalText.substring(0, 50)}{para.originalText.length > 50 ? "..." : ""}
                                </span>
                              </div>
                              {!para.result && !para.isLoading && !para.error && (
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent accordion from toggling
                                    handleCheckContent(para.originalText, true, para.id);
                                  }}
                                  disabled={!canCheckOrSuggest || para.isLoading || isCheckingAll}
                                  className="ml-auto flex-shrink-0"
                                >
                                  <span>
                                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Check
                                  </span>
                                </Button>
                              )}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              {!para.result && !para.isLoading && !para.error && (
                                <div className="p-3 border rounded-md bg-background my-2">
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Preview: Original Paragraph Content</p>
                                  <p className="text-sm whitespace-pre-wrap">{para.originalText}</p>
                                  <p className="text-xs text-muted-foreground mt-2">Click "Check" above to analyze this paragraph.</p>
                                </div>
                              )}
                              {para.isLoading && (
                                <div className="flex items-center justify-center p-4 text-muted-foreground">
                                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Analyzing paragraph...
                                </div>
                              )}
                              {para.error && (
                                <AlertCircle className="text-destructive">
                                  <p className="font-semibold">Error:</p>
                                  <p>{para.error}</p>
                                </AlertCircle>
                              )}
                              {para.result && (
                                <Tabs defaultValue="interactive" className="w-full mt-2">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="interactive">Interactive Corrections</TabsTrigger>
                                    <TabsTrigger value="corrected">Editable Corrected Text</TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="interactive">
                                    <InteractiveCorrector
                                      text={para.userModifiedText ?? para.result.correctedContent}
                                      aiSuggestions={para.result.suggestions || []}
                                      onTextChange={(newText) => handleParagraphUserModifiedTextChange(para.id, newText)}
                                    />
                                  </TabsContent>
                                  <TabsContent value="corrected">
                                    <Textarea
                                      value={para.userModifiedText ?? para.result.correctedContent ?? ''}
                                      onChange={(e) => handleParagraphUserModifiedTextChange(para.id, e.target.value)}
                                      className="min-h-[150px] text-base bg-card border-input focus:ring-primary"
                                      rows={5}
                                      placeholder="AI corrected text will appear here. You can edit it further."
                                    />
                                  </TabsContent>
                                </Tabs>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
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
    

    