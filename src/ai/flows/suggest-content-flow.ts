
'use server';
/**
 * @fileOverview Flow for generating creative content suggestions, including for social media.
 *
 * - suggestContent - A function that provides creative content suggestions.
 * - SuggestContentInput - The input type for the suggestContent function.
 * - SuggestContentOutput - The return type for the suggestContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestContentInputSchema = z.object({
  content: z.string().describe('The original content to get creative suggestions for.'),
  language: z
    .enum(['english', 'hindi', 'gujarati'])
    .describe('The language of the content.'),
  tone: z
    .enum(['neutral', 'formal', 'casual', 'persuasive', 'creative'])
    .optional()
    .describe('The desired tone for the content suggestions. If not provided, suggestions will be creatively neutral.'),
});
export type SuggestContentInput = z.infer<typeof SuggestContentInputSchema>;

const SuggestContentOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe(
      'An array of 3-5 distinct and creative content suggestions, such as alternative phrasings, expansions, social media post ideas, or rewordings for the input text, matching the specified tone if provided.'
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
  prompt: `You are a highly creative content generation assistant, specializing in crafting engaging social media posts and other creative text formats.
Based on the provided text, language, {{#if tone}}and desired tone ({{{tone}}}), {{else}} {{/if}}offer 3-5 distinct and creative suggestions to enhance, expand, or rephrase the content.

Suggestions could include:
- Catchy headlines or hooks for social media.
- Alternative ways to phrase ideas for better engagement.
- Ideas for calls to action.
- Short social media post drafts based on the input.
- Creative expansions or storytelling angles.
- Suggestions for relevant hashtags (if appropriate for social media context and the input seems geared towards it).

Aim for actionable, diverse, and inspiring suggestions. If the input seems like a topic, provide a few sample short posts or creative content ideas.

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
