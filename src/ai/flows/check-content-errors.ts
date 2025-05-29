// 'use server';

/**
 * @fileOverview Flow for checking content for spelling and grammatical errors in multiple languages.
 *
 * - checkContentErrors - A function that checks content for errors and provides suggestions.
 * - CheckContentErrorsInput - The input type for the checkContentErrors function.
 * - CheckContentErrorsOutput - The return type for the checkContentErrors function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CheckContentErrorsInputSchema = z.object({
  content: z.string().describe('The content to check for spelling and grammatical errors.'),
  language: z
    .enum(['english', 'hindi', 'gujarati'])
    .describe('The language of the content.'),
});
export type CheckContentErrorsInput = z.infer<typeof CheckContentErrorsInputSchema>;

const CheckContentErrorsOutputSchema = z.object({
  correctedContent: z.string().describe('The content with spelling and grammatical errors corrected.'),
  suggestions: z
    .array(z.object({word: z.string(), suggestions: z.array(z.string())}))
    .describe('Suggestions for corrections.'),
});
export type CheckContentErrorsOutput = z.infer<typeof CheckContentErrorsOutputSchema>;

export async function checkContentErrors(input: CheckContentErrorsInput): Promise<CheckContentErrorsOutput> {
  return checkContentErrorsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'checkContentErrorsPrompt',
  input: {schema: CheckContentErrorsInputSchema},
  output: {schema: CheckContentErrorsOutputSchema},
  prompt: `You are a language expert. You will check the given content for spelling and grammatical errors in the specified language. Then provide corrected content and suggestions for each word having errors. The response must be in JSON format.

Language: {{{language}}}
Content: {{{content}}}
`,
});

const checkContentErrorsFlow = ai.defineFlow(
  {
    name: 'checkContentErrorsFlow',
    inputSchema: CheckContentErrorsInputSchema,
    outputSchema: CheckContentErrorsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
