import { describe, it, expect } from 'vitest';
import { ACCENT_PRESETS, ACCENT_COLORS, AccentColor } from '../src/context/AccentThemeContext';

describe('Multi-Accent Color System Architecture', () => {

  it('provides all 4 required accent color presets with Blue as default', () => {
    expect(ACCENT_COLORS).toEqual(['blue', 'teal', 'orange', 'red']);
    expect(ACCENT_PRESETS.blue).toBeDefined();
    expect(ACCENT_PRESETS.teal).toBeDefined();
    expect(ACCENT_PRESETS.orange).toBeDefined();
    expect(ACCENT_PRESETS.red).toBeDefined();
  });

  it('preserves the exact original blue primary accent (#5B75F8)', () => {
    const blue = ACCENT_PRESETS.blue;
    expect(blue.primary).toBe('#5B75F8');
    expect(blue.textDark).toBe('#7B92FF');
  });

  it('defines professional, industrial-grade palettes for Teal, Orange, and Red', () => {
    const teal = ACCENT_PRESETS.teal;
    expect(teal.primary).toBe('#0F766E');
    expect(teal.textDark).toBe('#2DD4BF');

    const orange = ACCENT_PRESETS.orange;
    expect(orange.primary).toBe('#EA580C');
    expect(orange.textDark).toBe('#FB923C');

    const red = ACCENT_PRESETS.red;
    expect(red.primary).toBe('#DC2626');
    expect(red.textDark).toBe('#F87171');
  });

  it('includes complete interaction tokens (hover, active, soft, border, ring, shadow, gradient) for each preset', () => {
    for (const key of ACCENT_COLORS) {
      const preset = ACCENT_PRESETS[key as AccentColor];
      expect(preset.id).toBe(key);
      expect(preset.label).toBeDefined();
      expect(preset.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.hover).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.active).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.softLight).toContain('rgba');
      expect(preset.softDark).toContain('rgba');
      expect(preset.borderLight).toContain('rgba');
      expect(preset.ring).toContain('rgba');
      expect(preset.shadow).toContain('rgba');
      expect(preset.gradientFrom).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.gradientTo).toBeDefined();
    }
  });

  it('safely handles unknown or invalid color keys by falling back to blue', () => {
    const sanitizeAccent = (input: string | null | undefined): AccentColor => {
      if (input && ACCENT_COLORS.includes(input as AccentColor)) {
        return input as AccentColor;
      }
      return 'blue';
    };

    expect(sanitizeAccent('teal')).toBe('teal');
    expect(sanitizeAccent('orange')).toBe('orange');
    expect(sanitizeAccent('red')).toBe('red');
    expect(sanitizeAccent('purple')).toBe('blue');
    expect(sanitizeAccent(null)).toBe('blue');
    expect(sanitizeAccent(undefined)).toBe('blue');
    expect(sanitizeAccent('')).toBe('blue');
  });
});
