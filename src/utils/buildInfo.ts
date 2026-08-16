/**
 * Helper to get and format the last deployment / build date
 * Format: JJ/MM/AAAA à HH:mm (e.g. 16/08/2026 à 23:30) in Europe/Paris timezone
 */
export function getFormattedBuildDate(): string {
  try {
    // 1. Try injected build-time timestamp (from vite.config.ts define)
    let rawDate: string | number | Date | null = null;

    if (typeof __APP_BUILD_TIME__ !== 'undefined' && __APP_BUILD_TIME__) {
      rawDate = __APP_BUILD_TIME__;
    } else if (import.meta.env.VITE_VERCEL_GIT_COMMIT_DATE) {
      rawDate = import.meta.env.VITE_VERCEL_GIT_COMMIT_DATE;
    }

    const dateObj = rawDate ? new Date(rawDate) : new Date();

    // Valid date check
    if (isNaN(dateObj.getTime())) {
      return 'Dernière mise à jour indisponible';
    }

    // Format in Europe/Paris time zone: DD/MM/YYYY à HH:mm
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Paris'
    }).format(dateObj);

    const timeFormatted = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Paris'
    }).format(dateObj);

    return `Dernière mise à jour : ${dateFormatted} à ${timeFormatted}`;
  } catch {
    return 'Dernière mise à jour récente';
  }
}
