/**
 * Deterministic Solar & Bioclimatic Calculation Engine
 * Based on Spencer (1971) & NOAA Solar Position Algorithms
 */

export interface SolarPosition {
  altitudeDeg: number; // Angle above horizon (0° to 90°)
  azimuthDeg: number; // 0° = North, 90° = East, 180° = South, 270° = West
  isDaylight: boolean;
  shadowLengthRatio: number; // Shadow length multiplier per 1m height
  solarDeclinationDeg: number;
  equationOfTimeMin: number;
}

export function calculateSolarPosition(
  latitudeDeg: number,
  dayOfYear: number, // 1 - 365
  hourOfDay: number // 0.0 - 24.0 (decimal hours)
): SolarPosition {
  // Day angle in radians (Spencer 1971)
  const gamma = (2 * Math.PI * (dayOfYear - 1)) / 365;

  // Solar Declination in radians (Spencer formula)
  const declinationRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Equation of Time in minutes
  const eqTimeMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar Hour Angle in radians (assuming standard solar noon at 12:00)
  // Solar Time = Standard Time + (eqTimeMin / 60)
  const solarTimeHours = hourOfDay + eqTimeMin / 60;
  const hourAngleRad = ((solarTimeHours - 12) * 15 * Math.PI) / 180;

  const latRad = (latitudeDeg * Math.PI) / 180;

  // Solar Zenith Angle (theta)
  const cosZenith =
    Math.sin(latRad) * Math.sin(declinationRad) +
    Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);

  const zenithRad = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
  const altitudeRad = Math.PI / 2 - zenithRad;
  const altitudeDeg = (altitudeRad * 180) / Math.PI;

  const isDaylight = altitudeDeg > 0;

  // Solar Azimuth Angle (Spencer / NOAA convention: 0 = North, 90 = East, 180 = South, 270 = West)
  let azimuthDeg = 180;
  if (isDaylight) {
    const cosAzimuth =
      (Math.sin(declinationRad) * Math.cos(latRad) -
        Math.cos(declinationRad) * Math.sin(latRad) * Math.cos(hourAngleRad)) /
      Math.sin(zenithRad);

    const boundedCos = Math.max(-1, Math.min(1, cosAzimuth));
    let azRad = Math.acos(boundedCos);
    if (hourAngleRad > 0) {
      azRad = 2 * Math.PI - azRad;
    }
    azimuthDeg = (azRad * 180) / Math.PI;
  }

  // Shadow length ratio = 1 / tan(altitude)
  let shadowLengthRatio = 0;
  if (altitudeDeg > 1) {
    shadowLengthRatio = 1 / Math.tan(altitudeRad);
  } else if (altitudeDeg > 0) {
    shadowLengthRatio = 20; // Cap long dawn/dusk shadows
  }

  return {
    altitudeDeg: Math.round(altitudeDeg * 10) / 10,
    azimuthDeg: Math.round(azimuthDeg * 10) / 10,
    isDaylight,
    shadowLengthRatio: Math.min(25, Math.round(shadowLengthRatio * 100) / 100),
    solarDeclinationDeg: (declinationRad * 180) / Math.PI,
    equationOfTimeMin: Math.round(eqTimeMin * 10) / 10,
  };
}

export function getSolsticeDates() {
  return [
    { label: "Summer Solstice (Jun 21)", dayOfYear: 172 },
    { label: "Spring/Autumn Equinox (Mar 21 / Sep 21)", dayOfYear: 80 },
    { label: "Winter Solstice (Dec 21)", dayOfYear: 355 },
  ];
}

export function getBioclimaticOrientationAdvice(
  daylightReq: string,
  latitudeDeg: number
): { recommendedAzimuthDeg: number; rationale: string } {
  const isNorthernHemisphere = latitudeDeg >= 0;

  switch (daylightReq) {
    case "diffuse_north":
      return {
        recommendedAzimuthDeg: isNorthernHemisphere ? 0 : 180,
        rationale: isNorthernHemisphere
          ? "North-facing facade receives glare-free, uniform ambient daylight ideal for studios, galleries & drafting."
          : "South-facing facade receives diffuse glare-free light in Southern hemisphere.",
      };
    case "direct_south":
      return {
        recommendedAzimuthDeg: isNorthernHemisphere ? 180 : 0,
        rationale: isNorthernHemisphere
          ? "South-facing orientation maximizes passive solar heat gain in winter and active solar photovoltaic efficiency."
          : "North-facing orientation captures direct sun in Southern hemisphere.",
      };
    case "morning_east":
      return {
        recommendedAzimuthDeg: 90,
        rationale: "East-facing rooms capture gentle morning thermal warming and awakening circadian light.",
      };
    case "evening_west":
      return {
        recommendedAzimuthDeg: 270,
        rationale: "West-facing rooms receive intense low-angle afternoon sun; requires louvers or shading devices.",
      };
    default:
      return {
        recommendedAzimuthDeg: 0,
        rationale: "Flexible daylight requirements; suitable for internal buffer zones.",
      };
  }
}
