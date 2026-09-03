"use client";

import Link from "next/link";
import proj4 from "proj4";
import {
  ArrowLeft,
  Clipboard,
  Compass,
  Download,
  RefreshCw,
  Upload,
} from "lucide-react";
import type { ChangeEvent } from "react";
import {
  useMemo,
  useState,
} from "react";

type InputFormat = "decimal" | "dms" | "utm";
type CrsType = "wgs84-utm" | "arc1960-utm" | "custom";
type UtmHemisphere = "N" | "S";
type CoordinateAxis = "lat" | "lng";

type CoordinatePoint = {
  latitude: number;
  longitude: number;
  label: string;
};

type SegmentResult = {
  from: CoordinatePoint;
  to: CoordinatePoint;
  distanceMeters: number;
  initialBearing: number;
  finalBearing: number;
  reverseBearing: number;
};

type UtmOptions = {
  crs: CrsType;
  zone: number;
  hemisphere: UtmHemisphere;
  customProj4: string;
};

const EARTH_RADIUS_METERS = 6371008.8;
const CSV_MAX_FILE_SIZE = 5 * 1024 * 1024;

const WGS84_GEOGRAPHIC =
  "+proj=longlat +datum=WGS84 +no_defs";

const ARC1960_GEOGRAPHIC =
  "+proj=longlat +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +no_defs";

const DEFAULT_CUSTOM_PROJ4 =
  "+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs";

const inputFormats: {
  key: InputFormat;
  label: string;
  description: string;
  placeholder: string;
}[] = [
  {
    key: "decimal",
    label: "Decimal",
    description: "One point per line: latitude, longitude.",
    placeholder: "Latitude, Longitude",
  },
  {
    key: "dms",
    label: "DMS",
    description:
      "One point per line: latitude DMS, longitude DMS. Use N/S and E/W where needed.",
    placeholder: "Lat DMS, Long DMS",
  },
  {
    key: "utm",
    label: "UTM",
    description:
      "One point per line: easting, northing. Optional zone and N/S can also be included per line.",
    placeholder: "Easting, Northing",
  },
];

const crsOptions: {
  key: CrsType;
  label: string;
}[] = [
  { key: "wgs84-utm", label: "WGS84 / UTM" },
  { key: "arc1960-utm", label: "Arc 1960 / UTM" },
  { key: "custom", label: "Custom Proj4 definition" },
];

const decimalLatitudeAliases = ["latitude", "lat"];
const decimalLongitudeAliases = ["longitude", "lng", "lon", "long"];

const utmEastingAliases = [
  "easting",
  "east",
  "e",
  "x",
  "east_x",
  "eastx",
  "utm_easting",
  "utmeasting",
];

const utmNorthingAliases = [
  "northing",
  "north",
  "n",
  "y",
  "north_y",
  "northy",
  "utm_northing",
  "utmnorthing",
];

const utmZoneAliases = ["zone", "utm_zone", "utmzone"];
const utmHemisphereAliases = [
  "hemisphere",
  "hemi",
  "utm_hemisphere",
  "utmhemisphere",
  "utm_hemi",
  "utmhemi",
  "band",
  "utm_band",
  "utmband",
];

const dmsLatitudeTextAliases = [
  "latitude_dms",
  "lat_dms",
  "latdms",
  "latitudedms",
];

const dmsLongitudeTextAliases = [
  "longitude_dms",
  "lng_dms",
  "lon_dms",
  "long_dms",
  "lngdms",
  "londms",
  "longdms",
  "longitudedms",
];

const dmsLatitudeDegreeAliases = [
  "lat_deg",
  "latdeg",
  "lat_degree",
  "latdegree",
  "latitude_deg",
  "latitude_degree",
  "latitude_degrees",
];

const dmsLatitudeMinuteAliases = [
  "lat_min",
  "latmin",
  "lat_minute",
  "latminute",
  "latitude_min",
  "latitude_minute",
  "latitude_minutes",
];

const dmsLatitudeSecondAliases = [
  "lat_sec",
  "latsec",
  "lat_second",
  "latsecond",
  "latitude_sec",
  "latitude_second",
  "latitude_seconds",
];

const dmsLatitudeDirectionAliases = [
  "lat_dir",
  "latdir",
  "lat_direction",
  "latdirection",
  "latitude_dir",
  "latitude_direction",
];

const dmsLongitudeDegreeAliases = [
  "lng_deg",
  "lngdeg",
  "lon_deg",
  "londeg",
  "long_deg",
  "longdeg",
  "longitude_deg",
  "longitude_degree",
  "longitude_degrees",
];

const dmsLongitudeMinuteAliases = [
  "lng_min",
  "lngmin",
  "lon_min",
  "lonmin",
  "long_min",
  "longmin",
  "longitude_min",
  "longitude_minute",
  "longitude_minutes",
];

const dmsLongitudeSecondAliases = [
  "lng_sec",
  "lngsec",
  "lon_sec",
  "lonsec",
  "long_sec",
  "longsec",
  "longitude_sec",
  "longitude_second",
  "longitude_seconds",
];

const dmsLongitudeDirectionAliases = [
  "lng_dir",
  "lngdir",
  "lon_dir",
  "londir",
  "long_dir",
  "longdir",
  "longitude_dir",
  "longitude_direction",
];

const csvAcceptedColumnsMessage =
  "CSV columns accepted: Decimal uses Latitude/Lat and Longitude/Lng/Lon/Long. UTM uses Easting/E/X and Northing/N/Y, with optional Zone and Hemisphere/Hemi. DMS uses Latitude DMS/Longitude DMS text, or LatDeg/LatMin/LatSec/LatDir plus LngDeg/LngMin/LngSec/LngDir.";

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function parseNumericToken(token: string) {
  const normalized = token.trim().replace(",", ".");

  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);

  return Number.isFinite(value) ? value : null;
}

function extractNumbers(text: string) {
  return (text.match(/[-+]?\d+(?:[.,]\d+)?/g) || [])
    .map(parseNumericToken)
    .filter((value): value is number => value !== null);
}

function validateDecimalPoint(
  latitude: number,
  longitude: number,
  lineNumber: number
) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return `Line ${lineNumber}: latitude and longitude must be valid numbers.`;
  }

  if (latitude < -90 || latitude > 90) {
    return `Line ${lineNumber}: latitude must be between -90 and 90.`;
  }

  if (longitude < -180 || longitude > 180) {
    return `Line ${lineNumber}: longitude must be between -180 and 180.`;
  }

  return null;
}

function parseDecimalLine(line: string, lineNumber: number) {
  const values = line
    .split(/[\s,;|]+/)
    .map(parseNumericToken)
    .filter((value): value is number => value !== null);

  if (values.length < 2) {
    return {
      error: `Line ${lineNumber}: enter latitude and longitude.`,
      point: null,
    };
  }

  const latitude = values[0];
  const longitude = values[1];
  const error = validateDecimalPoint(latitude, longitude, lineNumber);

  if (error) {
    return { error, point: null };
  }

  return {
    error: null,
    point: { latitude, longitude },
  };
}

function getDmsDirection(text: string, axis: CoordinateAxis) {
  const match = text
    .toUpperCase()
    .match(axis === "lat" ? /[NS]/ : /[EW]/);

  return match ? match[0] : null;
}

function dmsComponentsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: string | null
) {
  const absoluteDegrees = Math.abs(degrees);
  let decimal =
    absoluteDegrees + minutes / 60 + seconds / 3600;

  if (direction === "S" || direction === "W") {
    decimal = -decimal;
  } else if (!direction && degrees < 0) {
    decimal = -decimal;
  }

  return decimal;
}

function parseDmsCoordinateFromText(
  text: string,
  axis: CoordinateAxis,
  lineNumber: number
) {
  const numbers = extractNumbers(text);

  if (numbers.length < 1) {
    return {
      error: `Line ${lineNumber}: missing ${axis === "lat" ? "latitude" : "longitude"} DMS values.`,
      value: null,
    };
  }

  const degrees = numbers[0];
  const minutes = numbers[1] ?? 0;
  const seconds = numbers[2] ?? 0;

  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    return {
      error: `Line ${lineNumber}: DMS minutes and seconds must be between 0 and 59.`,
      value: null,
    };
  }

  const direction = getDmsDirection(text, axis);
  const value = dmsComponentsToDecimal(
    degrees,
    minutes,
    seconds,
    direction
  );
  const validationError =
    axis === "lat"
      ? validateDecimalPoint(value, 0, lineNumber)
      : validateDecimalPoint(0, value, lineNumber);

  if (validationError) {
    return {
      error: validationError,
      value: null,
    };
  }

  return {
    error: null,
    value,
  };
}

function parseDmsLine(line: string, lineNumber: number) {
  const semicolonParts = line
    .split(/[;|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const commaParts = line
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const coordinateParts =
    semicolonParts.length >= 2
      ? semicolonParts
      : commaParts.length >= 2
        ? commaParts
        : [];

  if (coordinateParts.length >= 2) {
    const latitudeResult = parseDmsCoordinateFromText(
      coordinateParts[0],
      "lat",
      lineNumber
    );
    const longitudeResult = parseDmsCoordinateFromText(
      coordinateParts[1],
      "lng",
      lineNumber
    );

    if (latitudeResult.error || longitudeResult.error) {
      return {
        error: latitudeResult.error || longitudeResult.error,
        point: null,
      };
    }

    return {
      error: null,
      point: {
        latitude: latitudeResult.value as number,
        longitude: longitudeResult.value as number,
      },
    };
  }

  const values = extractNumbers(line);

  if (values.length < 6) {
    return {
      error: `Line ${lineNumber}: enter DMS as latitude degrees minutes seconds and longitude degrees minutes seconds.`,
      point: null,
    };
  }

  const uppercaseLine = line.toUpperCase();
  const latitudeDirection =
    uppercaseLine.match(/[NS]/)?.[0] || null;
  const longitudeDirection =
    uppercaseLine.match(/[EW]/)?.[0] || null;

  const latitudeResult = parseDmsCoordinateFromText(
    values.slice(0, 3).join(" ") +
      (latitudeDirection ? ` ${latitudeDirection}` : ""),
    "lat",
    lineNumber
  );
  const longitudeResult = parseDmsCoordinateFromText(
    values.slice(3, 6).join(" ") +
      (longitudeDirection ? ` ${longitudeDirection}` : ""),
    "lng",
    lineNumber
  );

  if (latitudeResult.error || longitudeResult.error) {
    return {
      error: latitudeResult.error || longitudeResult.error,
      point: null,
    };
  }

  return {
    error: null,
    point: {
      latitude: latitudeResult.value as number,
      longitude: longitudeResult.value as number,
    },
  };
}

function normalizeUtmZone(value: unknown, fallback = 37) {
  const parsed =
    typeof value === "number"
      ? value
      : parseNumericToken(String(value ?? ""));

  if (parsed === null || parsed < 1 || parsed > 60) {
    return fallback;
  }

  return Math.round(parsed);
}

function getUtmZoneError(value: string) {
  const parsed = parseNumericToken(value);

  if (parsed === null || parsed < 1 || parsed > 60) {
    return "UTM zone must be between 1 and 60.";
  }

  return null;
}

function normalizeHemisphere(value: unknown): UtmHemisphere {
  const text = String(value || "").trim().toUpperCase();

  return text.startsWith("N") ? "N" : "S";
}

function getGeographicProjection(crs: CrsType) {
  return crs === "arc1960-utm"
    ? ARC1960_GEOGRAPHIC
    : WGS84_GEOGRAPHIC;
}

function getUtmProjection(
  crs: CrsType,
  zone: number,
  hemisphere: UtmHemisphere,
  customProj4: string
) {
  if (crs === "custom") {
    return customProj4.trim();
  }

  const south = hemisphere === "S" ? " +south" : "";

  if (crs === "arc1960-utm") {
    return `+proj=utm +zone=${zone}${south} +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs`;
  }

  return `+proj=utm +zone=${zone}${south} +datum=WGS84 +units=m +no_defs`;
}

function utmToDecimal(
  easting: number,
  northing: number,
  options: UtmOptions
) {
  const sourceProjection = getUtmProjection(
    options.crs,
    options.zone,
    options.hemisphere,
    options.customProj4
  );
  const targetProjection = getGeographicProjection(options.crs);

  const result = proj4(sourceProjection, targetProjection, [
    easting,
    northing,
  ]) as [number, number];

  return {
    longitude: result[0],
    latitude: result[1],
  };
}

function validateUtmInput(
  easting: number,
  northing: number,
  zone: number,
  lineNumber: number
) {
  if (
    !Number.isFinite(easting) ||
    !Number.isFinite(northing)
  ) {
    return `Line ${lineNumber}: easting and northing must be valid numbers.`;
  }

  if (zone < 1 || zone > 60) {
    return `Line ${lineNumber}: UTM zone must be between 1 and 60.`;
  }

  if (easting < 100000 || easting > 900000) {
    return `Line ${lineNumber}: easting is outside the normal UTM range. Use easting, northing order.`;
  }

  if (northing < 0 || northing > 10000000) {
    return `Line ${lineNumber}: northing is outside the normal UTM range. Check hemisphere or coordinate order.`;
  }

  return null;
}

function parseUtmLine(
  line: string,
  lineNumber: number,
  options: UtmOptions
) {
  const values = extractNumbers(line);

  if (values.length < 2) {
    return {
      error: `Line ${lineNumber}: enter UTM easting and northing.`,
      point: null,
    };
  }

  const leadingZoneMatch = line
    .trim()
    .match(/^(\d{1,2})\s*([NS])?\b/i);
  const startsWithZone =
    values.length >= 3 &&
    leadingZoneMatch &&
    Number(leadingZoneMatch[1]) === values[0] &&
    values[0] >= 1 &&
    values[0] <= 60;

  let zone = options.zone;
  let hemisphere = options.hemisphere;
  let easting = values[0];
  let northing = values[1];

  if (startsWithZone) {
    zone = normalizeUtmZone(values[0], options.zone);
    easting = values[1];
    northing = values[2];

    if (leadingZoneMatch[2]) {
      hemisphere = normalizeHemisphere(leadingZoneMatch[2]);
    }
  } else if (
    values.length >= 3 &&
    values[2] >= 1 &&
    values[2] <= 60
  ) {
    zone = normalizeUtmZone(values[2], options.zone);
  }

  const zoneHemisphereMatch = line.match(
    /\b([1-5]?\d|60)\s*([NS])\b/i
  );
  const explicitHemisphere = line.match(/\b([NS])\b/i);

  if (zoneHemisphereMatch) {
    zone = normalizeUtmZone(zoneHemisphereMatch[1], zone);
    hemisphere = normalizeHemisphere(zoneHemisphereMatch[2]);
  } else if (explicitHemisphere) {
    hemisphere = normalizeHemisphere(explicitHemisphere[1]);
  }

  const utmError = validateUtmInput(
    easting,
    northing,
    zone,
    lineNumber
  );

  if (utmError) {
    return { error: utmError, point: null };
  }

  try {
    const point = utmToDecimal(easting, northing, {
      ...options,
      zone,
      hemisphere,
    });
    const coordinateError = validateDecimalPoint(
      point.latitude,
      point.longitude,
      lineNumber
    );

    if (coordinateError) {
      return { error: coordinateError, point: null };
    }

    return {
      error: null,
      point,
    };
  } catch {
    return {
      error: `Line ${lineNumber}: unable to convert UTM coordinates. Check CRS, zone and hemisphere.`,
      point: null,
    };
  }
}

function parseCoordinateText(
  text: string,
  inputFormat: InputFormat,
  utmOptions: UtmOptions
) {
  const points: CoordinatePoint[] = [];
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (
    lines.length > 0 &&
    inputFormat === "utm" &&
    utmOptions.crs === "custom" &&
    !utmOptions.customProj4.trim()
  ) {
    return {
      points,
      errors: [
        "Enter a custom Proj4 definition before converting UTM coordinates.",
      ],
    };
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const result =
      inputFormat === "dms"
        ? parseDmsLine(line, lineNumber)
        : inputFormat === "utm"
          ? parseUtmLine(line, lineNumber, utmOptions)
          : parseDecimalLine(line, lineNumber);

  const inputFormat, result.point) {
    { key: "decimal", label: "Decimal" },
    { key: "dms", label: "DMS" },
    { key: "utm", label: "UTM" },
  ];
    if (result.error || !result.point) {
      errors.push(result.error || `Line ${lineNumber}: invalid coordinate.`);
      return;
    }

    points.push({
      ...result.point,
      label: `Point ${points.length + 1}`,
    });
  });

  return { points, errors };
}

function calculateDistanceMeters(
  start: CoordinatePoint,
  end: CoordinatePoint
) {
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(start.latitude)) *
      Math.cos(toRadians(end.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function calculateInitialBearing(
  start: CoordinatePoint,
  end: CoordinatePoint
) {
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);

  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
  const x =
    Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) *
      Math.cos(endLatitude) *
      Math.cos(longitudeDelta);

  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

function calculateFinalBearing(
  start: CoordinatePoint,
  end: CoordinatePoint
) {
  return normalizeDegrees(calculateInitialBearing(end, start) + 180);
}

function getCompassDirection(bearing: number) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];

  return directions[Math.round(bearing / 22.5) % 16];
}

function buildSegments(points: CoordinatePoint[]) {
  return points.slice(1).map((point, index) => {
    const from = points[index];
    const to = point;
    const initialBearing = calculateInitialBearing(from, to);
    const finalBearing = calculateFinalBearing(from, to);

    return {
      from,
      to,
      distanceMeters: calculateDistanceMeters(from, to),
      initialBearing,
      finalBearing,
      reverseBearing: normalizeDegrees(initialBearing + 180),
    };
  });
}
