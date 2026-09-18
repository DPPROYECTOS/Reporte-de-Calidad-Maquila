export interface FontOption {
  id: string;
  name: string;
  css: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'serif',
    name: 'Playfair Display / Serif Elegante (Normativo)',
    css: "'Playfair Display', Georgia, Cambria, 'Times New Roman', serif",
  },
  {
    id: 'sans',
    name: 'Plus Jakarta Sans / Sans Moderno',
    css: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'cinzel',
    name: 'Cinzel / Titular Ejecutivo Clásico',
    css: "'Cinzel', Georgia, 'Times New Roman', serif",
  },
  {
    id: 'merriweather',
    name: 'Merriweather / Editorial Robusto',
    css: "'Merriweather', Georgia, serif",
  },
  {
    id: 'inter',
    name: 'Inter / Suizo Neutral',
    css: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'mono',
    name: 'JetBrains Mono / Técnico Exacto',
    css: "'JetBrains Mono', 'Courier New', monospace",
  },
  {
    id: 'georgia',
    name: 'Georgia / Clásico Editorial',
    css: "Georgia, Cambria, 'Times New Roman', serif",
  },
  {
    id: 'arial',
    name: 'Arial / Estándar Industrial',
    css: "Arial, Helvetica, sans-serif",
  },
  {
    id: 'trebuchet',
    name: 'Trebuchet MS / Dinámico Corporativo',
    css: "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', sans-serif",
  },
];

export function getTitleFontCss(fontId?: string): string {
  if (!fontId) return "'Playfair Display', Georgia, Cambria, 'Times New Roman', serif";
  const found = FONT_OPTIONS.find((f) => f.id === fontId);
  return found ? found.css : "'Playfair Display', Georgia, Cambria, 'Times New Roman', serif";
}

export function getGeneralFontCss(fontId?: string): string {
  if (!fontId) return "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const found = FONT_OPTIONS.find((f) => f.id === fontId);
  return found ? found.css : "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
}
