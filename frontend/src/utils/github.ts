/**
 * Utility functions for validating and normalizing GitHub repository URLs.
 */

export interface GithubUrlValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl: string;
  owner?: string;
  repo?: string;
}

/**
 * Normalizes GitHub URLs into canonical form (https://github.com/owner/repo).
 * - Strips leading/trailing accidental spaces
 * - Strips query parameters (?...) and hash fragments (#...)
 * - Strips duplicate or trailing .git extensions
 * - Preserves legitimate repository names
 */
export function normalizeGithubUrl(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let cleaned = input.trim();

  // Remove query strings and fragments
  if (cleaned.includes('?')) {
    cleaned = cleaned.split('?')[0];
  }
  if (cleaned.includes('#')) {
    cleaned = cleaned.split('#')[0];
  }

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  // Remove repeated or single trailing .git suffix
  while (cleaned.endsWith('.git')) {
    cleaned = cleaned.slice(0, -4);
  }

  return cleaned;
}

/**
 * Validates whether a given URL is a valid public GitHub HTTPS repository.
 */
export function validateGithubUrl(input: string): GithubUrlValidationResult {
  const normalized = normalizeGithubUrl(input);

  if (!normalized) {
    return {
      valid: false,
      error: 'GitHub URL is required.',
      normalizedUrl: '',
    };
  }

  // Reject embedded credentials e.g. https://user:pass@github.com/...
  if (/@/.test(normalized)) {
    return {
      valid: false,
      error: 'Embedded credentials in GitHub URLs are not permitted.',
      normalizedUrl: normalized,
    };
  }

  // Match https://github.com/{owner}/{repo}
  const regex = /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.+-]+)$/;
  const match = normalized.match(regex);

  if (!match) {
    if (!normalized.startsWith('https://github.com/')) {
      return {
        valid: false,
        error: 'Only public HTTPS GitHub URLs are supported (e.g. https://github.com/owner/repo)',
        normalizedUrl: normalized,
      };
    }

    return {
      valid: false,
      error: 'Invalid GitHub repository format. Expected: https://github.com/owner/repo',
      normalizedUrl: normalized,
    };
  }

  const [, owner, repo] = match;

  return {
    valid: true,
    normalizedUrl: normalized,
    owner,
    repo,
  };
}
