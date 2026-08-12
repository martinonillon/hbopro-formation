/**
 * Utility functions for robust date parsing, normalization, and French formatting (JJ/MM/AAAA)
 */

/**
 * Normalizes any incoming date string/number (FR DD/MM/YYYY, US M/D/YY, ISO YYYY-MM-DD, Excel serials, etc.)
 * into an ISO date string 'YYYY-MM-DD'.
 */
export function normalizeDateToISO(dateStr?: string | number | null | any): string | undefined {
  if (dateStr === undefined || dateStr === null) return undefined;
  if (typeof dateStr === 'object') {
    if (dateStr.dateDebut) return normalizeDateToISO(dateStr.dateDebut);
    if (dateStr.dateInscription) return normalizeDateToISO(dateStr.dateInscription);
    if (dateStr.date) return normalizeDateToISO(dateStr.date);
    return undefined;
  }
  let str = String(dateStr).trim();
  if (!str) return undefined;

  // If it's an Excel numeric serial date (e.g. 45492 or "45492")
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const serial = parseFloat(str);
    if (!isNaN(serial)) {
      // Excel epoch starts 1899-12-30
      const utcDays = Math.floor(serial - 25569);
      const date = new Date(utcDays * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        const yyyy = date.getUTCFullYear();
        const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(date.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
  }

  // ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Slashes or Dots or Dashes with 2-digit or 4-digit year at end: e.g. "22/07/2026", "7/22/26", "22/7/2026", "07/22/2026"
  const slashMatch = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
  if (slashMatch) {
    let p1 = parseInt(slashMatch[1], 10);
    let p2 = parseInt(slashMatch[2], 10);
    let y = parseInt(slashMatch[3], 10);

    if (y < 100) {
      y += (y < 50 ? 2000 : 1900); // e.g. 26 -> 2026
    }

    let day = p1;
    let month = p2;

    // If part 1 > 12, part 1 is day, part 2 is month (DD/MM)
    if (p1 > 12) {
      day = p1;
      month = p2;
    } 
    // If part 2 > 12, part 2 is day, part 1 is month (MM/DD)
    else if (p2 > 12) {
      day = p2;
      month = p1;
    }
    // If both <= 12, default to DD/MM (French standard)
    else {
      day = p1;
      month = p2;
    }

    const yyyy = String(y);
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback to JS Date parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return str;
}

/**
 * Formats any date string/number into French standard format JJ/MM/AAAA (DD/MM/YYYY)
 */
export function formatDateFR(dateStr?: string | number | null | any): string {
  if (!dateStr) return '';
  if (typeof dateStr === 'object') {
    if (dateStr.dateDebut) return formatDateFR(dateStr.dateDebut);
    if (dateStr.dateInscription) return formatDateFR(dateStr.dateInscription);
    if (dateStr.date) return formatDateFR(dateStr.date);
    return '';
  }
  
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return typeof dateStr === 'string' ? dateStr : '';

  const parts = iso.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year.length === 4 && month.length === 2 && day.length === 2) {
      return `${day}/${month}/${year}`;
    }
  }

  return typeof dateStr === 'string' ? dateStr : '';
}

export const formatDateDMY = formatDateFR;

/**
 * Normalizes import date values specifically for database storage in ISO format (YYYY-MM-DD)
 */
export function parseImportDate(strVal?: string | number | null): string | undefined {
  return normalizeDateToISO(strVal);
}
