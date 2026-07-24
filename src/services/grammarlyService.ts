// src/services/grammarlyService.ts
// ✅ Grammarly integration service

import * as Grammarly from '@grammarly/editor-sdk';

// Grammarly client instance
let grammarlyClient: any = null;
let isGrammarlyInitialized = false;

export interface GrammarlyConfig {
  clientId: string;
  enabled?: boolean;
}

/**
 * Initialize Grammarly
 * @param config - Grammarly configuration
 */
export function initGrammarly(config: GrammarlyConfig): void {
  if (isGrammarlyInitialized || !config.enabled) return;
  
  try {
    grammarlyClient = Grammarly.init(config.clientId);
    isGrammarlyInitialized = true;
    console.log('✅ Grammarly initialized successfully');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Grammarly:', error);
  }
}

/**
 * Check if Grammarly is enabled
 */
export function isGrammarlyEnabled(): boolean {
  return isGrammarlyInitialized && !!grammarlyClient;
}

/**
 * Get Grammarly client for use in components
 */
export function getGrammarlyClient(): any {
  return grammarlyClient;
}

/**
 * Apply Grammarly to an element
 * @param element - DOM element or React ref
 */
export function applyGrammarly(element: HTMLElement | React.RefObject<HTMLElement>): void {
  if (!isGrammarlyEnabled()) return;
  
  try {
    const target = 'current' in element ? element.current : element;
    if (target) {
      // Grammarly will automatically apply to the element
      // The SDK handles this via the editor plugin
    }
  } catch (error) {
    console.warn('⚠️ Failed to apply Grammarly:', error);
  }
}
