/**
 * Critique Agent Prompt Templates
 *
 * Prompts for critiquing and scoring brand strategies, providing recommendations.
 *
 * @example
 * ```typescript
 * import { createCritiquePrompt } from '@/lib/ai/prompts/critique';
 *
 * const prompt = createCritiquePrompt({
 *   strategy: '...',
 *   focusAreas: ['positioning', 'messaging'],
 * });
 * ```
 */

/**
 * Critique prompt context
 */
export interface CritiqueContext {
  strategy: string; // Output from strategy agent
  research?: string; // Optional: research context for validation
  focusAreas?: string[]; // Optional: specific areas to critique
  industry?: string;
  additionalContext?: string;
}

/**
 * System prompt for critique agent
 */
export const CRITIQUE_SYSTEM_PROMPT = `You are a critical brand strategist and advisor with expertise in evaluating brand strategies for effectiveness, differentiation, and market fit.

Your role is to provide constructive, actionable critique that improves brand strategies. You excel at:

1. **Strategic Evaluation**: Assessing clarity, coherence, and strategic soundness
2. **Differentiation Analysis**: Evaluating uniqueness and competitive advantage
3. **Market Fit Assessment**: Validating relevance to target audience and market
4. **Risk Identification**: Spotting potential pitfalls and challenges
5. **Improvement Recommendations**: Providing specific, actionable enhancements

## Evaluation Framework

Assess strategies across these dimensions:

### 1. Strategic Clarity (0-20 points)
- Is the positioning clear and focused?
- Are strategic priorities well-defined?
- Is there internal consistency across elements?

### 2. Differentiation (0-20 points)
- Does it stand out from competitors?
- Is the positioning ownable and unique?
- Are differentiators meaningful and sustainable?

### 3. Audience Resonance (0-20 points)
- Does it speak to target audience needs?
- Is it emotionally compelling?
- Is it culturally relevant and authentic?

### 4. Actionability (0-20 points)
- Can it guide practical decision-making?
- Are messaging guidelines clear?
- Is implementation feasible?

### 5. Coherence (0-20 points)
- Do all elements support each other?
- Is the brand story compelling?
- Are there any contradictions?

**Total Score: 0-100**

## Output Format

Structure your critique as follows:

### 1. Overall Assessment
- Overall score (0-100)
- 2-3 sentence summary of strengths and weaknesses
- Risk level (Low/Medium/High)

### 2. Dimension Scores
- Strategic Clarity: X/20
- Differentiation: X/20
- Audience Resonance: X/20
- Actionability: X/20
- Coherence: X/20

### 3. Strengths
- 3-5 key strengths with specific examples
- What works well and why

### 4. Weaknesses
- 3-5 key weaknesses with specific examples
- What needs improvement and why

### 5. Risks & Concerns
- Potential market risks
- Implementation challenges
- Competitive threats
- Authenticity concerns

### 6. Recommendations
- 5-10 specific, prioritized recommendations
- For each recommendation:
  - What to improve
  - Why it matters
  - How to implement

### 7. Alternative Approaches
- 2-3 alternative strategic directions to consider
- Pros and cons of each

## Guidelines

- Be constructive and specific, not vague or harsh
- Focus on impact, not just preferences
- Provide rationale for all critiques
- Suggest concrete improvements
- Balance critique with recognition of strengths
- Consider feasibility and resources
- Think from customer perspective`;

/**
 * Create a critique prompt from context
 *
 * TODO: Add industry-specific critique criteria
 * TODO: Include benchmarking against best-in-class strategies
 * TODO: Add competitor comparison framework
 *
 * @param context - Critique context
 * @returns Formatted critique prompt
 */
export function createCritiquePrompt(context: CritiqueContext): string {
  const parts: string[] = [
    '# Brand Strategy Critique\n\n',
  ];

  // Research context (if available)
  if (context.research) {
    parts.push('## Research Context\n');
    parts.push('Use this research to validate strategic decisions:\n\n');
    parts.push(context.research);
    parts.push('\n\n');
  }

  // Industry context
  if (context.industry) {
    parts.push('## Industry\n');
    parts.push(context.industry);
    parts.push('\n\n');
  }

  // Strategy to critique
  parts.push('## Strategy to Critique\n\n');
  parts.push(context.strategy);
  parts.push('\n\n');

  // Focus areas
  if (context.focusAreas && context.focusAreas.length > 0) {
    parts.push('## Focus Areas\n');
    parts.push('Pay special attention to:\n');
    parts.push(context.focusAreas.map(area => `- ${area}`).join('\n'));
    parts.push('\n\n');
  }

  // Additional context
  if (context.additionalContext) {
    parts.push('## Additional Context\n');
    parts.push(context.additionalContext);
    parts.push('\n\n');
  }

  // Critique instructions
  parts.push('---\n\n');
  parts.push('Please provide a comprehensive critique following the structure and evaluation framework outlined in your system prompt.\n\n');

  parts.push('Be:\n');
  parts.push('1. **Specific**: Point to exact elements, not general impressions\n');
  parts.push('2. **Constructive**: Focus on improvement, not just criticism\n');
  parts.push('3. **Actionable**: Provide clear recommendations\n');
  parts.push('4. **Balanced**: Acknowledge strengths as well as weaknesses\n');
  parts.push('5. **Strategic**: Think about long-term impact and market fit\n\n');

  parts.push('Score honestly and objectively using the 0-100 scale.\n');

  return parts.join('');
}

/**
 * Create a quick critique prompt (faster, less detailed)
 *
 * @param strategy - Strategy to critique
 * @returns Quick critique prompt
 */
export function createQuickCritiquePrompt(strategy: string): string {
  return `# Quick Strategy Critique

## Strategy
${strategy}

---

Please provide a brief critique (500 words max):

1. **Overall Score**: 0-100
2. **Top 3 Strengths**: What works well
3. **Top 3 Weaknesses**: What needs improvement
4. **Key Recommendations**: 3-5 priority improvements

Be specific and actionable.`;
}

/**
 * Critique scoring rubric
 *
 * Detailed criteria for each dimension
 */
export const CRITIQUE_SCORING_RUBRIC = {
  strategicClarity: {
    excellent: '18-20 points: Crystal clear positioning, well-defined priorities, perfect internal consistency',
    good: '14-17 points: Clear positioning, defined priorities, mostly consistent',
    average: '10-13 points: Somewhat clear positioning, priorities need refinement, some inconsistencies',
    poor: '6-9 points: Unclear positioning, vague priorities, significant inconsistencies',
    failing: '0-5 points: Confusing positioning, no clear priorities, major contradictions',
  },
  differentiation: {
    excellent: '18-20 points: Highly unique, ownable differentiation, sustainable competitive advantage',
    good: '14-17 points: Clear differentiation, mostly ownable, defensible advantage',
    average: '10-13 points: Some differentiation, partially ownable, moderate advantage',
    poor: '6-9 points: Weak differentiation, not ownable, minimal advantage',
    failing: '0-5 points: No differentiation, generic, no competitive advantage',
  },
  audienceResonance: {
    excellent: '18-20 points: Deeply resonant, emotionally compelling, highly authentic and relevant',
    good: '14-17 points: Resonant, emotionally engaging, authentic and relevant',
    average: '10-13 points: Somewhat resonant, moderately engaging, acceptably authentic',
    poor: '6-9 points: Weak resonance, limited engagement, questionable authenticity',
    failing: '0-5 points: No resonance, not engaging, inauthentic or irrelevant',
  },
  actionability: {
    excellent: '18-20 points: Highly actionable, clear guidance, very feasible to implement',
    good: '14-17 points: Actionable, good guidance, feasible to implement',
    average: '10-13 points: Somewhat actionable, adequate guidance, challenging to implement',
    poor: '6-9 points: Limited actionability, vague guidance, difficult to implement',
    failing: '0-5 points: Not actionable, no clear guidance, infeasible',
  },
  coherence: {
    excellent: '18-20 points: Perfect coherence, compelling story, all elements aligned',
    good: '14-17 points: Strong coherence, good story, elements well-aligned',
    average: '10-13 points: Adequate coherence, acceptable story, elements mostly aligned',
    poor: '6-9 points: Weak coherence, weak story, elements poorly aligned',
    failing: '0-5 points: No coherence, no story, elements contradictory',
  },
};

/**
 * Risk assessment criteria
 */
export const RISK_ASSESSMENT_CRITERIA = {
  market: [
    'Does positioning align with market trends?',
    'Are competitive threats addressed?',
    'Is market timing considered?',
    'Are regulatory risks identified?',
  ],
  implementation: [
    'Is the strategy realistic to execute?',
    'Are resource requirements feasible?',
    'Is organizational alignment likely?',
    'Are technical capabilities sufficient?',
  ],
  authenticity: [
    'Can the brand credibly deliver on promises?',
    'Is positioning aligned with brand heritage?',
    'Are claims substantiated?',
    'Is the strategy culturally appropriate?',
  ],
  financial: [
    'Is ROI potential clear?',
    'Are cost implications reasonable?',
    'Is pricing strategy viable?',
    'Are revenue projections realistic?',
  ],
};

/**
 * Common strategy pitfalls to flag
 */
export const COMMON_PITFALLS = [
  'Generic positioning (could apply to any brand)',
  'Vague or aspirational language without substance',
  'Ignoring competitive landscape',
  'Disconnect between brand values and actions',
  'Overly complex messaging',
  'No clear point of difference',
  'Trying to appeal to everyone',
  'Inconsistent brand personality',
  'Weak or missing proof points',
  'Unrealistic implementation timeline',
  'Missing critical success metrics',
  'Culturally insensitive elements',
];
