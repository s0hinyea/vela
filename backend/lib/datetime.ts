const DEFAULT_TIME_ZONE = "UTC";

function readPart(parts: Intl.DateTimeFormatPart[], type: string): string {
    return parts.find((part) => part.type === type)?.value ?? "";
}

export function resolveTimeZone(timeZone?: string | null): string {
    const candidate = typeof timeZone === "string" ? timeZone.trim() : "";
    if (!candidate) return DEFAULT_TIME_ZONE;

    try {
        new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
        return candidate;
    } catch {
        return DEFAULT_TIME_ZONE;
    }
}

export function getDateTimeInZone(timeZone?: string | null): {
    today: string;
    currentHHMM: string;
    currentMinutes: number;
    timeZone: string;
} {
    const tz = resolveTimeZone(timeZone);
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);

    const year = readPart(parts, "year");
    const month = readPart(parts, "month");
    const day = readPart(parts, "day");
    const hour = readPart(parts, "hour");
    const minute = readPart(parts, "minute");

    const currentMinutes = Number(hour) * 60 + Number(minute);

    return {
        today: `${year}-${month}-${day}`,
        currentHHMM: `${hour}:${minute}`,
        currentMinutes: Number.isFinite(currentMinutes) ? currentMinutes : 0,
        timeZone: tz,
    };
}
