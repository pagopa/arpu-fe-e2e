export const availableReasons = [
  { name: "Ho perso la carta d'identità", value: 299 },
  { name: "Mi hanno rubato la carta d'identità", value: 300 },
  { name: "La carta d'identità è rovinata o illeggibile", value: 301 },
  { name: 'Devo rinnovare una carta già scaduta', value: 302 },
  { name: 'È la prima Carta di Identità in assoluto', value: 303 },
  { name: 'Devo rinnovare una carta ancora valida', value: 304 },
  { name: 'Ho cambiato i miei dati anagrafici', value: 305 }
];

export const availableMunicipalities = [
  { name: 'BRESCIA (BS)', fiscal_code: '00761890177' },
  { name: 'MILANO (MI)', fiscal_code: '01199250158' }
];

export const userData = {
  name: 'Marco Polo',
  fiscal_code: 'MRCPLO80A01H501J',
  email: 'marcopolo@test.it'
};

/** Return a random element from a list */
export function getRandomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Convers a currency string to a number.
 * Example: '12,21 €' -> 12.21
 */
export function parseCurrencyToNumber(currencyString: string): number {
  if (!currencyString) return 0;
  // Remove non-numeric characters except for the decimal separator (comma)
  // This assumes the Italian/European format provided in the example
  const sanitized = currencyString.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(sanitized);
}
