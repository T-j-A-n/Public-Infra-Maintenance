export function computeFootpathColor(
  garbage: boolean,
  encroachment: boolean,
  obstruction: boolean
): 'red' | 'yellow' | 'green' {
  const count = [garbage, encroachment, obstruction].filter(Boolean).length;
  if (count >= 2) return 'red';
  if (count === 1) return 'yellow';
  return 'green';
}

export function colorToSeverity(color: 'red' | 'yellow' | 'green'): string {
  if (color === 'red') return 'Critical';
  if (color === 'yellow') return 'Warning';
  return 'Clear';
}
