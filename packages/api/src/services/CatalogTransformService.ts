/**
 * Catalog Transform Service
 *
 * Uses AI (Claude, OpenAI, or Ollama) to transform raw POS menu data into drink-ux's
 * property-based catalog format.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { RawCatalogData, RawPOSItem, RawPOSModifier, RawPOSCategory } from '../adapters/pos/POSAdapter';

/**
 * Supported AI providers
 */
export type AIProvider = 'anthropic' | 'openai' | 'ollama' | 'none';

/**
 * Transformed catalog suggestion from AI
 */
export interface CatalogTransformResult {
  categories: Array<{
    name: string;
    icon: string;
    displayOrder: number;
  }>;
  bases: Array<{
    name: string;
    categoryName: string;
    basePrice: number;
    temperatureConstraint: 'HOT_ONLY' | 'COLD_ONLY' | 'BOTH';
    originalItemId?: string;
  }>;
  modifiers: Array<{
    name: string;
    type: 'MILK' | 'SYRUP' | 'TOPPING';
    price: number;
    originalModifierId?: string;
  }>;
  reasoning?: string;
  provider?: AIProvider;
}

/**
 * Service for AI-powered catalog transformation
 */
export class CatalogTransformService {
  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private ollamaBaseUrl: string | null = null;
  private ollamaModel: string = 'llama3.2';
  private preferredProvider: AIProvider;

  constructor() {
    // Initialize Anthropic client
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.anthropicClient = new Anthropic({ apiKey: anthropicKey });
    }

    // Initialize OpenAI client
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
    }

    // Initialize Ollama config
    const ollamaUrl = process.env.OLLAMA_BASE_URL;
    if (ollamaUrl) {
      this.ollamaBaseUrl = ollamaUrl;
      this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
    }

    // Determine preferred provider from env or auto-detect
    const configuredProvider = process.env.AI_PROVIDER?.toLowerCase() as AIProvider;
    if (configuredProvider && this.isProviderAvailable(configuredProvider)) {
      this.preferredProvider = configuredProvider;
    } else {
      // Auto-detect in priority order: Anthropic > OpenAI > Ollama
      this.preferredProvider = this.detectAvailableProvider();
    }
  }

  /**
   * Check if a specific provider is available
   */
  private isProviderAvailable(provider: AIProvider): boolean {
    switch (provider) {
      case 'anthropic':
        return this.anthropicClient !== null;
      case 'openai':
        return this.openaiClient !== null;
      case 'ollama':
        return this.ollamaBaseUrl !== null;
      default:
        return false;
    }
  }

  /**
   * Auto-detect available provider
   */
  private detectAvailableProvider(): AIProvider {
    if (this.anthropicClient) return 'anthropic';
    if (this.openaiClient) return 'openai';
    if (this.ollamaBaseUrl) return 'ollama';
    return 'none';
  }

  /**
   * Get the current AI provider being used
   */
  getProvider(): AIProvider {
    return this.preferredProvider;
  }

  /**
   * Check if AI transformation is available
   */
  isAvailable(): boolean {
    return this.preferredProvider !== 'none';
  }

  /**
   * Transform raw POS catalog into drink-ux format using AI
   */
  async transform(rawCatalog: RawCatalogData): Promise<CatalogTransformResult> {
    const prompt = this.buildTransformPrompt(rawCatalog);

    // Try preferred provider first, then fallback chain
    const providers: AIProvider[] = [this.preferredProvider];
    if (this.preferredProvider !== 'anthropic' && this.anthropicClient) providers.push('anthropic');
    if (this.preferredProvider !== 'openai' && this.openaiClient) providers.push('openai');
    if (this.preferredProvider !== 'ollama' && this.ollamaBaseUrl) providers.push('ollama');

    for (const provider of providers) {
      if (provider === 'none') continue;

      try {
        const result = await this.transformWithProvider(provider, prompt, rawCatalog);
        result.provider = provider;
        return result;
      } catch (error) {
        console.error(`${provider} transformation failed:`, error);
        // Continue to next provider
      }
    }

    // All providers failed, fall back to rules
    console.log('All AI providers failed, using rule-based transformation');
    return this.ruleBasedTransform(rawCatalog);
  }

  /**
   * Transform using a specific provider
   */
  private async transformWithProvider(
    provider: AIProvider,
    prompt: string,
    rawCatalog: RawCatalogData
  ): Promise<CatalogTransformResult> {
    switch (provider) {
      case 'anthropic':
        return this.transformWithAnthropic(prompt, rawCatalog);
      case 'openai':
        return this.transformWithOpenAI(prompt, rawCatalog);
      case 'ollama':
        return this.transformWithOllama(prompt, rawCatalog);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Transform using Anthropic Claude
   */
  private async transformWithAnthropic(prompt: string, rawCatalog: RawCatalogData): Promise<CatalogTransformResult> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const message = await this.anthropicClient.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return this.parseAIResponse(responseText, rawCatalog);
  }

  /**
   * Transform using OpenAI
   */
  private async transformWithOpenAI(prompt: string, rawCatalog: RawCatalogData): Promise<CatalogTransformResult> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || '';

    return this.parseAIResponse(responseText, rawCatalog);
  }

  /**
   * Transform using Ollama (local)
   */
  private async transformWithOllama(prompt: string, rawCatalog: RawCatalogData): Promise<CatalogTransformResult> {
    if (!this.ollamaBaseUrl) {
      throw new Error('Ollama not configured');
    }

    const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          num_predict: 4096,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data = await response.json() as { response?: string };
    const responseText = data.response || '';

    return this.parseAIResponse(responseText, rawCatalog);
  }

  /**
   * Build the prompt for AI transformation
   */
  private buildTransformPrompt(rawCatalog: RawCatalogData): string {
    const itemsJson = JSON.stringify(rawCatalog.items.slice(0, 50), null, 2); // Limit to first 50 items
    const modifiersJson = JSON.stringify(rawCatalog.modifiers.slice(0, 50), null, 2);
    const categoriesJson = JSON.stringify(rawCatalog.categories, null, 2);

    return `You are helping transform a coffee shop's POS menu into a property-based drink ordering system.

In drink-ux, customers build drinks by selecting properties rather than choosing pre-made items:
- They pick a BASE drink (Latte, Cappuccino, Cold Brew, etc.)
- They add MODIFIERS: milk type (MILK), flavor syrups (SYRUP), and toppings (TOPPING)
- The system figures out what to call it (e.g., Oat Milk Vanilla Latte)

Your task: Analyze this raw POS catalog and transform it into drink-ux format.

RAW CATALOG DATA:
Categories: ${categoriesJson}
Items: ${itemsJson}
Modifiers: ${modifiersJson}

INSTRUCTIONS:
1. Identify base drinks (the core beverage, without modifications like "Vanilla" or "Oat Milk")
2. Extract modifiers from item names (e.g., "Vanilla Latte" has base "Latte" and modifier "Vanilla" syrup)
3. Categorize items into: Coffee, Tea, Specialty, or other appropriate categories
4. Classify modifiers as MILK (dairy/plant milks), SYRUP (flavors), or TOPPING (whipped cream, etc.)
5. Determine temperature constraints: HOT_ONLY, COLD_ONLY, or BOTH
6. Suggest reasonable base prices (in dollars)

Respond with ONLY a JSON object in this exact format:
{
  "categories": [
    {"name": "Coffee", "icon": "coffee", "displayOrder": 0},
    {"name": "Tea", "icon": "tea", "displayOrder": 1}
  ],
  "bases": [
    {"name": "Latte", "categoryName": "Coffee", "basePrice": 4.50, "temperatureConstraint": "BOTH", "originalItemId": "item-id-if-applicable"},
    {"name": "Cold Brew", "categoryName": "Coffee", "basePrice": 4.00, "temperatureConstraint": "COLD_ONLY"}
  ],
  "modifiers": [
    {"name": "Vanilla", "type": "SYRUP", "price": 0.50},
    {"name": "Oat Milk", "type": "MILK", "price": 0.75},
    {"name": "Whipped Cream", "type": "TOPPING", "price": 0.50}
  ],
  "reasoning": "Brief explanation of your transformation decisions"
}

Icons to use: coffee, tea, star (specialty), blender (smoothies), food (food items)
Prices should be in dollars (e.g., 4.50 not 450).
Only include unique bases and modifiers (no duplicates).`;
  }

  /**
   * Parse the AI response into a CatalogTransformResult
   */
  private parseAIResponse(responseText: string, rawCatalog: RawCatalogData): CatalogTransformResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and return
      return {
        categories: parsed.categories || [],
        bases: parsed.bases || [],
        modifiers: parsed.modifiers || [],
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.ruleBasedTransform(rawCatalog);
    }
  }

  /**
   * Rule-based transformation fallback when AI is unavailable
   */
  private ruleBasedTransform(rawCatalog: RawCatalogData): CatalogTransformResult {
    const categories: CatalogTransformResult['categories'] = [];
    const bases: CatalogTransformResult['bases'] = [];
    const modifiers: CatalogTransformResult['modifiers'] = [];

    // Track unique names
    const seenBases = new Set<string>();
    const seenModifiers = new Set<string>();

    // Create categories from raw data or defaults
    if (rawCatalog.categories.length > 0) {
      rawCatalog.categories.forEach((cat, index) => {
        categories.push({
          name: cat.name,
          icon: this.guessIcon(cat.name),
          displayOrder: cat.ordinal ?? index,
        });
      });
    } else {
      // Default categories
      categories.push(
        { name: 'Coffee', icon: 'coffee', displayOrder: 0 },
        { name: 'Tea', icon: 'tea', displayOrder: 1 },
        { name: 'Specialty', icon: 'star', displayOrder: 2 }
      );
    }

    // Process items into bases
    for (const item of rawCatalog.items) {
      const baseName = this.extractBaseName(item.name);

      if (!seenBases.has(baseName.toLowerCase())) {
        seenBases.add(baseName.toLowerCase());

        const categoryName = this.guessCategoryForItem(item.name, rawCatalog.categories);
        const price = (item.variations?.[0]?.price || 0) / 100;

        bases.push({
          name: baseName,
          categoryName,
          basePrice: price > 0 ? price : 4.50, // Default price if none
          temperatureConstraint: this.guessTemperature(item.name),
          originalItemId: item.id,
        });
      }

      // Extract modifiers from item name
      const extractedModifiers = this.extractModifiersFromName(item.name);
      for (const mod of extractedModifiers) {
        if (!seenModifiers.has(mod.name.toLowerCase())) {
          seenModifiers.add(mod.name.toLowerCase());
          modifiers.push(mod);
        }
      }
    }

    // Process raw modifiers
    for (const mod of rawCatalog.modifiers) {
      if (!seenModifiers.has(mod.name.toLowerCase())) {
        seenModifiers.add(mod.name.toLowerCase());
        modifiers.push({
          name: mod.name,
          type: this.guessModifierType(mod.name),
          price: (mod.price || 0) / 100,
          originalModifierId: mod.id,
        });
      }
    }

    return { categories, bases, modifiers };
  }

  /**
   * Extract base drink name from a full item name
   */
  private extractBaseName(itemName: string): string {
    // Remove common modifiers from the name to get the base
    const modifierPatterns = [
      /\b(vanilla|caramel|hazelnut|mocha|chocolate|pumpkin spice)\b/gi,
      /\b(oat|almond|soy|coconut|whole|skim|2%)\s*milk\b/gi,
      /\biced\b/gi,
      /\bhot\b/gi,
      /\b(small|medium|large|tall|grande|venti)\b/gi,
      /\b(double|triple|quad)\b/gi,
    ];

    let baseName = itemName;
    for (const pattern of modifierPatterns) {
      baseName = baseName.replace(pattern, '');
    }

    // Clean up extra spaces
    baseName = baseName.replace(/\s+/g, ' ').trim();

    // If we stripped everything, return original
    return baseName || itemName;
  }

  /**
   * Extract modifiers mentioned in an item name
   */
  private extractModifiersFromName(itemName: string): CatalogTransformResult['modifiers'] {
    const modifiers: CatalogTransformResult['modifiers'] = [];
    const lower = itemName.toLowerCase();

    // Syrups
    const syrups = ['vanilla', 'caramel', 'hazelnut', 'mocha', 'chocolate', 'pumpkin spice', 'lavender', 'honey'];
    for (const syrup of syrups) {
      if (lower.includes(syrup)) {
        modifiers.push({ name: this.capitalize(syrup), type: 'SYRUP', price: 0.50 });
      }
    }

    // Milks
    const milks = [
      { pattern: /oat\s*milk/i, name: 'Oat Milk' },
      { pattern: /almond\s*milk/i, name: 'Almond Milk' },
      { pattern: /soy\s*milk/i, name: 'Soy Milk' },
      { pattern: /coconut\s*milk/i, name: 'Coconut Milk' },
    ];
    for (const milk of milks) {
      if (milk.pattern.test(itemName)) {
        modifiers.push({ name: milk.name, type: 'MILK', price: 0.75 });
      }
    }

    return modifiers;
  }

  /**
   * Guess category for an item based on its name
   */
  private guessCategoryForItem(itemName: string, categories: RawPOSCategory[]): string {
    const lower = itemName.toLowerCase();

    // Check explicit category matches
    const coffeeTerms = ['espresso', 'latte', 'cappuccino', 'americano', 'mocha', 'macchiato', 'brew'];
    const teaTerms = ['tea', 'chai', 'matcha'];
    const specialtyTerms = ['smoothie', 'frappe', 'frappuccino', 'shake'];

    if (coffeeTerms.some(term => lower.includes(term))) return 'Coffee';
    if (teaTerms.some(term => lower.includes(term))) return 'Tea';
    if (specialtyTerms.some(term => lower.includes(term))) return 'Specialty';

    // Default to first category or Coffee
    return categories[0]?.name || 'Coffee';
  }

  /**
   * Guess temperature constraint based on item name
   */
  private guessTemperature(itemName: string): 'HOT_ONLY' | 'COLD_ONLY' | 'BOTH' {
    const lower = itemName.toLowerCase();

    if (lower.includes('iced') || lower.includes('cold brew') || lower.includes('frappe')) {
      return 'COLD_ONLY';
    }
    if (lower.includes('hot')) {
      return 'HOT_ONLY';
    }
    return 'BOTH';
  }

  /**
   * Guess modifier type based on name
   */
  private guessModifierType(name: string): 'MILK' | 'SYRUP' | 'TOPPING' {
    const lower = name.toLowerCase();

    if (lower.includes('milk') || lower.includes('cream') && !lower.includes('whipped')) {
      return 'MILK';
    }
    if (lower.includes('whipped') || lower.includes('topping') || lower.includes('drizzle')) {
      return 'TOPPING';
    }
    return 'SYRUP';
  }

  /**
   * Guess icon based on category name
   */
  private guessIcon(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('coffee') || lower.includes('espresso')) return 'coffee';
    if (lower.includes('tea')) return 'tea';
    if (lower.includes('smoothie') || lower.includes('blend')) return 'blender';
    if (lower.includes('food') || lower.includes('bakery')) return 'food';
    return 'star';
  }

  /**
   * Capitalize first letter of each word
   */
  private capitalize(str: string): string {
    return str.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
}
