import { describe, expect, it, vi } from 'vitest';

import {
  normalizeSearchText,
  parseOptionalNumber,
  parseOptionalString,
  parseRequiredNumber,
  parseRequiredString,
  readRequiredStringField,
} from './access-console-utils';

describe('access console utilities', () => {
  it('normalizes string form fields used across the admin consoles', () => {
    expect(parseRequiredString('  Team Alpha  ')).toBe('Team Alpha');
    expect(parseRequiredString('   ')).toBeNull();
    expect(parseOptionalString('  ')).toBeNull();
    expect(parseOptionalString('  tenant-alpha  ')).toBe('tenant-alpha');
  });

  it('rejects required text controls when the trimmed value is empty', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'code';
    input.required = true;
    input.value = '   ';
    form.append(input);

    const reportValiditySpy = vi.spyOn(input, 'reportValidity');

    expect(readRequiredStringField(form, 'code')).toBeNull();
    expect(input.value).toBe('');
    expect(reportValiditySpy).toHaveBeenCalledTimes(1);
  });

  it('writes trimmed required values back to the form control', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'name';
    input.required = true;
    input.value = '  Team Alpha  ';
    form.append(input);

    expect(readRequiredStringField(form, 'name')).toBe('Team Alpha');
    expect(input.value).toBe('Team Alpha');
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
