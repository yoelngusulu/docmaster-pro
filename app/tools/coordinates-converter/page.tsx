"use client";

import Link from "next/link";
import proj4 from "proj4";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import * as XLSX from "xlsx";

import { saveConversionHistory } from "@/lib/supabase/conversionHistory";

type Mode =
  | "dd-to-dms"
  | "dd-to-utm"
  | "dms-to-dd"
  | "dms-to-utm"
  | "utm-to-dms"
  | "bulk-file";

type BulkType =
  | "decimal-to-dms-utm"
  | "dms-to-utm"
  | "utm-to-dms";

type CrsType = "wgs84-utm" | "arc1960-utm" | "custom";
type LatitudeDirection = "N" | "S";
type LongitudeDirection = "E" | "W";
type BulkRow = Record<string, string | number | null | undefined>;

type UsageCheckResult = {
  allowed: boolean;
  message: string | null;
};

type ConvertedRow = {
  original: BulkRow;
  input: string;
  status: "OK" | "Warning" | "Error";
  id?: string;
  latitude?: string;
  longitude?: string;
  dmsLatitude?: string;
  dmsLongitude?: string;
  rawEasting?: string;
  rawNorthing?: string;
  correctedEasting?: string;
  correctedNorthing?: string;
  zone?: string;
  band?: string;
  hemisphere?: string;
  elevation?: string;
  quality?: string;
  warning?: string;
  error?: string;
};

type PreviewPoint = {
  latitude: number;
  longitude: number;
  label: string;
  details?: string[];
};

type BulkDetection = {
  type: BulkType | null;
  confidence: "high" | "medium" | "low";
  reason: string;
};

const modes: { key: Mode; label: string }[] = [
  { key: "dd-to-dms", label: "Decimal to DMS" },
  { key: "dd-to-utm", label: "Decimal to UTM" },
  { key: "dms-to-dd", label: "DMS to Decimal" },
  { key: "dms-to-utm", label: "DMS to UTM" },
  { key: "utm-to-dms", label: "UTM to DMS" },
  { key: "bulk-file", label: "CSV / Excel Bulk" },
];

const bulkTypes: { key: BulkType; label: string }[] = [
  {
    key: "decimal-to-dms-utm",
    label: "Decimal columns to DMS and UTM",
  },
  { key: "dms-to-utm", label: "DMS columns to Decimal and UTM" },
  { key: "utm-to-dms", label: "UTM columns to Decimal and DMS" },
];

const crsOptions: { key: CrsType; label: string }[] = [
  { key: "wgs84-utm", label: "WGS84 / UTM" },
  { key: "arc1960-utm", label: "Arc 1960 / UTM" },
  { key: "custom", label: "Custom Proj4 definition" },
];

const WGS84_GEOGRAPHIC = "+proj=longlat +datum=WGS84 +no_defs";
const ARC1960_GEOGRAPHIC =
  "+proj=longlat +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +no_defs";
const DEFAULT_CUSTOM_PROJ4 =
  "+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs";

const knownColumnAliases = [
  "id",
  "name",
  "point",
  "pointid",
  "station",
  "well",
  "wellid",
  "latitude",
  "lat",
  "longitude",
  "lng",
  "lon",
  "long",
  "easting",
  "e",
  "east",
  "eastx",
  "x",
  "northing",
  "n",
  "north",
  "northy",
  "y",
  "zone",
  "utmzone",
  "hemisphere",
  "hemi",
  "band",
  "bandlat",
  "elevation",
  "height",
  "z",
  "rl",
  "latdeg",
  "latdegree",
  "latdegrees",
  "latmin",
  "latminute",
  "latminutes",
  "latsec",
  "latsecond",
  "latseconds",
  "latdir",
  "latdirection",
  "lngdeg",
  "londeg",
  "longdeg",
  "lngmin",
  "lonmin",
  "longmin",
  "lngsec",
  "lonsec",
  "longsec",
  "lngdir",
  "londir",
  "longdir",
  "lngdirection",
];

const convertedColumns: { key: keyof ConvertedRow; label: string }[] = [
  { key: "input", label: "Input" },
  { key: "status", label: "Status" },
  { key: "id", label: "ID" },
  { key: "latitude", label: "Latitude" },
  { key: "longitude", label: "Longitude" },
  { key: "dmsLatitude", label: "DMS Latitude" },
  { key: "dmsLongitude", label: "DMS Longitude" },
  { key: "rawEasting", label: "Raw Easting" },
  { key: "rawNorthing", label: "Raw Northing" },
  { key: "correctedEasting", label: "Corrected Easting" },
  { key: "correctedNorthing", label: "Corrected Northing" },
  { key: "zone", label: "Zone" },
  { key: "band", label: "Band" },
  { key: "hemisphere", label: "Hemisphere" },
  { key: "elevation", label: "Elevation" },
  { key: "quality", label: "Quality" },
  { key: "warning", label: "Warning" },
  { key: "error", label: "Error" },
];

async function checkCoordinateBulkUsage(): Promise<UsageCheckResult> {
  const response = await fetch("/api/tools/coordinates-bulk-usage", {
    method: "POST",
  });

  if (response.ok) return { allowed: true, message: null };

  const data = await response.json().catch(() => null);
  return {
    allowed: false,
    message:
      data?.message ||
      "You have reached your CSV/Excel bulk conversion limit for today.",
  };
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined) return null;

  let text = String(value).trim();
  if (!text) return null;

  text = text.replace(/\s/g, "");

  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/,/g, "");
  } else if ((text.match(/,/g) || []).length === 1) {
    text = text.replace(",", ".");
  } else if ((text.match(/,/g) || []).length > 1) {
    text = text.replace(/,/g, "");
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function formatDecimal(value: number) {
  return value.toFixed(8);
}

function formatMeter(value: number) {
  return value.toFixed(3);
}

function toDms(value: number, type: "lat" | "lng") {
  const direction =
    type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  return `${degrees}° ${minutes}' ${seconds.toFixed(4)}\" ${direction}`;
}

function dmsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: string
) {
  const decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  return ["S", "W"].includes(direction.toUpperCase()) ? -decimal : decimal;
}

function applyDecimalDirection(
  value: number,
  direction: LatitudeDirection | LongitudeDirection
) {
  const absolute = Math.abs(value);
  return direction === "S" || direction === "W" ? -absolute : absolute;
}

function getUtmBand(latitude: number) {
  const bands = "CDEFGHJKLMNPQRSTUVWX";
  if (latitude <= -80) return "C";
  if (latitude >= 84) return "X";
  const index = Math.floor((latitude + 80) / 8);
  return bands[Math.min(Math.max(index, 0), bands.length - 1)];
}

function zoneFromLongitude(longitude: number) {
  return Math.min(Math.max(Math.floor((longitude + 180) / 6) + 1, 1), 60);
}

function normalizeZone(value: unknown, fallback = 37) {
  const parsed = parseNumber(value);
  const fallbackZone = fallback >= 1 && fallback <= 60 ? Math.round(fallback) : 37;
  if (parsed === null || parsed < 1 || parsed > 60) return fallbackZone;
  return Math.round(parsed);
}

function normalizeHemisphere(value: unknown, fallback = "S") {
  const text = String(value || "").trim().toUpperCase();
  if (text.startsWith("N")) return "N";
  if (text.startsWith("S")) return "S";
  return fallback.toUpperCase() === "N" ? "N" : "S";
}

function normalizeLongitudeDirection(value: unknown) {
  return String(value || "").trim().toUpperCase().startsWith("W") ? "W" : "E";
}

function hemisphereFromBand(value: unknown) {
  const band = String(value || "").trim().toUpperCase();
  if (!band) return null;
  return band <= "M" ? "S" : "N";
}

function getGeographicProjection(crs: CrsType) {
  return crs === "arc1960-utm" ? ARC1960_GEOGRAPHIC : WGS84_GEOGRAPHIC;
}

function getUtmProjection(
  crs: CrsType,
  zone: number,
  hemisphere: string,
  customProj4: string
) {
  if (crs === "custom") return customProj4.trim();
  const south = hemisphere.toUpperCase() === "S" ? " +south" : "";

  if (crs === "arc1960-utm") {
    return `+proj=utm +zone=${zone}${south} +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs`;
  }

  return `+proj=utm +zone=${zone}${south} +datum=WGS84 +units=m +no_defs`;
}

function decimalToUtm(
  latitude: number,
  longitude: number,
  crs: CrsType,
  zone: number,
  hemisphere: string,
  customProj4: string
) {
  const result = proj4(
    getGeographicProjection(crs),
    getUtmProjection(crs, zone, hemisphere, customProj4),
    [longitude, latitude]
  ) as [number, number];

  return { easting: result[0], northing: result[1] };
}

function utmToDecimal(
  easting: number,
  northing: number,
  crs: CrsType,
  zone: number,
  hemisphere: string,
  customProj4: string
) {
  const result = proj4(
    getUtmProjection(crs, zone, hemisphere, customProj4),
    WGS84_GEOGRAPHIC,
    [easting, northing]
  ) as [number, number];

  return { longitude: result[0], latitude: result[1] };
}

function validateDecimalCoordinates(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "Latitude and longitude must be valid numbers.";
  }
  if (latitude < -90 || latitude > 90) {
    return "Latitude must be between 90 S and 90 N.";
  }
  if (longitude < -180 || longitude > 180) {
    return "Longitude must be between 180 W and 180 E.";
  }
  return null;
}

function validateDmsParts(
  latMin: number,
  latSec: number,
  lngMin: number,
  lngSec: number
) {
  if (
    latMin < 0 ||
    latMin >= 60 ||
    latSec < 0 ||
    latSec >= 60 ||
    lngMin < 0 ||
    lngMin >= 60 ||
    lngSec < 0 ||
    lngSec >= 60
  ) {
    return "Minutes and seconds must be between 0 and 59.";
  }
  return null;
}

function validateUtmInput(
  easting: number,
  northing: number,
  zone: number,
  skipStrictRange = false
) {
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
    return "Easting and northing must be valid numbers.";
  }
  if (zone < 1 || zone > 60) return "UTM zone must be between 1 and 60.";

  if (!skipStrictRange) {
    if (easting < 100000 || easting > 900000) {
      return "Easting is outside the normal UTM range. Check the source CRS/projection or use an easting offset.";
    }
    if (northing < 0 || northing > 10000000) {
      return "Northing is outside the normal UTM range. Check the hemisphere, source CRS or northing offset.";
    }
  }

  return null;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getValue(row: BulkRow, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);

  for (const [key, value] of Object.entries(row)) {
    if (
      normalizedAliases.includes(normalizeHeader(key)) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return null;
}

function getNumber(row: BulkRow, aliases: string[]) {
  return parseNumber(getValue(row, aliases));
}

function getText(row: BulkRow, aliases: string[]) {
  const value = getValue(row, aliases);
  return value === null || value === undefined ? "" : String(value).trim();
}

function hasAnyColumn(columns: string[], aliases: string[]) {
  const normalized = columns.map(normalizeHeader);
  return aliases.some((alias) => normalized.includes(normalizeHeader(alias)));
}

function detectBulkType(columns: string[], rows: BulkRow[]): BulkDetection {
  const hasLat = hasAnyColumn(columns, ["latitude", "lat"]);
  const hasLng = hasAnyColumn(columns, ["longitude", "lng", "lon", "long"]);
  const hasEast = hasAnyColumn(columns, ["easting", "east", "e", "x", "utm_easting"]);
  const hasNorth = hasAnyColumn(columns, ["northing", "north", "n", "y", "utm_northing"]);
  const hasLatDeg = hasAnyColumn(columns, ["lat_deg", "latdeg", "latdegree"]);
  const hasLatMin = hasAnyColumn(columns, ["lat_min", "latmin", "latminute"]);
  const hasLatSec = hasAnyColumn(columns, ["lat_sec", "latsec", "latsecond"]);
  const hasLngDeg = hasAnyColumn(columns, ["lng_deg", "lon_deg", "long_deg", "lngdeg"]);
  const hasLngMin = hasAnyColumn(columns, ["lng_min", "lon_min", "long_min", "lngmin"]);
  const hasLngSec = hasAnyColumn(columns, ["lng_sec", "lon_sec", "long_sec", "lngsec"]);

  if (hasEast && hasNorth) {
    return {
      type: "utm-to-dms",
      confidence: "high",
      reason: "Easting and Northing columns were detected.",
    };
  }

  if (hasLatDeg && hasLatMin && hasLatSec && hasLngDeg && hasLngMin && hasLngSec) {
    return {
      type: "dms-to-utm",
      confidence: "high",
      reason: "DMS degree, minute and second columns were detected.",
    };
  }

  if (hasLat && hasLng) {
    return {
      type: "decimal-to-dms-utm",
      confidence: "high",
      reason: "Latitude and Longitude columns were detected.",
    };
  }

  const sample = rows.slice(0, 20);
  const numericPairs = sample.filter((row) => {
    const values = Object.values(row)
      .map(parseNumber)
      .filter((value): value is number => value !== null);
    return values.length >= 2;
  }).length;

  return {
    type: null,
    confidence: numericPairs > 0 ? "low" : "low",
    reason:
      "YAJU could not identify the coordinate format confidently. Select the bulk conversion type manually.",
  };
}

function findHeaderRowIndex(rows: unknown[][]) {
  let bestIndex = 0;
  let bestScore = -1;

  rows.forEach((row, index) => {
    const normalizedCells = row.map((cell) => normalizeHeader(String(cell || "")));
    const score = normalizedCells.filter((cell) => knownColumnAliases.includes(cell)).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function makeUniqueHeaders(headers: string[]) {
  const used = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header.trim() || `column_${index + 1}`;
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

async function readRowsFromFile(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) return { rows: [] as BulkRow[], columns: [] as string[] };

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  if (rawRows.length === 0) return { rows: [] as BulkRow[], columns: [] as string[] };

  const headerIndex = findHeaderRowIndex(rawRows);
  const columns = makeUniqueHeaders(
    rawRows[headerIndex].map((header, index) =>
      String(header || `column_${index + 1}`).trim()
    )
  );

  const rows = rawRows
    .slice(headerIndex + 1)
    .filter((row) =>
      row.some(
        (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""
      )
    )
    .map((row) => {
      const record: BulkRow = {};
      columns.forEach((header, index) => {
        record[header] = row[index] as string | number | null | undefined;
      });
      return record;
    });

  return { rows, columns };
}

function convertBulkRow(
  row: BulkRow,
  index: number,
  bulkType: BulkType,
  crs: CrsType,
  customProj4: string,
  defaultZone: string,
  defaultHemisphere: string,
  eastingOffset: string,
  northingOffset: string,
  autoDetectUtm: boolean
): ConvertedRow {
  const input = `Row ${index + 2}`;
  const id = getText(row, [
    "id",
    "name",
    "point",
    "point_id",
    "pointid",
    "station",
    "well",
    "well_id",
    "wellid",
  ]);
  const elevation = getText(row, ["elevation", "height", "z", "rl"]);
  const fallbackZone = normalizeZone(defaultZone, 37);
  const fallbackHemisphere = normalizeHemisphere(defaultHemisphere, "S");
  const base = { original: row, input, id, elevation };

  try {
    if (bulkType === "utm-to-dms") {
      const rawEasting = getNumber(row, [
        "easting",
        "east",
        "east_x",
        "eastx",
        "e",
        "x",
        "utm_easting",
        "utmeasting",
      ]);
      const rawNorthing = getNumber(row, [
        "northing",
        "north",
        "north_y",
        "northy",
        "n",
        "y",
        "utm_northing",
        "utmnorthing",
      ]);
      const rowZone = getNumber(row, ["zone", "utm_zone", "utmzone"]);
      const band = getText(row, ["band", "band_lat", "bandlat", "utm_band", "utmband"]);
      const rowHemisphere =
        getText(row, ["hemisphere", "hemi"]) ||
        hemisphereFromBand(band) ||
        fallbackHemisphere;
      const resolvedZone = normalizeZone(rowZone, fallbackZone);
      const resolvedHemisphere = normalizeHemisphere(rowHemisphere, fallbackHemisphere);

      if (rawEasting === null || rawNorthing === null) {
        return {
          ...base,
          status: "Error",
          zone: String(resolvedZone),
          band,
          hemisphere: resolvedHemisphere,
          error: "Missing Easting or Northing value.",
        };
      }

      const correctedEasting = rawEasting - (parseNumber(eastingOffset) ?? 0);
      const correctedNorthing = rawNorthing - (parseNumber(northingOffset) ?? 0);
      const utmError = validateUtmInput(
        correctedEasting,
        correctedNorthing,
        resolvedZone,
        crs === "custom"
      );

      if (utmError) {
        return {
          ...base,
          status: "Error",
          rawEasting: formatMeter(rawEasting),
          rawNorthing: formatMeter(rawNorthing),
          correctedEasting: formatMeter(correctedEasting),
          correctedNorthing: formatMeter(correctedNorthing),
          zone: String(resolvedZone),
          band,
          hemisphere: resolvedHemisphere,
          error: utmError,
        };
      }

      const point = utmToDecimal(
        correctedEasting,
        correctedNorthing,
        crs,
        resolvedZone,
        resolvedHemisphere,
        customProj4
      );
      const coordinateError = validateDecimalCoordinates(point.latitude, point.longitude);

      if (coordinateError) {
        return { ...base, status: "Error", error: coordinateError };
      }

      return {
        ...base,
        status: "OK",
        quality: "Valid",
        latitude: formatDecimal(point.latitude),
        longitude: formatDecimal(point.longitude),
        dmsLatitude: toDms(point.latitude, "lat"),
        dmsLongitude: toDms(point.longitude, "lng"),
        rawEasting: formatMeter(rawEasting),
        rawNorthing: formatMeter(rawNorthing),
        correctedEasting: formatMeter(correctedEasting),
        correctedNorthing: formatMeter(correctedNorthing),
        zone: String(resolvedZone),
        band: band || getUtmBand(point.latitude),
        hemisphere: resolvedHemisphere,
      };
    }

    let latitude: number | null = null;
    let longitude: number | null = null;

    if (bulkType === "decimal-to-dms-utm") {
      latitude = getNumber(row, ["latitude", "lat"]);
      longitude = getNumber(row, ["longitude", "lng", "lon", "long"]);

      const rowLatDir = getText(row, ["lat_dir", "latdir", "lat_direction", "latdirection"]);
      const rowLngDir = getText(row, [
        "lng_dir",
        "lngdir",
        "lon_dir",
        "londir",
        "long_dir",
        "longdir",
        "lng_direction",
      ]);

      if (latitude !== null && rowLatDir) {
        latitude = applyDecimalDirection(
          latitude,
          normalizeHemisphere(rowLatDir, "S") as LatitudeDirection
        );
      }
      if (longitude !== null && rowLngDir) {
        longitude = applyDecimalDirection(longitude, normalizeLongitudeDirection(rowLngDir));
      }
    }

    if (bulkType === "dms-to-utm") {
      const latDeg = getNumber(row, ["lat_deg", "latdeg", "lat_degree", "latdegree"]);
      const latMin = getNumber(row, ["lat_min", "latmin", "lat_minute", "latminute"]);
      const latSec = getNumber(row, ["lat_sec", "latsec", "lat_second", "latsecond"]);
      const latDir = getText(row, ["lat_dir", "latdir", "lat_direction", "latdirection"]);
      const lngDeg = getNumber(row, ["lng_deg", "lngdeg", "lon_deg", "londeg", "long_deg", "longdeg"]);
      const lngMin = getNumber(row, ["lng_min", "lngmin", "lon_min", "lonmin", "long_min", "longmin"]);
      const lngSec = getNumber(row, ["lng_sec", "lngsec", "lon_sec", "lonsec", "long_sec", "longsec"]);
      const lngDir = getText(row, ["lng_dir", "lngdir", "lon_dir", "londir", "long_dir", "longdir"]);

      if ([latDeg, latMin, latSec, lngDeg, lngMin, lngSec].some((value) => value === null)) {
        return { ...base, status: "Error", error: "Missing DMS latitude or longitude columns." };
      }

      const dmsError = validateDmsParts(latMin!, latSec!, lngMin!, lngSec!);
      if (dmsError) return { ...base, status: "Error", error: dmsError };

      latitude = dmsToDecimal(latDeg!, latMin!, latSec!, latDir || fallbackHemisphere);
      longitude = dmsToDecimal(lngDeg!, lngMin!, lngSec!, lngDir || "E");
    }

    if (latitude === null || longitude === null) {
      return { ...base, status: "Error", error: "Missing latitude or longitude columns." };
    }

    const coordinateError = validateDecimalCoordinates(latitude, longitude);
    if (coordinateError) {
      return {
        ...base,
        status: "Error",
        latitude: String(latitude),
        longitude: String(longitude),
        error: coordinateError,
      };
    }

    const rowZone = getNumber(row, ["zone", "utm_zone", "utmzone"]);
    const resolvedZone =
      rowZone !== null
        ? normalizeZone(rowZone, fallbackZone)
        : autoDetectUtm
          ? zoneFromLongitude(longitude)
          : fallbackZone;
    const resolvedHemisphere = latitude < 0 ? "S" : "N";
    const utm = decimalToUtm(
      latitude,
      longitude,
      crs,
      resolvedZone,
      resolvedHemisphere,
      customProj4
    );

    return {
      ...base,
      status: "OK",
      quality: "Valid",
      latitude: formatDecimal(latitude),
      longitude: formatDecimal(longitude),
      dmsLatitude: toDms(latitude, "lat"),
      dmsLongitude: toDms(longitude, "lng"),
      correctedEasting: formatMeter(utm.easting),
      correctedNorthing: formatMeter(utm.northing),
      zone: String(resolvedZone),
      band: getUtmBand(latitude),
      hemisphere: resolvedHemisphere,
    };
  } catch (error) {
    return {
      ...base,
      status: "Error",
      error: error instanceof Error ? error.message : "Unable to convert this row.",
    };
  }
}

function addDuplicateWarnings(rows: ConvertedRow[]) {
  const idCounts = new Map<string, number>();
  const coordinateCounts = new Map<string, number>();

  rows.forEach((row) => {
    const idKey = row.id?.trim().toLowerCase();
    if (idKey) idCounts.set(idKey, (idCounts.get(idKey) || 0) + 1);

    if (row.latitude && row.longitude && row.status !== "Error") {
      const coordinateKey = `${Number(row.latitude).toFixed(7)}|${Number(row.longitude).toFixed(7)}`;
      coordinateCounts.set(coordinateKey, (coordinateCounts.get(coordinateKey) || 0) + 1);
    }
  });

  return rows.map((row) => {
    if (row.status === "Error") return row;

    const warnings: string[] = [];
    const idKey = row.id?.trim().toLowerCase();
    if (idKey && (idCounts.get(idKey) || 0) > 1) warnings.push("Duplicate Point ID");

    if (row.latitude && row.longitude) {
      const coordinateKey = `${Number(row.latitude).toFixed(7)}|${Number(row.longitude).toFixed(7)}`;
      if ((coordinateCounts.get(coordinateKey) || 0) > 1) warnings.push("Duplicate coordinate");
    }

    if (warnings.length === 0) return row;

    return {
      ...row,
      status: "Warning" as const,
      quality: "Review",
      warning: warnings.join("; "),
    };
  });
}

function rowsToCsv(rows: ConvertedRow[], originalColumns: string[]) {
  const escapeCsv = (value: unknown) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const header = [
    ...originalColumns,
    ...convertedColumns.map((column) => column.label),
  ].join(",");

  const body = rows.map((row) =>
    [
      ...originalColumns.map((column) => escapeCsv(row.original[column])),
      ...convertedColumns.map((column) => escapeCsv(row[column.key])),
    ].join(",")
  );

  return [header, ...body].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function MapPreview({ points }: { points: PreviewPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      if (!containerRef.current || mapRef.current) return;

      try {
        const L = await import("leaflet");
        if (cancelled || !containerRef.current) return;

        leafletRef.current = L;
        const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
          [-6.7924, 39.2083],
          6
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        markerLayerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setIsMapReady(true);
        setMapError(null);
        window.setTimeout(() => map.invalidateSize(), 100);
      } catch {
        setMapError("Map preview could not be loaded.");
      }
    }

    void loadMap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!L || !map || !markerLayer || !isMapReady) return;

    markerLayer.clearLayers();
    const validPoints = points.filter(
      (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    );

    validPoints.forEach((point) => {
      const popupLines = [
        `<strong>${escapeHtml(point.label)}</strong>`,
        `Lat: ${formatDecimal(point.latitude)}`,
        `Lng: ${formatDecimal(point.longitude)}`,
        ...(point.details || []).map(escapeHtml),
      ];

      L.circleMarker([point.latitude, point.longitude], {
        radius: 8,
        color: "#1d4ed8",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 0.85,
      })
        .bindPopup(popupLines.join("<br />"))
        .addTo(markerLayer);
    });

    if (validPoints.length === 1) {
      map.setView([validPoints[0].latitude, validPoints[0].longitude], 14);
    } else if (validPoints.length > 1) {
      map.fitBounds(
        L.latLngBounds(validPoints.map((point) => [point.latitude, point.longitude])),
        { padding: [30, 30], maxZoom: 15 }
      );
    } else {
      map.setView([-6.7924, 39.2083], 6);
    }

    window.setTimeout(() => map.invalidateSize(), 80);
  }, [points, isMapReady]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Result Preview Map</h2>
          <p className="text-sm text-gray-600">OpenStreetMap preview for valid converted coordinates.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {points.length} {points.length === 1 ? "point" : "points"}
        </span>
      </div>
      <div className="relative h-[380px] w-full overflow-hidden bg-slate-100">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      </div>
      {points.length === 0 && (
        <p className="border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
          Enter or upload valid coordinates to show them on the map.
        </p>
      )}
      {mapError && (
        <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{mapError}</p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export default function CoordinatesConverterPage() {
  const [mode, setMode] = useState<Mode>("dd-to-dms");
  const [bulkType, setBulkType] = useState<BulkType>("utm-to-dms");
  const [inputCrs, setInputCrs] = useState<CrsType>("wgs84-utm");
  const [customProj4, setCustomProj4] = useState(DEFAULT_CUSTOM_PROJ4);
  const [defaultZone, setDefaultZone] = useState("37");
  const [hemisphere, setHemisphere] = useState("S");
  const [autoDetectUtm, setAutoDetectUtm] = useState(true);
  const [eastingOffset, setEastingOffset] = useState("0");
  const [northingOffset, setNorthingOffset] = useState("0");

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [latDirection, setLatDirection] = useState<LatitudeDirection>("S");
  const [lngDirection, setLngDirection] = useState<LongitudeDirection>("E");
  const [latDeg, setLatDeg] = useState("");
  const [latMin, setLatMin] = useState("");
  const [latSec, setLatSec] = useState("");
  const [latDir, setLatDir] = useState("S");
  const [lngDeg, setLngDeg] = useState("");
  const [lngMin, setLngMin] = useState("");
  const [lngSec, setLngSec] = useState("");
  const [lngDir, setLngDir] = useState("E");
  const [utmEasting, setUtmEasting] = useState("");
  const [utmNorthing, setUtmNorthing] = useState("");

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkOriginalColumns, setBulkOriginalColumns] = useState<string[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkDetection, setBulkDetection] = useState<BulkDetection | null>(null);
  const [isBulkChecking, setIsBulkChecking] = useState(false);

  const normalizedZone = normalizeZone(defaultZone, 37);
  const normalizedHemisphere = normalizeHemisphere(hemisphere, "S");

  const convertedRows = useMemo(() => {
    const converted = bulkRows.map((row, index) =>
      convertBulkRow(
        row,
        index,
        bulkType,
        inputCrs,
        customProj4,
        defaultZone,
        hemisphere,
        eastingOffset,
        northingOffset,
        autoDetectUtm
      )
    );
    return addDuplicateWarnings(converted);
  }, [
    bulkRows,
    bulkType,
    inputCrs,
    customProj4,
    defaultZone,
    hemisphere,
    eastingOffset,
    northingOffset,
    autoDetectUtm,
  ]);

  const qualitySummary = useMemo(() => {
    const valid = convertedRows.filter((row) => row.status === "OK").length;
    const warnings = convertedRows.filter((row) => row.status === "Warning").length;
    const errors = convertedRows.filter((row) => row.status === "Error").length;
    return { valid, warnings, errors, total: convertedRows.length };
  }, [convertedRows]);

  const previewPoints = useMemo(() => {
    return convertedRows
      .filter((row) => row.status !== "Error")
      .map((row) => {
        const latitude = parseNumber(row.latitude);
        const longitude = parseNumber(row.longitude);
        if (latitude === null || longitude === null) return null;

        return {
          latitude,
          longitude,
          label: row.id || row.input,
          details: [
            row.zone ? `Zone: ${row.zone}` : "",
            row.hemisphere ? `Hemisphere: ${row.hemisphere}` : "",
            row.warning ? `Warning: ${row.warning}` : "",
          ].filter(Boolean),
        };
      })
      .filter(Boolean) as PreviewPoint[];
  }, [convertedRows]);

  const singleResult = useMemo(() => {
    try {
      if (mode === "dd-to-dms" || mode === "dd-to-utm") {
        const rawLat = parseNumber(lat);
        const rawLng = parseNumber(lng);
        if (rawLat === null || rawLng === null) return "";

        const latitude = applyDecimalDirection(rawLat, latDirection);
        const longitude = applyDecimalDirection(rawLng, lngDirection);
        const error = validateDecimalCoordinates(latitude, longitude);
        if (error) return error;

        if (mode === "dd-to-dms") {
          return `Latitude: ${formatDecimal(latitude)}\nLongitude: ${formatDecimal(longitude)}\nDMS Latitude: ${toDms(latitude, "lat")}\nDMS Longitude: ${toDms(longitude, "lng")}`;
        }

        const zone = autoDetectUtm ? zoneFromLongitude(longitude) : normalizedZone;
        const hemi = autoDetectUtm ? (latitude < 0 ? "S" : "N") : normalizedHemisphere;
        const utm = decimalToUtm(latitude, longitude, inputCrs, zone, hemi, customProj4);
        return `Latitude: ${formatDecimal(latitude)}\nLongitude: ${formatDecimal(longitude)}\nEasting: ${formatMeter(utm.easting)}\nNorthing: ${formatMeter(utm.northing)}\nZone: ${zone}\nBand: ${getUtmBand(latitude)}\nHemisphere: ${hemi}`;
      }

      if (mode === "dms-to-dd" || mode === "dms-to-utm") {
        const values = [latDeg, latMin, latSec, lngDeg, lngMin, lngSec].map(parseNumber);
        if (values.some((value) => value === null)) return "";
        const [ld, lm, ls, gd, gm, gs] = values as number[];
        const dmsError = validateDmsParts(lm, ls, gm, gs);
        if (dmsError) return dmsError;

        const latitude = dmsToDecimal(ld, lm, ls, latDir);
        const longitude = dmsToDecimal(gd, gm, gs, lngDir);
        const error = validateDecimalCoordinates(latitude, longitude);
        if (error) return error;

        if (mode === "dms-to-dd") {
          return `Latitude: ${formatDecimal(latitude)}\nLongitude: ${formatDecimal(longitude)}`;
        }

        const zone = autoDetectUtm ? zoneFromLongitude(longitude) : normalizedZone;
        const hemi = autoDetectUtm ? (latitude < 0 ? "S" : "N") : normalizedHemisphere;
        const utm = decimalToUtm(latitude, longitude, inputCrs, zone, hemi, customProj4);
        return `Latitude: ${formatDecimal(latitude)}\nLongitude: ${formatDecimal(longitude)}\nEasting: ${formatMeter(utm.easting)}\nNorthing: ${formatMeter(utm.northing)}\nZone: ${zone}\nBand: ${getUtmBand(latitude)}\nHemisphere: ${hemi}`;
      }

      if (mode === "utm-to-dms") {
        const easting = parseNumber(utmEasting);
        const northing = parseNumber(utmNorthing);
        if (easting === null || northing === null) return "";

        const correctedEasting = easting - (parseNumber(eastingOffset) ?? 0);
        const correctedNorthing = northing - (parseNumber(northingOffset) ?? 0);
        const utmError = validateUtmInput(
          correctedEasting,
          correctedNorthing,
          normalizedZone,
          inputCrs === "custom"
        );
        if (utmError) return utmError;

        const point = utmToDecimal(
          correctedEasting,
          correctedNorthing,
          inputCrs,
          normalizedZone,
          normalizedHemisphere,
          customProj4
        );
        const error = validateDecimalCoordinates(point.latitude, point.longitude);
        if (error) return error;

        return `Latitude: ${formatDecimal(point.latitude)}\nLongitude: ${formatDecimal(point.longitude)}\nDMS Latitude: ${toDms(point.latitude, "lat")}\nDMS Longitude: ${toDms(point.longitude, "lng")}\nZone: ${normalizedZone}\nBand: ${getUtmBand(point.latitude)}\nHemisphere: ${normalizedHemisphere}`;
      }

      return "";
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to convert coordinates.";
    }
  }, [
    mode,
    lat,
    lng,
    latDirection,
    lngDirection,
    latDeg,
    latMin,
    latSec,
    latDir,
    lngDeg,
    lngMin,
    lngSec,
    lngDir,
    utmEasting,
    utmNorthing,
    eastingOffset,
    northingOffset,
    normalizedZone,
    normalizedHemisphere,
    inputCrs,
    customProj4,
    autoDetectUtm,
  ]);

  async function handleBulkFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setBulkError(null);
    setBulkDetection(null);
    if (!file) return;

    try {
      setIsBulkChecking(true);
      const { rows, columns } = await readRowsFromFile(file);

      if (rows.length === 0) {
        setBulkRows([]);
        setBulkOriginalColumns([]);
        setBulkFileName("");
        setBulkError("No coordinate rows were found in this file.");
        event.target.value = "";
        return;
      }

      const detection = detectBulkType(columns, rows);
      setBulkDetection(detection);
      if (detection.type) setBulkType(detection.type);

      const usage = await checkCoordinateBulkUsage();
      if (!usage.allowed) {
        setBulkRows([]);
        setBulkOriginalColumns([]);
        setBulkFileName("");
        setBulkError(usage.message);
        event.target.value = "";
        return;
      }

      setBulkRows(rows);
      setBulkOriginalColumns(columns);
      setBulkFileName(file.name);

      await saveConversionHistory({
        tool: "coordinates-bulk",
        originalFileName: file.name,
        outputFileName: `${file.name.replace(/\.[^.]+$/, "") || "coordinates"}-converted.csv`,
      });
    } catch (error) {
      setBulkRows([]);
      setBulkOriginalColumns([]);
      setBulkFileName("");
      setBulkError(
        error instanceof Error ? error.message : "Unable to read this CSV or Excel file."
      );
      event.target.value = "";
    } finally {
      setIsBulkChecking(false);
    }
  }

  function downloadCsv() {
    if (convertedRows.length === 0) return;
    const csv = rowsToCsv(convertedRows, bulkOriginalColumns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const baseName = bulkFileName.replace(/\.[^.]+$/, "") || "coordinates";
    link.href = url;
    link.download = `${baseName}-validated-converted.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const showProjectionControls = mode !== "dd-to-dms" && mode !== "dms-to-dd";
  const usesUtmInput = mode === "utm-to-dms" || (mode === "bulk-file" && bulkType === "utm-to-dms");

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/tools" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to Tools
        </Link>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">GIS Utility</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Coordinates Converter</h1>
          <p className="mt-3 max-w-3xl text-gray-600">
            Convert Decimal Degrees, DMS and UTM coordinates. Bulk uploads now include automatic format detection, row validation, duplicate checks, map preview and validation-aware CSV export.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {modes.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMode(item.key)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  mode === item.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === "bulk-file" && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Bulk conversion type</span>
                <select
                  value={bulkType}
                  onChange={(event) => setBulkType(event.target.value as BulkType)}
                  className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3"
                >
                  {bulkTypes.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold">Smart detection</p>
                <p className="mt-1">
                  {bulkDetection
                    ? `${bulkDetection.reason} Confidence: ${bulkDetection.confidence}.`
                    : "Upload a CSV/Excel file and YAJU will try to detect DD, DMS or UTM automatically."}
                </p>
              </div>
            </div>
          )}

          {showProjectionControls && (
            <div className="mt-6 grid gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Source CRS / Projection</span>
                <select
                  value={inputCrs}
                  onChange={(event) => setInputCrs(event.target.value as CrsType)}
                  className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3"
                >
                  {crsOptions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {usesUtmInput && (
                <>
                  <Field label="UTM Zone" value={defaultZone} setValue={setDefaultZone} placeholder="37" />
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Hemisphere</span>
                    <select
                      value={hemisphere}
                      onChange={(event) => setHemisphere(event.target.value)}
                      className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3"
                    >
                      <option value="S">S</option>
                      <option value="N">N</option>
                    </select>
                  </label>
                </>
              )}

              {!usesUtmInput && (
                <label className="flex items-start gap-3 rounded-md bg-gray-50 p-4 text-sm text-gray-700 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={autoDetectUtm}
                    onChange={(event) => setAutoDetectUtm(event.target.checked)}
                    className="mt-1"
                  />
                  <span>Auto-detect UTM zone and hemisphere from geographic coordinates.</span>
                </label>
              )}

              {inputCrs === "custom" && (
                <div className="md:col-span-2">
                  <Field
                    label="Custom Proj4"
                    value={customProj4}
                    setValue={setCustomProj4}
                    placeholder={DEFAULT_CUSTOM_PROJ4}
                  />
                </div>
              )}

              {(mode === "utm-to-dms" || mode === "bulk-file") && (
                <>
                  <Field label="Easting Offset" value={eastingOffset} setValue={setEastingOffset} placeholder="0" />
                  <Field label="Northing Offset" value={northingOffset} setValue={setNorthingOffset} placeholder="0" />
                </>
              )}
            </div>
          )}

          {(mode === "dd-to-dms" || mode === "dd-to-utm") && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
                <Field label="Latitude" value={lat} setValue={setLat} placeholder="6.7924" />
                <select
                  value={latDirection}
                  onChange={(event) => setLatDirection(event.target.value as LatitudeDirection)}
                  className="mt-7 rounded-md border border-gray-300 px-3 py-3"
                >
                  <option value="S">S</option>
                  <option value="N">N</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
                <Field label="Longitude" value={lng} setValue={setLng} placeholder="39.2083" />
                <select
                  value={lngDirection}
                  onChange={(event) => setLngDirection(event.target.value as LongitudeDirection)}
                  className="mt-7 rounded-md border border-gray-300 px-3 py-3"
                >
                  <option value="E">E</option>
                  <option value="W">W</option>
                </select>
              </div>
            </div>
          )}

          {(mode === "dms-to-dd" || mode === "dms-to-utm") && (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Field label="Lat Degrees" value={latDeg} setValue={setLatDeg} />
              <Field label="Lat Minutes" value={latMin} setValue={setLatMin} />
              <Field label="Lat Seconds" value={latSec} setValue={setLatSec} />
              <select value={latDir} onChange={(event) => setLatDir(event.target.value)} className="mt-7 rounded-md border border-gray-300 px-3 py-3">
                <option>N</option><option>S</option>
              </select>
              <Field label="Lng Degrees" value={lngDeg} setValue={setLngDeg} />
              <Field label="Lng Minutes" value={lngMin} setValue={setLngMin} />
              <Field label="Lng Seconds" value={lngSec} setValue={setLngSec} />
              <select value={lngDir} onChange={(event) => setLngDir(event.target.value)} className="mt-7 rounded-md border border-gray-300 px-3 py-3">
                <option>E</option><option>W</option>
              </select>
            </div>
          )}

          {mode === "utm-to-dms" && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Easting" value={utmEasting} setValue={setUtmEasting} placeholder="232555.8" />
              <Field label="Northing" value={utmNorthing} setValue={setUtmNorthing} placeholder="9379161.8" />
            </div>
          )}

          {mode === "bulk-file" && (
            <div className="mt-6">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Upload CSV or Excel file</span>
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleBulkFile}
                  disabled={isBulkChecking}
                  className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              </label>
              {bulkError && (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{bulkError}</p>
              )}
            </div>
          )}

          {mode === "bulk-file" ? (
            <MapPreview points={previewPoints} />
          ) : (
            <div className="mt-6 rounded-md bg-gray-900 p-4 text-white">
              <p className="text-sm font-semibold text-gray-300">Result</p>
              <pre className="mt-2 whitespace-pre-wrap text-lg">{singleResult || "Enter coordinates to see the result."}</pre>
            </div>
          )}

          {mode === "bulk-file" && (
            <div className="mt-8">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase text-gray-500">Total</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{qualitySummary.total}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold uppercase text-green-700">Valid</p>
                  <p className="mt-1 text-2xl font-bold text-green-900">{qualitySummary.valid}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase text-amber-700">Warnings</p>
                  <p className="mt-1 text-2xl font-bold text-amber-900">{qualitySummary.warnings}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase text-red-700">Errors</p>
                  <p className="mt-1 text-2xl font-bold text-red-900">{qualitySummary.errors}</p>
                </div>
              </div>

              {qualitySummary.warnings > 0 && (
                <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  YAJU found duplicate IDs or duplicate coordinates. Review warning rows before using the exported dataset.
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Validated Results</h2>
                  {bulkFileName && <p className="mt-1 text-sm text-gray-600">Source file: {bulkFileName}</p>}
                </div>
                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={convertedRows.length === 0}
                  className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  Download Validated CSV
                </button>
              </div>

              <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                {convertedRows.length === 0 ? (
                  <p className="p-5 text-sm text-gray-600">Upload a CSV or Excel file to see converted rows here.</p>
                ) : (
                  <table className="min-w-[1900px] divide-y divide-gray-200 text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        {bulkOriginalColumns.map((column) => (
                          <th key={`original-${column}`} className="px-4 py-3 font-semibold">{column}</th>
                        ))}
                        {convertedColumns.map((column) => (
                          <th key={`converted-${String(column.key)}`} className="px-4 py-3 font-semibold">{column.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                      {convertedRows.map((row, index) => (
                        <tr
                          key={`${row.input}-${index}`}
                          className={
                            row.status === "Error"
                              ? "bg-red-50/60"
                              : row.status === "Warning"
                                ? "bg-amber-50/70"
                                : ""
                          }
                        >
                          {bulkOriginalColumns.map((column) => (
                            <td key={`${row.input}-${column}`} className="px-4 py-3">{String(row.original[column] ?? "")}</td>
                          ))}
                          {convertedColumns.map((column) => (
                            <td key={`${row.input}-${String(column.key)}`} className="px-4 py-3">{String(row[column.key] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          <div className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-5 text-center">
            <h2 className="text-xl font-bold text-gray-900">Support YAJU</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Help us keep improving practical GIS, document and productivity tools.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
