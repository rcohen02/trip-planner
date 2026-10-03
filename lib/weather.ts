export interface DayWeather {
  date: string;
  maxC: number;
  minC: number;
  rainPct: number | null;
  code: number;
  sunrise: string; // local "YYYY-MM-DDTHH:mm"
  sunset: string;
}

interface OpenMeteo {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    weather_code: number[];
    sunrise: string[];
    sunset: string[];
  };
}

export function parseForecast(raw: OpenMeteo): Record<string, DayWeather> {
  const d = raw.daily;
  return Object.fromEntries(
    d.time.map((date, i) => [
      date,
      {
        date,
        maxC: d.temperature_2m_max[i],
        minC: d.temperature_2m_min[i],
        rainPct: d.precipitation_probability_max[i],
        code: d.weather_code[i],
        sunrise: d.sunrise[i],
        sunset: d.sunset[i],
      },
    ]),
  );
}

export function forecastFor(days: Record<string, DayWeather>, date: string): DayWeather | null {
  return days[date] ?? null;
}

export function describeCode(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

export const toF = (c: number) => Math.round((c * 9) / 5 + 32);

/** Fetches a 16-day forecast; cached for 3 hours by Next's fetch cache. Returns {} if the API is down. */
export async function getForecast(lat: number, lng: number, timeZone: string): Promise<Record<string, DayWeather>> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset",
    timezone: timeZone,
    forecast_days: "16",
  });
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 10800 } });
    if (!res.ok) return {};
    return parseForecast(await res.json());
  } catch {
    return {};
  }
}
