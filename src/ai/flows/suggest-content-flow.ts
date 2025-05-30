
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
    .describe('The desired tone for the content suggestions. If not provided, suggestions will be creatively neutral.'),
});
export type SuggestContentInput = z.infer<typeof SuggestContentInputSchema>;

const SuggestContentOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe(
      'An array of creative content suggestions, aiming for 3 to 5 distinct items. Each suggestion should aim to enhance, expand, or rephrase the input text, matching the specified tone if provided. Examples include alternative phrasings, social media post ideas, or rewordings.'
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
Based on the provided text, language, {{#if tone}}and desired style/tone ({{{tone}}}), {{else}} {{/if}}generate an array of 3 to 5 distinct and creative suggestions to enhance, expand, or rephrase the content. It is crucial to provide multiple varied options.

If a specific style/tone is requested, ensure your suggestions strictly adhere to its characteristics:
- neutral: Impartial and objective language.
- formal: Serious, official, and adhering to conventions.
- casual: Relaxed, informal, and conversational.
- persuasive: Aiming to convince or influence.
- creative: Original, imaginative, and artistic.
- professional: Business-oriented, polished, and suitable for professional communication.
- medical_healthcare: Appropriate for health-related topics, using clear and respectful language, possibly incorporating relevant terminology. CRITICALLY IMPORTANT: DO NOT PROVIDE ANY MEDICAL ADVICE.
- financial_investment: Suitable for discussing financial markets or investments, using appropriate terminology. CRITICALLY IMPORTANT: DO NOT PROVIDE ANY FINANCIAL ADVICE OR SPECIFIC INVESTMENT RECOMMENDATIONS.
- technical: Precise and informative, suitable for explaining technical subjects, often using specific jargon.
- tips: Provide actionable advice, short and practical suggestions, or helpful hints related to the content.
- explain: Clearly break down a concept or process mentioned in the content, making it easier to understand.
- information: Present key facts, data, or details related to the content in a straightforward and informative manner.
- process: Describe steps or a sequence of actions relevant to the content, outlining how to achieve an outcome.
- education: Impart knowledge, teach a concept from the content, or rephrase it as learning material.
- engaging: Make the content more captivating, encourage interaction, or rephrase it to be more interesting.
- guide: Provide step-by-step instructions based on the content or rephrase it as a helpful guide to lead a user through a task.

Suggestions could include:
- Catchy headlines or hooks for social media.
- Alternative ways to phrase ideas for better engagement.
- Ideas for calls to action.
- Short social media post drafts based on the input.
- Creative expansions or storytelling angles.
- Suggestions for relevant hashtags (if appropriate for social media context and the input seems geared towards it).

Aim for actionable, diverse, and inspiring suggestions. If the input seems like a topic, provide a few sample short posts or creative content ideas. Ensure you return an array of suggestions.

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
