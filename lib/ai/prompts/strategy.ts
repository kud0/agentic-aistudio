/**
 * Strategy Agent Prompt Templates
 *
 * Prompts for generating brand strategy, positioning, and messaging frameworks.
 *
 * @example
 * ```typescript
 * import { createStrategyPrompt } from '@/lib/ai/prompts/strategy';
 *
 * const prompt = createStrategyPrompt({
 *   brief: 'Create positioning strategy...',
 *   research: '...',
 *   industry: 'Fashion & Apparel',
 * });
 * ```
 */

/**
 * Strategy prompt context
 */
export interface StrategyContext {
  brief: string;
  research?: string; // Output from research agent
  industry?: string;
  targetAudience?: string;
  brandValues?: string[];
  competitors?: string[];
  differentiators?: string[];
  additionalContext?: string;
}

/**
 * System prompt for strategy agent
 */
export const STRATEGY_SYSTEM_PROMPT = `You are a senior brand strategist with 15+ years of experience in positioning, messaging, and brand identity development.

Your role is to transform research insights into compelling brand strategies that differentiate, resonate, and drive business results. You excel at:

1. **Strategic Positioning**: Defining unique market position and competitive advantage
2. **Brand Architecture**: Structuring brand elements for clarity and impact
3. **Messaging Frameworks**: Creating hierarchical messaging that resonates
4. **Value Proposition Design**: Articulating clear, compelling value
5. **Strategic Storytelling**: Crafting narratives that connect emotionally

## Output Format

Structure your strategy as follows:

### 1. Strategic Foundation
- **Brand Purpose**: Why the brand exists beyond profit
- **Brand Vision**: Aspirational future state
- **Brand Mission**: What the brand does and for whom
- **Core Values**: 3-5 guiding principles

### 2. Positioning Strategy
- **Target Audience**: Primary and secondary audiences
- **Frame of Reference**: Category/market context
- **Point of Difference**: Unique competitive advantage
- **Reason to Believe**: Proof points and credibility
- **Positioning Statement**: Concise summary (1-2 sentences)

### 3. Brand Personality & Voice
- **Personality Traits**: 3-5 key characteristics
- **Brand Archetype**: Primary archetype (Hero, Creator, Sage, etc.)
- **Voice & Tone**: How the brand communicates
- **Do's and Don'ts**: Communication guidelines

### 4. Messaging Framework
- **Master Brand Idea**: Central strategic concept
- **Key Messages**:
  - Primary message (emotional + rational)
  - 3-5 supporting messages
  - Proof points for each
- **Tagline Options**: 3-5 potential taglines
- **Elevator Pitch**: 30-second brand story

### 5. Brand Story
- **Origin Story**: How and why the brand came to be
- **Customer Journey**: Narrative of customer transformation
- **Brand Narrative**: Compelling story that brings strategy to life

### 6. Strategic Pillars
- 3-5 key strategic themes
- Supporting programs/initiatives for each
- Success metrics

### 7. Implementation Roadmap
- Priority initiatives (Now, Next, Later)
- Key touchpoints and channels
- Critical success factors
- Potential risks and mitigation

## Guidelines

- Build directly on research insights (cite when relevant)
- Be bold and differentiated, not generic
- Balance emotional and rational elements
- Ensure internal consistency across all elements
- Make it actionable and measurable
- Think long-term while addressing immediate needs
- Consider cultural relevance and authenticity`;

/**
 * Create a strategy prompt from context
 *
 * TODO: Enhance with industry-specific templates
 * TODO: Add strategic frameworks (Blue Ocean, Jobs-to-be-Done, etc.)
 * TODO: Include examples of great brand strategies
 *
 * @param context - Strategy context
 * @returns Formatted strategy prompt
 */
export function createStrategyPrompt(context: StrategyContext): string {
  const parts: string[] = [
    '# Brand Strategy Development\n\n',
  ];

  // Main brief
  parts.push('## Project Brief\n');
  parts.push(context.brief);
  parts.push('\n\n');

  // Research insights
  if (context.research) {
    parts.push('## Research Insights\n');
    parts.push('Use these insights to inform your strategy:\n\n');
    parts.push(context.research);
    parts.push('\n\n');
  }

  // Industry context
  if (context.industry) {
    parts.push('## Industry\n');
    parts.push(context.industry);
    parts.push('\n\n');
  }

  // Target audience
  if (context.targetAudience) {
    parts.push('## Target Audience\n');
    parts.push(context.targetAudience);
    parts.push('\n\n');
  }

  // Brand values
  if (context.brandValues && context.brandValues.length > 0) {
    parts.push('## Intended Brand Values\n');
    parts.push(context.brandValues.map(v => `- ${v}`).join('\n'));
    parts.push('\n\n');
  }

  // Known competitors
  if (context.competitors && context.competitors.length > 0) {
    parts.push('## Key Competitors\n');
    parts.push(context.competitors.map(c => `- ${c}`).join('\n'));
    parts.push('\n\n');
  }

  // Potential differentiators
  if (context.differentiators && context.differentiators.length > 0) {
    parts.push('## Potential Differentiators\n');
    parts.push(context.differentiators.map(d => `- ${d}`).join('\n'));
    parts.push('\n\n');
  }

  // Additional context
  if (context.additionalContext) {
    parts.push('## Additional Context\n');
    parts.push(context.additionalContext);
    parts.push('\n\n');
  }

  // Strategy instructions
  parts.push('---\n\n');
  parts.push('Please develop a comprehensive brand strategy following the structure outlined in your system prompt. ');
  parts.push('Create a strategy that is:\n\n');

  parts.push('1. **Differentiated**: Clearly distinct from competitors\n');
  parts.push('2. **Authentic**: True to brand values and capabilities\n');
  parts.push('3. **Resonant**: Emotionally compelling to target audience\n');
  parts.push('4. **Actionable**: Concrete enough to guide execution\n');
  parts.push('5. **Measurable**: With clear success criteria\n\n');

  parts.push('Build directly on the research insights provided. ');
  parts.push('Be bold and specific rather than generic and safe.\n');

  return parts.join('');
}

/**
 * Create a focused strategy prompt for a specific component
 *
 * @param component - Strategy component to focus on
 * @param context - Strategy context
 * @returns Focused strategy prompt
 */
export function createFocusedStrategyPrompt(
  component: 'positioning' | 'messaging' | 'personality' | 'story',
  context: StrategyContext
): string {
  const basePrompt = createStrategyPrompt(context);

  const focusInstructions: Record<typeof component, string> = {
    positioning: '\n\n**FOCUS AREA**: Develop a detailed positioning strategy. Include target audience definition, frame of reference, point of difference, reasons to believe, and a crisp positioning statement. Provide 3 alternative positioning approaches.',
    messaging: '\n\n**FOCUS AREA**: Create a comprehensive messaging framework. Develop a master brand idea, primary message, 5-7 supporting messages with proof points, and 5 tagline options. Include message hierarchy and usage guidelines.',
    personality: '\n\n**FOCUS AREA**: Define brand personality and voice in detail. Include personality traits, brand archetype, voice characteristics, tone variations by context, and specific communication do\'s and don\'ts.',
    story: '\n\n**FOCUS AREA**: Craft a compelling brand story. Include origin story, customer transformation narrative, and an overarching brand narrative. Make it emotionally resonant and authentic.',
  };

  return basePrompt + focusInstructions[component];
}

/**
 * Strategy quality checklist
 *
 * Used by quality scoring system to evaluate strategy outputs
 */
export const STRATEGY_QUALITY_CHECKLIST = {
  completeness: [
    'All required sections are present',
    'Strategic foundation is clearly defined',
    'Positioning strategy is comprehensive',
    'Messaging framework is detailed',
    'Brand story is compelling',
    'Implementation roadmap is actionable',
  ],
  coherence: [
    'All elements support each other',
    'Consistent tone throughout',
    'Logical progression from foundation to execution',
    'No contradictions between sections',
  ],
  differentiation: [
    'Clear competitive distinction',
    'Unique positioning in market',
    'Specific and ownable attributes',
    'Not generic or cliché',
  ],
  actionability: [
    'Clear implementation guidance',
    'Specific messaging examples',
    'Measurable success criteria',
    'Realistic and practical',
  ],
  resonance: [
    'Emotionally compelling',
    'Authentic to brand values',
    'Relevant to target audience',
    'Culturally appropriate',
  ],
};

/**
 * Brand archetypes reference
 *
 * Used to guide brand personality development
 */
export const BRAND_ARCHETYPES = {
  'The Innocent': {
    description: 'Simple, pure, optimistic, nostalgic',
    examples: ['Dove', 'Coca-Cola', 'Disney'],
    traits: ['Honest', 'Optimistic', 'Pure', 'Wholesome'],
  },
  'The Sage': {
    description: 'Wise, knowledgeable, expert, mentor',
    examples: ['Google', 'PBS', 'The Economist'],
    traits: ['Knowledgeable', 'Analytical', 'Thoughtful', 'Expert'],
  },
  'The Explorer': {
    description: 'Adventurous, independent, pioneering, authentic',
    examples: ['Patagonia', 'REI', 'Jeep'],
    traits: ['Adventurous', 'Independent', 'Authentic', 'Free-spirited'],
  },
  'The Outlaw': {
    description: 'Rebellious, revolutionary, disruptive, radical',
    examples: ['Harley-Davidson', 'Virgin', 'Diesel'],
    traits: ['Rebellious', 'Bold', 'Disruptive', 'Free'],
  },
  'The Magician': {
    description: 'Transformative, visionary, spiritual, idealistic',
    examples: ['Apple', 'Tesla', 'Disney'],
    traits: ['Visionary', 'Transformative', 'Inspiring', 'Magical'],
  },
  'The Hero': {
    description: 'Courageous, strong, capable, inspirational',
    examples: ['Nike', 'FedEx', 'Red Bull'],
    traits: ['Courageous', 'Strong', 'Capable', 'Inspirational'],
  },
  'The Lover': {
    description: 'Passionate, intimate, sensual, indulgent',
    examples: ['Chanel', 'Godiva', 'Victoria\'s Secret'],
    traits: ['Passionate', 'Intimate', 'Sensual', 'Elegant'],
  },
  'The Jester': {
    description: 'Playful, humorous, fun, irreverent',
    examples: ['M&M\'s', 'Old Spice', 'Dollar Shave Club'],
    traits: ['Playful', 'Humorous', 'Fun', 'Lighthearted'],
  },
  'The Everyman': {
    description: 'Relatable, authentic, down-to-earth, friendly',
    examples: ['IKEA', 'Target', 'Budweiser'],
    traits: ['Relatable', 'Friendly', 'Authentic', 'Down-to-earth'],
  },
  'The Caregiver': {
    description: 'Nurturing, compassionate, generous, supportive',
    examples: ['Johnson & Johnson', 'UNICEF', 'Campbell\'s'],
    traits: ['Nurturing', 'Compassionate', 'Supportive', 'Generous'],
  },
  'The Ruler': {
    description: 'Powerful, authoritative, organized, leader',
    examples: ['Mercedes-Benz', 'Rolex', 'Microsoft'],
    traits: ['Powerful', 'Authoritative', 'Organized', 'Leader'],
  },
  'The Creator': {
    description: 'Innovative, artistic, imaginative, expressive',
    examples: ['Lego', 'Adobe', 'Crayola'],
    traits: ['Innovative', 'Artistic', 'Imaginative', 'Expressive'],
  },
};
