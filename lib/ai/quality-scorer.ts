/**
 * Quality Scorer Module
 * Automatically scores AI-generated outputs using a cheap model (Grok mini)
 * to evaluate expensive model outputs for quality assurance
 */

import { createClient } from '@/lib/supabase/client';
import type { QualityScore, ScoringResult } from './types';

/**
 * Output type for scoring
 */
export type OutputType = 'research' | 'strategy' | 'critique' | 'general';

/**
 * Quality scoring response from LLM
 */
interface ScoringResponse {
  completeness: number;
  coherence: number;
  actionability: number;
  overall: number;
  flagForReview: boolean;
  reasoning: string;
}

/**
 * Quality Scorer Class
 * Uses Grok mini to score expensive model outputs
 */
export class QualityScorer {
  private readonly SCORING_THRESHOLD = 60;
  private readonly GROK_API_KEY = process.env.GROK_API_KEY || '';
  private readonly GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

  /**
   * Score an AI-generated output for quality
   * @param content - The output content to score
   * @param type - The type of output (research, strategy, etc.)
   * @param outputId - The database ID of the output being scored
   * @returns Scoring result with quality metrics
   */
  async scoreOutput(
    content: string,
    type: OutputType,
    outputId?: string
  ): Promise<ScoringResult> {
    try {
      // Generate scoring prompt based on output type
      const prompt = this.generateScoringPrompt(content, type);

      // Call Grok mini for scoring (cheap model)
      const scoringResponse = await this.callGrokMini(prompt);

      // Parse and validate the response
      const scores = this.parseScoringResponse(scoringResponse);

      // Determine if flagging is needed
      const flagForReview = scores.overall < this.SCORING_THRESHOLD;

      // Construct quality score object
      const qualityScore: QualityScore = {
        output_id: outputId || 'unknown',
        completeness: scores.completeness,
        coherence: scores.coherence,
        actionability: scores.actionability,
        overall: scores.overall,
        flagged_for_review: flagForReview,
        reasoning: scores.reasoning,
        created_at: new Date(),
      };

      // Save to database if outputId is provided
      if (outputId) {
        await this.saveScore(qualityScore);
      }

      return {
        success: true,
        score: qualityScore,
      };
    } catch (error) {
      console.error('Quality scoring failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate scoring prompt based on output type
   */
  private generateScoringPrompt(content: string, type: OutputType): string {
    const typeSpecificCriteria = {
      research: `
        - Completeness: Does it cover all necessary research points?
        - Coherence: Is the information well-organized and logical?
        - Actionability: Does it provide clear, usable insights?
      `,
      strategy: `
        - Completeness: Does it address all strategic elements?
        - Coherence: Is the strategy clear and well-structured?
        - Actionability: Are the recommendations specific and implementable?
      `,
      critique: `
        - Completeness: Does it provide thorough analysis?
        - Coherence: Is the feedback clear and constructive?
        - Actionability: Are the improvement suggestions specific?
      `,
      general: `
        - Completeness: Does it fully address the intended purpose?
        - Coherence: Is it well-organized and easy to understand?
        - Actionability: Does it provide practical value?
      `,
    };

    return `You are a quality assurance expert evaluating AI-generated content.

Rate the following ${type} output on these criteria (0-100 scale):

${typeSpecificCriteria[type]}

**Output to evaluate:**
${content}

**Instructions:**
1. Rate each criterion from 0-100 (0=terrible, 50=acceptable, 100=excellent)
2. Calculate an overall score (can be weighted average or your assessment)
3. Determine if this should be flagged for human review (overall < 60)
4. Provide brief reasoning for your scores

**Respond in this exact JSON format:**
{
  "completeness": <number 0-100>,
  "coherence": <number 0-100>,
  "actionability": <number 0-100>,
  "overall": <number 0-100>,
  "flagForReview": <boolean>,
  "reasoning": "<brief explanation of scores>"
}`;
  }

  /**
   * Call Grok mini API for scoring
   */
  private async callGrokMini(prompt: string): Promise<string> {
    if (!this.GROK_API_KEY) {
      throw new Error('GROK_API_KEY not configured');
    }

    try {
      const response = await fetch(this.GROK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'grok-beta', // Use the cheapest model available
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Low temperature for consistent scoring
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grok API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Grok API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse and validate scoring response from LLM
   */
  private parseScoringResponse(response: string): ScoringResponse {
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize scores
      return {
        completeness: this.clampScore(parsed.completeness),
        coherence: this.clampScore(parsed.coherence),
        actionability: this.clampScore(parsed.actionability),
        overall: this.clampScore(parsed.overall),
        flagForReview: Boolean(parsed.flagForReview),
        reasoning: String(parsed.reasoning || 'No reasoning provided'),
      };
    } catch (error) {
      console.error('Failed to parse scoring response:', error);
      throw new Error('Invalid scoring response format');
    }
  }

  /**
   * Clamp score to valid range (0-100)
   */
  private clampScore(score: any): number {
    const num = Number(score);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  }

  /**
   * Save quality score to database
   */
  private async saveScore(score: QualityScore): Promise<void> {
    try {
      const supabase = createClient();

      const { error } = await supabase.from('quality_scores').insert({
        output_id: score.output_id,
        completeness_score: score.completeness,
        coherence_score: score.coherence,
        actionability_score: score.actionability,
        overall_score: score.overall,
        flagged_for_review: score.flagged_for_review,
        reasoning: score.reasoning,
        created_at: score.created_at,
      });

      if (error) {
        console.error('Failed to save quality score:', error);
        throw new Error('Database insert failed');
      }

      console.log(`Quality score saved for output ${score.output_id}`);
    } catch (error) {
      console.error('Error saving score to database:', error);
      throw error;
    }
  }

  /**
   * Batch score multiple outputs
   */
  async scoreMultiple(
    outputs: Array<{ content: string; type: OutputType; id?: string }>
  ): Promise<ScoringResult[]> {
    const results = await Promise.allSettled(
      outputs.map((output) =>
        this.scoreOutput(output.content, output.type, output.id)
      )
    );

    return results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : { success: false, error: 'Scoring failed' }
    );
  }

  /**
   * Get flagged outputs for review
   */
  async getFlaggedOutputs(limit: number = 10): Promise<QualityScore[]> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('quality_scores')
        .select('*')
        .eq('flagged_for_review', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching flagged outputs:', error);
      return [];
    }
  }
}

/**
 * Export singleton instance
 */
export const qualityScorer = new QualityScorer();
