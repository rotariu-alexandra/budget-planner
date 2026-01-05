export function makeHslPalette(n: number) {
  
  return Array.from({ length: n }, (_, i) => {
    const hue = Math.round((360 * i) / Math.max(n, 1));
    return `hsl(${hue} 70% 55%)`;
  });
}
