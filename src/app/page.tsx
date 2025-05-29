
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

  const [isAiAssistanceEnabled, setIsAiAssistanceEnabled] = useState<true>(true);

  const baseTitle = "Deepak Checker AI: AI-Powered Content Checker";

  useEffect(() => {
    if (isAiAssistanceEnabled) {
      document.title = `🧠 ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [isAiAssistanceEnabled, baseTitle]);

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value as Language);
    setCheckContentResult(null);
    setUserModifiedText(null);
    // Content suggestions will be re-fetched by useEffect if inputText and tone change.
    if (parsedParagraphs.length > 0) {
      setParsedParagraphs(prev => prev.map(p => ({ ...p, result: null, error: null, userModifiedText: null, isLoading: false })));
    }
  };

  const handleToneChange = (value: string) => {
    setSelectedTone(value as Tone);
    // Content suggestions will be re-fetched by useEffect if inputText is present
  };

  const handleCheckContent = async (textToCheck: string, isParagraph: boolean = false, paragraphId?: string) => {
    if (!isAiAssistanceEnabled) {
      toast({ title: "AI Disabled", description: "AI assistance is currently disabled.", variant: "destructive" });
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

  const fetchSuggestions = useCallback(async (textToSuggest: string, showToast: boolean = false, applyTone: boolean = true) => {
    if (!isAiAssistanceEnabled || !textToSuggest.trim() || textToSuggest.split(/\s+/).length < MIN_WORDS_FOR_AUTO_SUGGEST) {
      setContentSuggestions([]);
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
      if (showToast) {
        toast({ title: "Suggestions Ready", description: "Content suggestions have been generated." });
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      if (showToast) {
        toast({ title: "Error Fetching Suggestions", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
      }
      setContentSuggestions([]);
    } finally {
      setIsLoadingSuggest(false);
    }
  }, [selectedLanguage, selectedTone, toast, isAiAssistanceEnabled]);

  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
  };

  const debouncedFetchSuggestions = useMemo(() => debounce(fetchSuggestions, AUTO_SUGGEST_DEBOUNCE_TIME), [fetchSuggestions]);

  useEffect(() => {
    if (inputText && isAiAssistanceEnabled) {
      // For as-you-type, apply tone is true
      debouncedFetchSuggestions(inputText, false, true); 
    } else {
      setContentSuggestions([]);
    }
  }, [inputText, debouncedFetchSuggestions, isAiAssistanceEnabled, selectedLanguage, selectedTone]);


  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!isAiAssistanceEnabled) {
      toast({ title: "AI Disabled", description: "File upload requires AI assistance to be enabled.", variant: "destructive" });
      return;
    }
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setUploadedFile(file);
        setIsUploading(true);
        setParsedParagraphs([]); 
        setCheckContentResult(null); 
        setUserModifiedText(null);
        setContentSuggestions([]);
        toast({ title: "File Uploaded", description: `Processing ${file.name}...` });
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const paragraphs = result.value.split(/\n\s*\n/).filter(p => p.trim() !== "").map((p, index) => ({
            id: `para_${index}_${Date.now()}`,
            originalText: p.trim(),
            isLoading: false,
            result: null,
            error: null,
            userModifiedText: null,
          }));
          setParsedParagraphs(paragraphs);
          toast({ title: "File Processed", description: `${paragraphs.length} paragraphs loaded.` });
        } catch (error) {
          console.error("Error parsing DOCX:", error);
          toast({ title: "Error Parsing DOCX", description: "Could not read content from the file.", variant: "destructive" });
          setParsedParagraphs([]);
        } finally {
          setIsUploading(false);
        }
      } else {
        toast({ title: "Invalid File Type", description: "Please upload a .docx file.", variant: "destructive" });
        setUploadedFile(null);
        event.target.value = ""; 
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

  const currentWorkingText = userModifiedText ?? inputText;
  const canCheckOrSuggest = isAiAssistanceEnabled && !isLoadingCheck && !isLoadingSuggest && !isCheckingAll && !isUploading;

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
              <CardDescription>Configure AI assistance, language, tone, and input method.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 flex-grow">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ai-assistance-toggle"
                  checked={isAiAssistanceEnabled}
                  onCheckedChange={setIsAiAssistanceEnabled}
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
                  value={selectedTone}
                  onValueChange={handleToneChange}
                  disabled={!isAiAssistanceEnabled || isLoadingSuggest}
                >
                  <SelectTrigger id="tone-select" className="w-full md:w-[220px]"> {/* Wider for clarity */}
                    <SelectValue placeholder="Select tone (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="persuasive">Persuasive</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="file-upload" className="flex items-center gap-1.5"><UploadCloud className="h-4 w-4"/> Upload DOCX File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  disabled={!isAiAssistanceEnabled || isLoadingCheck || isLoadingSuggest || isCheckingAll || isUploading}
                  className="file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-border">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">Enter Text Manually</CardTitle>
              <CardDescription>Type or paste your content below. Tone-aware suggestions will appear as you type.</CardDescription>
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
                }}
                className="flex-grow min-h-[200px] sm:min-h-[250px] text-base bg-card border-input focus:ring-primary"
                rows={10}
                disabled={!isAiAssistanceEnabled && parsedParagraphs.length > 0} 
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => fetchSuggestions(inputText, true, false)} // applyTone is false for button
                  disabled={!canCheckOrSuggest || !inputText.trim()}
                  className="flex-1"
                  variant="outline"
                >
                  {isLoadingSuggest ? <Loader2 className="animate-spin" /> : <Lightbulb />}
                  Get General Suggestions
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
          
          {isAiAssistanceEnabled && contentSuggestions.length > 0 && (
            <Card className="shadow-lg border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="text-primary"/> Content Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  {contentSuggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
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
              ) : uploadedFile && parsedParagraphs.length === 0 && !isUploading ? (
                <CardDescription>No paragraphs found in the uploaded file or file is empty.</CardDescription>
              ) : uploadedFile && isUploading ? (
                <CardDescription className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4"/>Processing uploaded file...</CardDescription>
              ) : parsedParagraphs.length > 0 ? (
                 <CardDescription>Document paragraphs are listed below. Expand to preview. Click 'Check' or 'Check All' for AI analysis and editing.</CardDescription>
              ) : (
                <CardDescription>Enter text or upload a DOCX file and click 'Check' to see results.</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4">
              {isAiAssistanceEnabled && (
                <>
                  {/* Results for Manual Input */}
                  {checkContentResult && !uploadedFile && (
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

                  {/* Results for DOCX Upload */}
                  {parsedParagraphs.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <Button
                        onClick={handleCheckAllParagraphs}
                        disabled={!canCheckOrSuggest || parsedParagraphs.every(p => p.result || p.error)}
                        variant="outline"
                        className="w-full"
                      >
                        {isCheckingAll ? <Loader2 className="animate-spin" /> : <FileCheck2 />}
                        Check All Paragraphs
                      </Button>
                      <Accordion type="multiple" className="w-full space-y-2">
                        {parsedParagraphs.map((para, index) => (
                          <AccordionItem value={para.id} key={para.id} className="border bg-card rounded-md shadow-sm">
                            <AccordionTrigger className="px-4 py-3 text-left hover:bg-muted/50 rounded-t-md">
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium truncate pr-2">Paragraph {index + 1}</span>
                                <div className="ml-auto flex items-center gap-2">
                                {para.isLoading && <Loader2 className="animate-spin h-5 w-5 text-primary" />}
                                {para.result && !para.isLoading && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                {para.error && !para.isLoading && <AlertCircle className="h-5 w-5 text-red-500" />}
                                {!para.isLoading && !para.result && !para.error && (
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                        e.stopPropagation(); 
                                        if (!isCheckingAll) handleCheckContent(para.originalText, true, para.id);
                                        }}
                                        disabled={isCheckingAll || para.isLoading}
                                        className="ml-auto flex-shrink-0"
                                    >
                                        <span><CheckCircle2 className="mr-1 h-4 w-4"/>Check</span>
                                    </Button>
                                )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 py-3 border-t">
                              {!para.result && !para.isLoading && !para.error && (
                                 <div className="p-3 border border-dashed rounded-md bg-muted/30">
                                  <h4 className="font-semibold text-sm mb-1">Preview: Original Paragraph Content</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{para.originalText}</p>
                                  <p className="text-xs text-muted-foreground mt-2">Click "Check" above to analyze this paragraph.</p>
                                 </div>
                              )}
                              {para.error && (
                                <div className="text-red-500 flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  <span>Error: {para.error}</span>
                                </div>
                              )}
                              {para.result && (
                                <Tabs defaultValue="interactive-para" className="w-full">
                                  <TabsList className="grid w-full grid-cols-2 mb-2">
                                    <TabsTrigger value="interactive-para">Interactive</TabsTrigger>
                                    <TabsTrigger value="corrected-para">Editable Corrected</TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="interactive-para">
                                    <InteractiveCorrector
                                      text={para.userModifiedText ?? para.originalText}
                                      aiSuggestions={para.result.suggestions || []}
                                      onTextChange={(newText) => handleParagraphUserModifiedTextChange(para.id, newText)}
                                      className="min-h-[100px]"
                                    />
                                  </TabsContent>
                                  <TabsContent value="corrected-para">
                                    <Textarea
                                      value={para.userModifiedText ?? ''}
                                      onChange={(e) => handleParagraphUserModifiedTextChange(para.id, e.target.value)}
                                      className="min-h-[100px] text-sm bg-card border-input focus:ring-primary"
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
                <CardFooter className="text-center text-muted-foreground text-sm p-4">
                    Enable AI Assistance from the 'Input Options' panel to use checking and suggestion features.
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
