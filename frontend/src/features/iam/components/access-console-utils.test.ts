import { describe, expect, it } from 'vitest';

import {
  normalizeSearchText,
  parseOptionalNumber,
  parseOptionalString,
  parseRequiredNumber,
  parseRequiredString,
} from './access-console-utils';

describe('access console utilities', () => {
  it('normalizes string form fields used across the admin consoles', () => {
    expect(parseRequiredString('  Team Alpha  ')).toBe('Team Alpha');
    expect(parseOptionalString('  ')).toBeNull();
    expect(parseOptionalString('  tenant-alpha  ')).toBe('tenant-alpha');
  });

  it('accepts only positive numeric identifiers from form data', () => {
    expect(parseRequiredNumber('7')).toBe(7);
    expect(parseRequiredNumber('0')).toBeNull();
    expect(parseOptionalNumber('19')).toBe(19);
    expect(parseOptionalNumber('nope')).toBeNull();
  });

  it('builds lowercase search text from mixed console values', () => {
    expect(normalizeSearchText('Alice Example', 17, null, 'ACTIVE')).toBe(
      'alice example 17 active',
    );
  });
});
