
'use server';
/**
 * @fileOverview Flow for generating a single, enhanced content suggestion.
 *
 * - suggestContent - A function that provides a single, enhanced content suggestion.
 * - SuggestContentInput - The input type for the suggestContent function.
 * - SuggestContentOutput - The return type for the suggestContent function, containing one enhanced piece of content.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestContentInputSchema = z.object({
  content: z.string().describe('The original content to get an enhanced suggestion for.'),
  language: z
    .enum(['english', 'hindi', 'gujarati'])
    .describe('The language of the content.'),
  tone: z
    .enum([
        'neutral', 
        'formal', 
        'casual', 
        'persuasive', 
        'creative', 
        'professional', 
        'medical_healthcare', 
        'financial_investment', 
        'technical',
        'tips',
        'explain',
        'information',
        'process',
        'education',
        'engaging',
        'guide'
    ])
    .optional()
    .describe('The desired style/tone for the enhanced content. If not provided, the suggestion will be creatively neutral.'),
});
export type SuggestContentInput = z.infer<typeof SuggestContentInputSchema>;

const SuggestContentOutputSchema = z.object({
  enhancedContent: z
    .string()
    .describe(
      'A single, high-quality, enhanced version of the input text, matching the specified style/tone if provided. This should be a complete, ready-to-use piece of content.'
    ),
});
export type SuggestContentOutput = z.infer<typeof SuggestContentOutputSchema>;

export async function suggestContent(input: SuggestContentInput): Promise<SuggestContentOutput> {
  return suggestContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestContentPrompt',
  input: {schema: SuggestContentInputSchema},
  output: {schema: SuggestContentOutputSchema},
  prompt: `You are a highly creative content generation assistant, specializing in crafting engaging and polished text.
Based on the provided text, language, {{#if tone}}and desired style/tone ({{{tone}}}), {{else}} {{/if}}generate **one single, best, enhanced version** of the content. This output should be a complete, ready-to-use piece of text.

If a specific style/tone is requested, ensure your suggestion strictly adheres to its characteristics:
- neutral: Impartial and objective language.
- formal: Serious, official, and adhering to conventions.
- casual: Relaxed, informal, and conversational.
- persuasive: Aiming to convince or influence.
- creative: Original, imaginative, and artistic.
- professional: Business-oriented, polished, and suitable for professional communication.
- medical_healthcare: Appropriate for health-related topics, using clear and respectful language, possibly incorporating relevant terminology. CRITICALLY IMPORTANT: DO NOT PROVIDE ANY MEDICAL ADVICE.
- financial_investment: Suitable for discussing financial markets or investments, using appropriate terminology. CRITICALLY IMPORTANT: DO NOT PROVIDE ANY FINANCIAL ADVICE OR SPECIFIC INVESTMENT RECOMMENDATIONS.
- technical: Precise and informative, suitable for explaining technical subjects, often using specific jargon.
- tips: Provide actionable advice, short and practical suggestions, or helpful hints related to the content, formatted as a cohesive piece of text.
- explain: Clearly break down a concept or process mentioned in the content, making it easier to understand, presented as a single coherent explanation.
- information: Present key facts, data, or details related to the content in a straightforward and informative manner, as a single block of text.
- process: Describe steps or a sequence of actions relevant to the content, outlining how to achieve an outcome, as a unified description.
- education: Impart knowledge, teach a concept from the content, or rephrase it as learning material, in a single, coherent piece.
- engaging: Make the content more captivating, encourage interaction, or rephrase it to be more interesting, as one enhanced text.
- guide: Provide step-by-step instructions based on the content or rephrase it as a helpful guide to lead a user through a task, presented as a single, cohesive guide.

The goal is to produce a single, high-quality piece of enhanced content. For example, if the input is a rough idea, the output should be a well-written paragraph or social media post.

Language: {{{language}}}
{{#if tone}}
Desired Style/Tone: {{{tone}}}
{{/if}}
Original Text: {{{content}}}
`,
});

const suggestContentFlow = ai.defineFlow(
  {
    name: 'suggestContentFlow',
    inputSchema: SuggestContentInputSchema,
    outputSchema: SuggestContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
