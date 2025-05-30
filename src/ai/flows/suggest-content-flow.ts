
'use server';
/**
 * @fileOverview Flow for generating a single, enhanced content suggestion,
 * focusing on social media posts and ad copy.
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
    .describe('The desired style/tone for the enhanced content. If not provided, the suggestion will be creatively neutral within a social media/ad context.'),
});
export type SuggestContentInput = z.infer<typeof SuggestContentInputSchema>;

const SuggestContentOutputSchema = z.object({
  enhancedContent: z
    .string()
    .describe(
      'A single, high-quality, enhanced version of the input text, suitable for a social media post or ad copy, matching the specified style/tone if provided. This should be a complete, ready-to-use piece of content.'
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
  prompt: `You are an expert marketing copywriter and social media strategist, specializing in crafting concise, impactful, and highly engaging content for social media posts, advertisements, and similar short-form digital communication.
Based on the provided text, language, {{#if tone}}and desired style/tone ({{{tone}}}), {{else}} {{/if}}generate **one single, best, enhanced version** of the content.
This output should be a complete, ready-to-use piece of text suitable for a social media platform or as ad copy. Consider elements like calls-to-action, relevant emojis (use sparingly and appropriately), and strong hooks.

If a specific style/tone is requested, ensure your suggestion strictly adheres to its characteristics, keeping the social media/ad context in mind:
- neutral: Impartial and objective language, suitable for informative social media updates.
- formal: Serious, official, and adhering to conventions, perhaps for a LinkedIn post or formal announcement.
- casual: Relaxed, informal, and conversational, great for engaging with an audience on platforms like Instagram or Twitter.
- persuasive: Aiming to convince or influence, ideal for ad copy or promotional posts.
- creative: Original, imaginative, and artistic, to make posts stand out.
- professional: Business-oriented, polished, suitable for professional social media communication (e.g., B2B).
- medical_healthcare: Appropriate for health-related topics, using clear and respectful language, possibly incorporating relevant terminology for social media. CRITICALLY IMPORTANT: DO NOT PROVIDE ANY MEDICAL ADVICE.
- financial_investment: Suitable for discussing financial markets or investments, using appropriate terminology for social media. CRITICALLY IMPORTANT: DO NOT PROVIDE ANY FINANCIAL ADVICE OR SPECIFIC INVESTMENT RECOMMENDATIONS.
- technical: Precise and informative, suitable for explaining technical subjects in a concise way for social media.
- tips: Provide actionable advice, short and practical suggestions, or helpful hints, formatted as a shareable social media tip.
- explain: Clearly break down a concept or process mentioned in the content, making it easy to understand for a social media audience.
- information: Present key facts, data, or details related to the content in a straightforward and informative manner, suitable for a quick social media update.
- process: Describe steps or a sequence of actions relevant to the content, outlining how to achieve an outcome, as a concise social media guide.
- education: Impart knowledge, teach a concept from the content, or rephrase it as learning material suitable for a short educational social media post.
- engaging: Make the content more captivating, encourage interaction, or rephrase it to be more interesting for social media.
- guide: Provide step-by-step instructions based on the content or rephrase it as a helpful guide to lead a user through a task, presented as a concise social media guide.

The goal is to produce a single, high-quality piece of content ready for digital marketing or social media. For example, if the input is a product description, the output might be a compelling tweet, an Instagram caption, or a short ad blurb. If the input is a general idea, transform it into a shareable social media update.

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
