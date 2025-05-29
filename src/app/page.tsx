
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InteractiveCorrector } from "@/components/linguacheck/InteractiveCorrector";
import { checkContentErrors, CheckContentErrorsInput, CheckContentErrorsOutput } from "@/ai/flows/check-content-errors";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookText, LanguagesIcon, FileText, UploadCloud, FileCheck2 } from "lucide-react";
import Image from 'next/image';
import mammoth from 'mammoth';
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
}

export default function LinguaCheckPage() {
  const [inputText, setInputText] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageValue>('english');
  const [isLoading, setIsLoading] = useState<boolean>(false); // For main text area
  const [apiResponse, setApiResponse] = useState<CheckContentErrorsOutput | null>(null); // For main text area
  const [userModifiedText, setUserModifiedText] = useState<string>(""); // For main text area

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedParagraphs, setParsedParagraphs] = useState<ParagraphItem[]>([]);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!apiResponse || inputText === "") {
      setUserModifiedText(inputText);
    }
  }, [inputText]);

  const handleMainSubmit = async () => {
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
    setParsedParagraphs([]); // Clear any file upload results
    setUploadedFileName(null);
    setUserModifiedText(inputText);

    try {
      const input: CheckContentErrorsInput = { content: inputText, language: selectedLanguage };
      const result = await checkContentErrors(input);
      setApiResponse(result);
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

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith('.docx')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .docx file.",
        variant: "destructive",
      });
      return;
    }

    setIsFileProcessing(true);
    setUploadedFileName(file.name);
    setInputText(""); // Clear main text area
    setApiResponse(null); // Clear main text area results
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
        .filter(p => p.originalText.length > 0); // Filter out empty paragraphs

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
          description: `Found ${paragraphs.length} paragraph(s) in ${file.name}. You can now check them individually.`,
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
      // Reset file input to allow uploading the same file again if needed
      event.target.value = ""; 
    }
  };

  const handleCheckParagraph = async (paragraphId: string) => {
    const paragraphIndex = parsedParagraphs.findIndex(p => p.id === paragraphId);
    if (paragraphIndex === -1) return;

    const paragraph = parsedParagraphs[paragraphIndex];

    setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, isLoading: true, apiResponse: undefined } : p));

    try {
      const input: CheckContentErrorsInput = { content: paragraph.originalText, language: selectedLanguage };
      const result = await checkContentErrors(input);
      setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, isLoading: false, apiResponse: result, userModifiedText: result.correctedContent } : p));
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
  
  const handleParagraphTextChange = (paragraphId: string, newText: string) => {
    setParsedParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, userModifiedText: newText } : p));
  };


  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background text-foreground font-sans">
      <header className="mb-6 md:mb-8 text-center">
        <div className="inline-flex items-center justify-center gap-2 md:gap-3">
           <BookText className="h-10 w-10 md:h-12 md:w-12 text-primary" />
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground bg-primary px-3 py-1 md:px-4 md:py-2 rounded-lg shadow-md">
            Deepak Checker AI
          </h1>
        </div>
        <p className="mt-2 md:mt-3 text-md md:text-lg text-muted-foreground">
          Your AI-powered assistant for flawless writing in multiple languages. Upload DOCX files for paragraph-wise checks.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-grow">
        {/* Left Panel: Input & File Upload */}
        <Card className="md:w-1/2 w-full flex flex-col shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <LanguagesIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              Input Options
            </CardTitle>
            <CardDescription className="text-sm">Paste text or upload a DOCX file.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-grow">
            {/* Language Selector - Common for both methods */}
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
              </div>
            
            {/* Manual Text Input */}
            <div className="border p-4 rounded-md bg-card/50">
              <label htmlFor="manual-text-input" className="block text-sm font-medium text-muted-foreground mb-1">Enter Text Manually:</label>
              <Textarea
                id="manual-text-input"
                placeholder="Start typing or paste your content here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-grow min-h-[150px] sm:min-h-[200px] text-base bg-card border-input focus:ring-primary"
                rows={8}
              />
              <Button onClick={handleMainSubmit} disabled={isLoading || isFileProcessing} className="w-full mt-3 text-base py-3">
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
            
            {/* File Upload */}
            <div className="border p-4 rounded-md bg-card/50">
              <label htmlFor="file-upload-input" className="block text-sm font-medium text-muted-foreground mb-1">Or Upload DOCX File:</label>
              <div className="flex items-center gap-3">
                <Input
                  id="file-upload-input"
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  disabled={isFileProcessing || isLoading}
                  className="flex-grow file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>
              {isFileProcessing && (
                <div className="mt-2 flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing document...
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Right Panel: Output */}
        <Card className="md:w-1/2 w-full flex flex-col shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              {(uploadedFileName || parsedParagraphs.length > 0) ? <FileCheck2 className="h-6 w-6 text-primary"/> : <FileText className="h-6 w-6 text-primary"/>}
              Results & Corrections
            </CardTitle>
            <CardDescription className="text-sm">
              {apiResponse || parsedParagraphs.length > 0 ? "Review suggestions or view the AI-corrected text." : "Results will appear here after checking."}
              {uploadedFileName && ` Showing results for: ${uploadedFileName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {/* Loading state for main text input */}
            {isLoading && !apiResponse && parsedParagraphs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary mb-4" />
                <p className="text-md md:text-lg">Analyzing your text...</p>
                <p className="text-sm">This might take a few moments.</p>
              </div>
            )}

            {/* Placeholder for when nothing is loaded (neither main text nor file) */}
            {!isLoading && !apiResponse && parsedParagraphs.length === 0 && !isFileProcessing && (
               <div className="flex flex-col items-center justify-center h-full text-center p-4 rounded-lg border-2 border-dashed border-input">
                 <Image src="https://placehold.co/200x150.png" alt="Placeholder illustration" width={200} height={150} className="opacity-60 rounded mb-4" data-ai-hint="analysis document" />
                 <p className="text-muted-foreground text-md md:text-lg">Your content analysis will show up here.</p>
                 <p className="text-xs md:text-sm text-muted-foreground">Enter text or upload a DOCX file on the left.</p>
               </div>
            )}
            
            {/* Display for main text area results */}
            {apiResponse && parsedParagraphs.length === 0 && (
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

            {/* Display for parsed paragraphs from DOCX */}
            {parsedParagraphs.length > 0 && (
              <ScrollArea className="h-[calc(100%-0px)] pr-3"> {/* Adjust height as needed */}
                <Accordion type="multiple" className="w-full space-y-2">
                  {parsedParagraphs.map((para, index) => (
                    <AccordionItem value={para.id} key={para.id} className="border bg-card/50 rounded-md shadow">
                      <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                        <div className="flex items-center gap-3 w-full">
                          <span className="font-semibold text-primary">{`Paragraph ${index + 1}`}</span>
                          <p className="text-sm text-muted-foreground truncate flex-grow text-left DDLM_IGNORED">
                             {para.originalText.substring(0,80)}{para.originalText.length > 80 ? '...' : ''}
                          </p>
                          {!para.apiResponse && !para.isLoading && (
                             <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); handleCheckParagraph(para.id); }} 
                                className="ml-auto flex-shrink-0"
                                disabled={isFileProcessing}
                              >
                                Check
                              </Button>
                          )}
                          {para.isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary ml-auto flex-shrink-0" />}
                           {para.apiResponse && <FileCheck2 className="h-5 w-5 text-green-500 ml-auto flex-shrink-0" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-0">
                        {para.isLoading && !para.apiResponse && (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-2 text-muted-foreground">Checking paragraph...</p>
                          </div>
                        )}
                        {para.apiResponse && (
                          <Tabs defaultValue="interactive" className="w-full mt-2">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="interactive">Interactive Corrections</TabsTrigger>
                              <TabsTrigger value="ai-corrected">AI Corrected Text</TabsTrigger>
                            </TabsList>
                            <TabsContent value="interactive" className="mt-2">
                              <InteractiveCorrector
                                text={para.userModifiedText}
                                aiSuggestions={para.apiResponse.suggestions || []}
                                onTextChange={(newText) => handleParagraphTextChange(para.id, newText)}
                                className="min-h-[100px] bg-card border"
                              />
                            </TabsContent>
                            <TabsContent value="ai-corrected" className="mt-2">
                              <Textarea
                                readOnly
                                value={para.apiResponse.correctedContent}
                                className="min-h-[100px] text-base bg-card border-input focus:ring-0"
                                rows={5}
                              />
                            </TabsContent>
                          </Tabs>
                        )}
                        {!para.isLoading && !para.apiResponse && (
                            <div className="text-sm text-muted-foreground py-4 border-t mt-2">
                                <p>Original Text:</p>
                                <p className="whitespace-pre-wrap p-2 bg-background/30 rounded mt-1">{para.originalText}</p>
                                Click "Check" to analyze this paragraph.
                            </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
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

