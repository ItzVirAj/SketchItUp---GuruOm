import { describe, it, expect } from 'vitest';
import { ACCENT_PRESETS, ACCENT_COLORS, AccentColor } from '../src/context/AccentThemeContext';

describe('Multi-Accent Color System Architecture', () => {

  it('provides the curated accent color presets with Electric Blue as default', () => {
    expect(ACCENT_COLORS).toEqual(['electric', 'teal', 'red', 'brand']);
    expect(ACCENT_PRESETS.electric).toBeDefined();
    expect(ACCENT_PRESETS.teal).toBeDefined();
    expect(ACCENT_PRESETS.red).toBeDefined();
    expect(ACCENT_PRESETS.brand).toBeDefined();
  });

  it('preserves the Electric Blue primary accent (#3B82F6)', () => {
    const electric = ACCENT_PRESETS.electric;
    expect(electric.primary).toBe('#3B82F6');
    expect(electric.textDark).toBe('#60A5FA');
  });

  it('defines professional palettes for Teal, Red, and Brand Colors', () => {
    const teal = ACCENT_PRESETS.teal;
    expect(teal.primary).toBe('#0F766E');
    expect(teal.textDark).toBe('#2DD4BF');

    const red = ACCENT_PRESETS.red;
    expect(red.primary).toBe('#DC2626');
    expect(red.textDark).toBe('#F87171');

    const brand = ACCENT_PRESETS.brand;
    expect(brand.primary).toBe('#0A7E58');
    expect(brand.textDark).toBe('#34D399');
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

  it('safely handles unknown or invalid color keys by falling back to electric', () => {
    const sanitizeAccent = (input: string | null | undefined): AccentColor => {
      if (input && ACCENT_COLORS.includes(input as AccentColor)) {
        return input as AccentColor;
      }
      return 'electric';
    };

    expect(sanitizeAccent('teal')).toBe('teal');
    expect(sanitizeAccent('red')).toBe('red');
    expect(sanitizeAccent('brand')).toBe('brand');
    expect(sanitizeAccent('purple')).toBe('electric');
    expect(sanitizeAccent('orange')).toBe('electric');
    expect(sanitizeAccent('blue')).toBe('electric');
    expect(sanitizeAccent(null)).toBe('electric');
    expect(sanitizeAccent(undefined)).toBe('electric');
    expect(sanitizeAccent('')).toBe('electric');
  });
});
