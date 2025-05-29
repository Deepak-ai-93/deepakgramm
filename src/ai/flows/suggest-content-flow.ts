
'use server';
/**
 * @fileOverview Flow for generating content suggestions and enhancements.
 *
 * - suggestContent - A function that provides content suggestions.
 * - SuggestContentInput - The input type for the suggestContent function.
 * - SuggestContentOutput - The return type for the suggestContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestContentInputSchema = z.object({
  content: z.string().describe('The original content to get suggestions for.'),
  language: z
    .enum(['english', 'hindi', 'gujarati'])
    .describe('The language of the content.'),
  tone: z
    .enum(['neutral', 'formal', 'casual', 'persuasive', 'creative'])
    .optional()
    .describe('The desired tone for the content suggestions. If not provided, suggestions will be general or creatively neutral.'),
});
export type SuggestContentInput = z.infer<typeof SuggestContentInputSchema>;

const SuggestContentOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe(
      'An array of 3-5 distinct content suggestions, such as alternative phrasings, expansions, or rewordings for the input text, matching the specified tone if provided.'
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
  prompt: `You are a creative writing assistant and expert editor.
Based on the provided text, language, {{#if tone}}and desired tone ({{{tone}}}), {{else}} {{/if}}offer 3-5 distinct suggestions to enhance, expand, or rephrase the content.
Suggestions could include:
- Alternative openings or closings.
- Stronger vocabulary or more vivid descriptions.
- Ways to elaborate on key points or add supporting details.
- Different angles to approach the topic or improve clarity.
- Methods to improve engagement or impact.

Aim to provide actionable and diverse suggestions.

Language: {{{language}}}
{{#if tone}}
Desired Tone: {{{tone}}}
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

