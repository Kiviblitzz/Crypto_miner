// Erfolge: check(s, h, g) wird einmal pro Woche geprüft; ohne check nur über Ereignisse (fx.ach) vergeben
export const ACHIEVEMENTS = [
  { id: 'firstsale', name: 'Hallo Welt', desc: 'Deine ersten Bitcoin verkauft.', check: (s) => s.stats.sold > 0 },
  { id: 'pizza', name: 'Pizza-Tag', desc: 'Eine Pizza mit Bitcoin bezahlt.' },
  { id: 'ai', name: 'Zweites Standbein', desc: 'Fläche an eine KI-Firma vermietet.' },
];
export const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
