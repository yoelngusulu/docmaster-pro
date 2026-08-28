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

type Mode =
  | "dd-to-dms"
  | "dms-to-dd"
  | "dms-to-utm"
  | "utm-to-dms"
  | "bulk-file";

type BulkType =
  | "decimal-to-dms-utm"
  | "dms-to-utm"
  | "utm-to-dms";

type CrsType =
  | "wgs84-utm"
  | "arc1960-utm"
  | "custom";

type UsageCheckResult = {
  allowed: boolean;
  message: string | null;
};

type BulkRow = Record<
  string,
  string | number | null | undefined
>;

type ConvertedRow = {
  original: BulkRow;
  input: string;
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
  status?: string;
  error?: string;
};

type PreviewPoint = {
  label: string;
  latitude: number;
  longitude: number;
};

type LeafletModule = typeof import("leaflet");
type LeafletMap = ReturnType<LeafletModule["map"]>;
type LeafletLayerGroup = ReturnType<LeafletModule["featureGroup"]>;

const modes: {
  key: Mode;
  label: string;
}[] = [
  { key: "dd-to-dms", label: "Decimal to DMS" },
  { key: "dms-to-dd", label: "DMS to Decimal" },
  { key: "dms-to-utm", label: "DMS to UTM" },
  { key: "utm-to-dms", label: "UTM to DMS" },
  { key: "bulk-file", label: "CSV / Excel Bulk" },
];

const bulkTypes: {
  key: BulkType;
  label: string;
}[] = [
  {
    key: "decimal-to-dms-utm",
    label: "Decimal columns to DMS and UTM",
  },
  {
    key: "dms-to-utm",
    label: "DMS columns to Decimal and UTM",
  },
  {
    key: "utm-to-dms",
    label: "UTM columns to Decimal and DMS",
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

const WGS84_GEOGRAPHIC =
  "+proj=longlat +datum=WGS84 +no_defs";

const ARC1960_GEOGRAPHIC =
  "+proj=longlat +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +no_defs";

const DEFAULT_CUSTOM_PROJ4 =
  "+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs";

const CONVERTED_COLUMNS: {
  key: keyof Omit<ConvertedRow, "original">;
  label: string;
}[] = [
  { key: "input", label: "Result Row" },
  { key: "id", label: "Detected ID" },
  { key: "latitude", label: "Converted Latitude" },
  { key: "longitude", label: "Converted Longitude" },
  { key: "dmsLatitude", label: "DMS Latitude" },
  { key: "dmsLongitude", label: "DMS Longitude" },
  { key: "rawEasting", label: "Raw Easting" },
  { key: "rawNorthing", label: "Raw Northing" },
  { key: "correctedEasting", label: "Corrected Easting" },
  { key: "correctedNorthing", label: "Corrected Northing" },
  { key: "zone", label: "UTM Zone" },
  { key: "band", label: "UTM Band" },
  { key: "hemisphere", label: "Hemisphere" },
  { key: "elevation", label: "Elevation" },
  { key: "status", label: "Status" },
  { key: "error", label: "Error" },
];

async function checkCoordinateBulkUsage(): Promise<UsageCheckResult> {
  const response = await fetch(
    "/api/tools/coordinates-bulk-usage",
    { method: "POST" }
  );

  if (response.ok) {
    return {
      allowed: true,
      message: null,
    };
  }

  const data = await response
    .json()
    .catch(() => null);

  return {
    allowed: false,
    message:
      data?.message ||
      "You have reached your CSV/Excel bulk conversion limit for today.",
  };
}

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  let text = String(value).trim();

  if (!text) {
    return null;
  }

  text = text.replace(/\s/g, "");

  if (
    text.includes(",") &&
    text.includes(".")
  ) {
    text = text.replace(/,/g, "");
  } else if (
    (text.match(/,/g) || []).length === 1
  ) {
    text = text.replace(",", ".");
  } else if (
    (text.match(/,/g) || []).length > 1
  ) {
    text = text.replace(/,/g, "");
  }

  const number = Number(text);

  return Number.isFinite(number)
    ? number
    : null;
}

function formatDecimal(value: number) {
  return value.toFixed(8);
}

function formatMeter(value: number) {
  return value.toFixed(3);
}

function toDms(
  value: number,
  type: "lat" | "lng"
) {
  const direction =
    type === "lat"
      ? value >= 0
        ? "N"
        : "S"
      : value >= 0
        ? "E"
        : "W";

  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat =
    (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds =
    (minutesFloat - minutes) * 60;

  return `${degrees}° ${minutes}' ${seconds.toFixed(
    4
  )}" ${direction}`;
}

function dmsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: string
) {
  const decimal =
    Math.abs(degrees) +
    minutes / 60 +
    seconds / 3600;

  return ["S", "W"].includes(
    direction.toUpperCase()
  )
    ? -decimal
    : decimal;
}

function getUtmBand(latitude: number) {
  const bands = "CDEFGHJKLMNPQRSTUVWX";

  if (latitude <= -80) {
    return "C";
  }

  if (latitude >= 84) {
    return "X";
  }

  const index = Math.floor(
    (latitude + 80) / 8
  );

  return bands[
    Math.min(
      Math.max(index, 0),
      bands.length - 1
    )
  ];
}

function zoneFromLongitude(longitude: number) {
  return Math.min(
    Math.max(
      Math.floor((longitude + 180) / 6) + 1,
      1
    ),
    60
  );
}

function normalizeZone(
  value: unknown,
  fallback: number
) {
  const parsed = parseNumber(value);
  const fallbackZone =
    fallback >= 1 && fallback <= 60
      ? Math.round(fallback)
      : 37;

  if (
    parsed === null ||
    parsed < 1 ||
    parsed > 60
  ) {
    return fallbackZone;
  }

  return Math.round(parsed);
}

function normalizeHemisphere(
  value: unknown,
  fallback = "S"
) {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  if (text.startsWith("N")) {
    return "N";
  }

  if (text.startsWith("S")) {
    return "S";
  }

  return fallback.toUpperCase() === "N"
    ? "N"
    : "S";
}

function hemisphereFromBand(value: unknown) {
  const band = String(value || "")
    .trim()
    .toUpperCase();

  if (!band) {
    return null;
  }

  return band <= "M" ? "S" : "N";
}

function getGeographicProjection(crs: CrsType) {
  return crs === "arc1960-utm"
    ? ARC1960_GEOGRAPHIC
    : WGS84_GEOGRAPHIC;
}

function getUtmProjection(
  crs: CrsType,
  zone: number,
  hemisphere: string,
  customProj4: string
) {
  if (crs === "custom") {
    return customProj4.trim();
  }

  const south =
    hemisphere.toUpperCase() === "S"
      ? " +south"
      : "";

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
  const sourceProjection =
    getGeographicProjection(crs);
  const targetProjection = getUtmProjection(
    crs,
    zone,
    hemisphere,
    customProj4
  );

  const result = proj4(
    sourceProjection,
    targetProjection,
    [longitude, latitude]
  ) as [number, number];

  return {
    easting: result[0],
    northing: result[1],
  };
}

function utmToDecimal(
  easting: number,
  northing: number,
  crs: CrsType,
  zone: number,
  hemisphere: string,
  customProj4: string
) {
  const sourceProjection = getUtmProjection(
    crs,
    zone,
    hemisphere,
    customProj4
  );

  const result = proj4(
    sourceProjection,
    WGS84_GEOGRAPHIC,
    [easting, northing]
  ) as [number, number];

  return {
    longitude: result[0],
    latitude: result[1],
  };
}

function validateDecimalCoordinates(
  latitude: number,
  longitude: number
) {
  if (
    latitude < -90 ||
    latitude > 90
  ) {
    return "Latitude must be between -90 and 90.";
  }

  if (
    longitude < -180 ||
    longitude > 180
  ) {
    return "Longitude must be between -180 and 180.";
  }

  return null;
}

function validateDmsParts(
  latD: number,
  latM: number,
  latS: number,
  lngD: number,
  lngM: number,
  lngS: number
) {
  if (
    Math.abs(latD) > 90 ||
    Math.abs(lngD) > 180
  ) {
    return "DMS degrees are outside the valid latitude or longitude range.";
  }

  if (
    latM < 0 ||
    latM >= 60 ||
    latS < 0 ||
    latS >= 60 ||
    lngM < 0 ||
    lngM >= 60 ||
    lngS < 0 ||
    lngS >= 60
  ) {
    return "Minutes and seconds must be between 0 and 59.";
  }

  return null;
}

function validateUtmInput(
  easting: number,
  northing: number,
  zone: number,
  crs: CrsType
) {
  if (
    zone < 1 ||
    zone > 60
  ) {
    return "UTM zone must be between 1 and 60.";
  }

  if (
    easting <= 0 ||
    northing < 0
  ) {
    return "Easting and northing must be positive numbers.";
  }

  if (
    crs !== "custom" &&
    (easting < 100000 || easting > 900000)
  ) {
    return "Corrected easting is outside the normal UTM range. Check the source CRS or use Easting Offset.";
  }

  if (
    crs !== "custom" &&
    northing > 10000000
  ) {
    return "Corrected northing is outside the normal UTM range. Check the source CRS or use Northing Offset.";
  }

  return null;
}

function normalizeHeader(header: string) {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getValue(
  row: BulkRow,
  aliases: string[]
) {
  const normalizedAliases = aliases.map(
    normalizeHeader
  );

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);

    if (
      normalizedAliases.includes(normalizedKey) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return null;
}

function getNumber(
  row: BulkRow,
  aliases: string[]
) {
  return parseNumber(getValue(row, aliases));
}

function getText(
  row: BulkRow,
  aliases: string[]
) {
  const value = getValue(row, aliases);

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

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
  "east",
  "eastx",
  "x",
  "northing",
  "north",
  "northy",
  "y",
  "zone",
  "utmzone",
  "hemisphere",
  "hemi",
  "band",
  "elevation",
  "height",
  "z",
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
  "lngdegree",
  "lngdegrees",
  "londeg",
  "longdeg",
  "lngmin",
  "lngminute",
  "lngminutes",
  "lonmin",
  "longmin",
  "lngsec",
  "lngsecond",
  "lngseconds",
  "lonsec",
  "longsec",
  "lngdir",
  "londir",
  "longdir",
  "lngdirection",
];

function findHeaderRowIndex(
  rows: unknown[][]
) {
  let bestIndex = 0;
  let bestScore = -1;

  rows.forEach((row, index) => {
    const normalizedCells = row.map((cell) =>
      normalizeHeader(String(cell || ""))
    );

    const score = normalizedCells.filter(
      (cell) =>
        knownColumnAliases.includes(cell)
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

async function readRowsFromFile(file: File) {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return [];
  }

  const worksheet =
    workbook.Sheets[sheetName];

  const rawRows =
    XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      blankrows: false,
    }) as unknown[][];

  if (rawRows.length === 0) {
    return [];
  }

  const headerIndex =
    findHeaderRowIndex(rawRows);

  const headers = rawRows[headerIndex].map(
    (header, index) =>
      String(header || `column_${index + 1}`)
        .trim()
  );

  return rawRows
    .slice(headerIndex + 1)
    .filter((row) =>
      row.some(
        (cell) =>
          cell !== null &&
          cell !== undefined &&
          String(cell).trim() !== ""
      )
    )
    .map((row) => {
      const record: BulkRow = {};

      headers.forEach((header, index) => {
        record[
          header || `column_${index + 1}`
        ] = row[index] as
          | string
          | number
          | null
          | undefined;
      });

      return record;
    });
}

function getBulkOriginalColumns(rows: BulkRow[]) {
  const columns: string[] = [];
  const seen = new Set<string>();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    });
  });

  return columns;
}

function resolveOutputZone(
  longitude: number,
  rowZone: number | null,
  fallbackZone: number,
  autoDetectUtm: boolean
) {
  if (
    rowZone !== null &&
    rowZone >= 1 &&
    rowZone <= 60
  ) {
    return Math.round(rowZone);
  }

  if (autoDetectUtm) {
    return zoneFromLongitude(longitude);
  }

  return fallbackZone;
}

function getProjectionName(
  crs: CrsType,
  zone: number,
  hemi: string,
  customProj4: string
) {
  if (crs === "custom") {
    return customProj4.trim() || "Custom Proj4";
  }

  const datum =
    crs === "arc1960-utm"
      ? "Arc 1960"
      : "WGS84";

  return `${datum} / UTM Zone ${zone}${hemi}`;
}

function getGeographicName(crs: CrsType) {
  if (crs === "arc1960-utm") {
    return "Arc 1960 Geographic";
  }

  return "WGS84 Geographic";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ensureLeafletCss() {
  if (
    typeof document === "undefined" ||
    document.getElementById("leaflet-css")
  ) {
    return;
  }

  const link = document.createElement("link");
  link.id = "leaflet-css";
  link.rel = "stylesheet";
  link.href =
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  link.integrity =
    "sha256-p4NxAoJBhIINfQtsVEJCigE3fS9gP5HGp0y6Jt/03JQ=";
  link.crossOrigin = "";

  document.head.appendChild(link);
}

function MapPreview({
  points,
}: {
  points: PreviewPoint[];
}) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef =
    useRef<LeafletLayerGroup | null>(null);
  const [mapError, setMapError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      if (!containerRef.current) {
        return;
      }

      try {
        ensureLeafletCss();

        const L = await import("leaflet");

        if (
          cancelled ||
          !containerRef.current
        ) {
          return;
        }

        if (!mapRef.current) {
          mapRef.current = L.map(
            containerRef.current,
            {
              scrollWheelZoom: false,
            }
          ).setView([-6.7924, 39.2083], 6);

          L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 19,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }
          ).addTo(mapRef.current);
        }

        if (markerLayerRef.current) {
          markerLayerRef.current.remove();
        }

        const group = L.featureGroup();

        points.forEach((point) => {
          const marker = L.circleMarker(
            [point.latitude, point.longitude],
            {
              radius: 7,
              color: "#1d4ed8",
              weight: 2,
              fillColor: "#2563eb",
              fillOpacity: 0.8,
            }
          ).bindPopup(
            `<strong>${escapeHtml(
              point.label
            )}</strong><br/>Lat: ${formatDecimal(
              point.latitude
            )}<br/>Lng: ${formatDecimal(
              point.longitude
            )}`
          );

          group.addLayer(marker);
        });

        group.addTo(mapRef.current);
        markerLayerRef.current = group;

        if (points.length === 1) {
          mapRef.current.setView(
            [
              points[0].latitude,
              points[0].longitude,
            ],
            14
          );
        } else if (points.length > 1) {
          const bounds = group.getBounds();

          if (bounds.isValid()) {
            mapRef.current.fitBounds(
              bounds.pad(0.25)
            );
          }
        } else {
          mapRef.current.setView(
            [-6.7924, 39.2083],
            6
          );
        }

        window.setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 50);

        setMapError(null);
      } catch {
        setMapError(
          "Map preview could not be loaded."
        );
      }
    }

    void loadMap();

    return () => {
      cancelled = true;
    };
  }, [points]);

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
          <h2 className="text-base font-bold text-gray-900">
            Result Preview Map
          </h2>
          <p className="text-sm text-gray-600">
            OpenStreetMap preview for valid converted coordinates.
          </p>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {points.length} point{points.length === 1 ? "" : "s"}
        </span>
      </div>

      <div
        ref={containerRef}
        className="h-[320px] w-full bg-slate-100"
      />

      {points.length === 0 && (
        <p className="border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
          Enter or upload valid coordinates to show them on the map.
        </p>
      )}

      {mapError && (
        <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {mapError}
        </p>
      )}
    </div>
  );
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

  const elevation = getText(row, [
    "elevation",
    "height",
    "z",
    "rl",
  ]);

  const fallbackZone = normalizeZone(
    defaultZone,
    37
  );

  const fallbackHemisphere =
    normalizeHemisphere(
      defaultHemisphere,
      "S"
    );

  const baseRow: ConvertedRow = {
    original: row,
    input,
    id,
    elevation,
  };

  try {
    if (bulkType === "utm-to-dms") {
      const rawEasting = getNumber(row, [
        "easting",
        "east",
        "east_x",
        "eastx",
        "x",
        "utm_easting",
        "utmeasting",
      ]);

      const rawNorthing = getNumber(row, [
        "northing",
        "north",
        "north_y",
        "northy",
        "y",
        "utm_northing",
        "utmnorthing",
      ]);

      const rowZone = getNumber(row, [
        "zone",
        "utm_zone",
        "utmzone",
      ]);

      const band = getText(row, [
        "band",
        "utm_band",
        "utmband",
      ]);

      const rowHemisphere =
        getText(row, [
          "hemisphere",
          "hemi",
        ]) ||
        hemisphereFromBand(band) ||
        fallbackHemisphere;

      const resolvedZone = normalizeZone(
        rowZone,
        fallbackZone
      );

      const hemisphere =
        normalizeHemisphere(
          rowHemisphere,
          fallbackHemisphere
        );

      if (
        rawEasting === null ||
        rawNorthing === null
      ) {
        return {
          ...baseRow,
          zone: String(resolvedZone),
          band,
          hemisphere,
          status: "Error",
          error:
            "Missing easting or northing column.",
        };
      }

      const correctedEasting =
        rawEasting -
        (parseNumber(eastingOffset) ?? 0);

      const correctedNorthing =
        rawNorthing -
        (parseNumber(northingOffset) ?? 0);

      const validationError = validateUtmInput(
        correctedEasting,
        correctedNorthing,
        resolvedZone,
        crs
      );

      if (validationError) {
        return {
          ...baseRow,
          rawEasting: formatMeter(rawEasting),
          rawNorthing: formatMeter(rawNorthing),
          correctedEasting:
            formatMeter(correctedEasting),
          correctedNorthing:
            formatMeter(correctedNorthing),
          zone: String(resolvedZone),
          band,
          hemisphere,
          status: "Error",
          error: validationError,
        };
      }

      const point = utmToDecimal(
        correctedEasting,
        correctedNorthing,
        crs,
        resolvedZone,
        hemisphere,
        customProj4
      );

      const coordinateError =
        validateDecimalCoordinates(
          point.latitude,
          point.longitude
        );

      if (coordinateError) {
        return {
          ...baseRow,
          latitude: formatDecimal(point.latitude),
          longitude: formatDecimal(point.longitude),
          rawEasting: formatMeter(rawEasting),
          rawNorthing: formatMeter(rawNorthing),
          correctedEasting:
            formatMeter(correctedEasting),
          correctedNorthing:
            formatMeter(correctedNorthing),
          zone: String(resolvedZone),
          band,
          hemisphere,
          status: "Error",
          error: coordinateError,
        };
      }

      return {
        ...baseRow,
        latitude: formatDecimal(point.latitude),
        longitude: formatDecimal(point.longitude),
        dmsLatitude: toDms(point.latitude, "lat"),
        dmsLongitude: toDms(point.longitude, "lng"),
        rawEasting: formatMeter(rawEasting),
        rawNorthing: formatMeter(rawNorthing),
        correctedEasting:
          formatMeter(correctedEasting),
        correctedNorthing:
          formatMeter(correctedNorthing),
        zone: String(resolvedZone),
        band:
          band ||
          getUtmBand(point.latitude),
        hemisphere,
        status: "OK",
      };
    }

    let latitude: number | null = null;
    let longitude: number | null = null;

    if (
      bulkType === "decimal-to-dms-utm"
    ) {
      latitude = getNumber(row, [
        "latitude",
        "lat",
      ]);

      longitude = getNumber(row, [
        "longitude",
        "lng",
        "lon",
        "long",
      ]);
    }

    if (bulkType === "dms-to-utm") {
      const latDeg = getNumber(row, [
        "lat_deg",
        "latdeg",
        "lat_degree",
        "latdegree",
        "latitude_degree",
      ]);
      const latMin = getNumber(row, [
        "lat_min",
        "latmin",
        "lat_minute",
        "latminute",
      ]);
      const latSec = getNumber(row, [
        "lat_sec",
        "latsec",
        "lat_second",
        "latsecond",
      ]);
      const latDir = getText(row, [
        "lat_dir",
        "latdir",
        "lat_direction",
        "latdirection",
      ]);

      const lngDeg = getNumber(row, [
        "lng_deg",
        "lngdeg",
        "lon_deg",
        "londeg",
        "long_deg",
        "longdeg",
        "longitude_degree",
      ]);
      const lngMin = getNumber(row, [
        "lng_min",
        "lngmin",
        "lon_min",
        "lonmin",
        "long_min",
        "longmin",
      ]);
      const lngSec = getNumber(row, [
        "lng_sec",
        "lngsec",
        "lon_sec",
        "lonsec",
        "long_sec",
        "longsec",
      ]);
      const lngDir = getText(row, [
        "lng_dir",
        "lngdir",
        "lon_dir",
        "londir",
        "long_dir",
        "longdir",
        "lng_direction",
      ]);

      if (
        latDeg === null ||
        latMin === null ||
        latSec === null ||
        lngDeg === null ||
        lngMin === null ||
        lngSec === null
      ) {
        return {
          ...baseRow,
          status: "Error",
          error:
            "Missing DMS latitude or longitude columns.",
        };
      }

      const dmsError = validateDmsParts(
        latDeg,
        latMin,
        latSec,
        lngDeg,
        lngMin,
        lngSec
      );

      if (dmsError) {
        return {
          ...baseRow,
          status: "Error",
          error: dmsError,
        };
      }

      latitude = dmsToDecimal(
        latDeg,
        latMin,
        latSec,
        latDir || "S"
      );

      longitude = dmsToDecimal(
        lngDeg,
        lngMin,
        lngSec,
        lngDir || "E"
      );
    }

    if (
      latitude === null ||
      longitude === null
    ) {
      return {
        ...baseRow,
        status: "Error",
        error:
          "Missing latitude or longitude columns.",
      };
    }

    const coordinateError =
      validateDecimalCoordinates(
        latitude,
        longitude
      );

    if (coordinateError) {
      return {
        ...baseRow,
        latitude: String(latitude),
        longitude: String(longitude),
        status: "Error",
        error: coordinateError,
      };
    }

    const rowZone = getNumber(row, [
      "zone",
      "utm_zone",
      "utmzone",
    ]);

    const resolvedZone = resolveOutputZone(
      longitude,
      rowZone,
      fallbackZone,
      autoDetectUtm
    );

    const hemisphere =
      latitude < 0 ? "S" : "N";

    const utm = decimalToUtm(
      latitude,
      longitude,
      crs,
      resolvedZone,
      hemisphere,
      customProj4
    );

    return {
      ...baseRow,
      latitude: formatDecimal(latitude),
      longitude: formatDecimal(longitude),
      dmsLatitude: toDms(latitude, "lat"),
      dmsLongitude: toDms(longitude, "lng"),
      rawEasting: "",
      rawNorthing: "",
      correctedEasting: formatMeter(
        utm.easting
      ),
      correctedNorthing: formatMeter(
        utm.northing
      ),
      zone: String(resolvedZone),
      band: getUtmBand(latitude),
      hemisphere,
      status: "OK",
    };
  } catch (error) {
    return {
      ...baseRow,
      status: "Error",
      error:
        error instanceof Error
          ? error.message
          : "Unable to convert this row.",
    };
  }
}

function rowsToCsv(
  rows: ConvertedRow[],
  originalColumns: string[]
) {
  const escapeCsv = (value: unknown) => {
    const text = String(value ?? "");

    if (
      text.includes(",") ||
      text.includes('"') ||
      text.includes("\n")
    ) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  };

  const header = [
    ...originalColumns,
    ...CONVERTED_COLUMNS.map(
      (column) => column.label
    ),
  ].map(escapeCsv);

  const body = rows.map((row) => [
    ...originalColumns.map(
      (column) => row.original[column]
    ),
    ...CONVERTED_COLUMNS.map(
      (column) => row[column.key]
    ),
  ].map(escapeCsv).join(","));

  return [header.join(","), ...body].join("\n");
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
      <span className="text-sm font-medium text-gray-700">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          setValue(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export default function CoordinatesConverterPage() {
  const [mode, setMode] =
    useState<Mode>("dd-to-dms");

  const [bulkType, setBulkType] =
    useState<BulkType>("utm-to-dms");

  const [inputCrs, setInputCrs] =
    useState<CrsType>("wgs84-utm");

  const [customProj4, setCustomProj4] =
    useState(DEFAULT_CUSTOM_PROJ4);

  const [defaultZone, setDefaultZone] =
    useState("37");

  const [hemisphere, setHemisphere] =
    useState("S");

  const [autoDetectUtm, setAutoDetectUtm] =
    useState(true);

  const [eastingOffset, setEastingOffset] =
    useState("0");

  const [
    northingOffset,
    setNorthingOffset,
  ] = useState("0");

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [latDeg, setLatDeg] =
    useState("");
  const [latMin, setLatMin] =
    useState("");
  const [latSec, setLatSec] =
    useState("");
  const [latDir, setLatDir] =
    useState("S");

  const [lngDeg, setLngDeg] =
    useState("");
  const [lngMin, setLngMin] =
    useState("");
  const [lngSec, setLngSec] =
    useState("");
  const [lngDir, setLngDir] =
    useState("E");

  const [utmEasting, setUtmEasting] =
    useState("");
  const [utmNorthing, setUtmNorthing] =
    useState("");

  const [bulkRows, setBulkRows] =
    useState<BulkRow[]>([]);
  const [bulkFileName, setBulkFileName] =
    useState("");
  const [bulkError, setBulkError] =
    useState<string | null>(null);
  const [isBulkChecking, setIsBulkChecking] =
    useState(false);

  const showProjectionControls =
    mode === "dms-to-utm" ||
    mode === "utm-to-dms" ||
    mode === "bulk-file";

  const showAutoDetection =
    mode === "dms-to-utm" ||
    (mode === "bulk-file" &&
      bulkType !== "utm-to-dms");

  const normalizedDefaultZone = normalizeZone(
    defaultZone,
    37
  );

  const normalizedHemisphere =
    normalizeHemisphere(hemisphere, "S");

  const projectionSummary = useMemo(() => {
    const utmName = getProjectionName(
      inputCrs,
      normalizedDefaultZone,
      normalizedHemisphere,
      customProj4
    );

    if (
      mode === "utm-to-dms" ||
      (mode === "bulk-file" &&
        bulkType === "utm-to-dms")
    ) {
      return {
        source: utmName,
        target:
          "WGS84 Geographic latitude / longitude",
      };
    }

    return {
      source: getGeographicName(inputCrs),
      target: autoDetectUtm
        ? "Auto-detected UTM zone and hemisphere per coordinate"
        : utmName,
    };
  }, [
    mode,
    bulkType,
    inputCrs,
    normalizedDefaultZone,
    normalizedHemisphere,
    customProj4,
    autoDetectUtm,
  ]);

  const result = useMemo(() => {
    try {
      if (mode === "dd-to-dms") {
        const latitude = parseNumber(lat);
        const longitude = parseNumber(lng);

        if (
          latitude === null ||
          longitude === null
        ) {
          return "";
        }

        const coordinateError =
          validateDecimalCoordinates(
            latitude,
            longitude
          );

        if (coordinateError) {
          return coordinateError;
        }

        return [
          `DMS Latitude: ${toDms(
            latitude,
            "lat"
          )}`,
          `DMS Longitude: ${toDms(
            longitude,
            "lng"
          )}`,
          `Auto UTM Zone: ${zoneFromLongitude(
            longitude
          )}`,
          `Auto Hemisphere: ${
            latitude < 0 ? "S" : "N"
          }`,
        ].join("\n");
      }

      if (
        mode === "dms-to-dd" ||
        mode === "dms-to-utm"
      ) {
        const latD = parseNumber(latDeg);
        const latM = parseNumber(latMin);
        const latS = parseNumber(latSec);
        const lngD = parseNumber(lngDeg);
        const lngM = parseNumber(lngMin);
        const lngS = parseNumber(lngSec);

        if (
          latD === null ||
          latM === null ||
          latS === null ||
          lngD === null ||
          lngM === null ||
          lngS === null
        ) {
          return "";
        }

        const dmsError = validateDmsParts(
          latD,
          latM,
          latS,
          lngD,
          lngM,
          lngS
        );

        if (dmsError) {
          return dmsError;
        }

        const latitude = dmsToDecimal(
          latD,
          latM,
          latS,
          latDir
        );

        const longitude = dmsToDecimal(
          lngD,
          lngM,
          lngS,
          lngDir
        );

        const coordinateError =
          validateDecimalCoordinates(
            latitude,
            longitude
          );

        if (coordinateError) {
          return coordinateError;
        }

        if (mode === "dms-to-dd") {
          return [
            `Latitude: ${formatDecimal(
              latitude
            )}`,
            `Longitude: ${formatDecimal(
              longitude
            )}`,
          ].join("\n");
        }

        const zone = autoDetectUtm
          ? zoneFromLongitude(longitude)
          : normalizeZone(
              defaultZone,
              zoneFromLongitude(longitude)
            );

        const hemi =
          latitude < 0 ? "S" : "N";

        const utm = decimalToUtm(
          latitude,
          longitude,
          inputCrs,
          zone,
          hemi,
          customProj4
        );

        return [
          `Latitude: ${formatDecimal(
            latitude
          )}`,
          `Longitude: ${formatDecimal(
            longitude
          )}`,
          `Easting: ${formatMeter(
            utm.easting
          )}`,
          `Northing: ${formatMeter(
            utm.northing
          )}`,
          `Zone: ${zone}`,
          `Band: ${getUtmBand(latitude)}`,
          `Hemisphere: ${hemi}`,
        ].join("\n");
      }

      if (mode === "utm-to-dms") {
        const easting =
          parseNumber(utmEasting);
        const northing =
          parseNumber(utmNorthing);

        if (
          easting === null ||
          northing === null
        ) {
          return "";
        }

        const correctedEasting =
          easting -
          (parseNumber(eastingOffset) ?? 0);

        const correctedNorthing =
          northing -
          (parseNumber(northingOffset) ?? 0);

        const zone = normalizeZone(
          defaultZone,
          37
        );

        const hemi =
          normalizeHemisphere(
            hemisphere,
            "S"
          );

        const validationError =
          validateUtmInput(
            correctedEasting,
            correctedNorthing,
            zone,
            inputCrs
          );

        if (validationError) {
          return validationError;
        }

        const point = utmToDecimal(
          correctedEasting,
          correctedNorthing,
          inputCrs,
          zone,
          hemi,
          customProj4
        );

        const coordinateError =
          validateDecimalCoordinates(
            point.latitude,
            point.longitude
          );

        if (coordinateError) {
          return coordinateError;
        }

        return [
          `Latitude: ${formatDecimal(
            point.latitude
          )}`,
          `Longitude: ${formatDecimal(
            point.longitude
          )}`,
          `DMS Latitude: ${toDms(
            point.latitude,
            "lat"
          )}`,
          `DMS Longitude: ${toDms(
            point.longitude,
            "lng"
          )}`,
          `Corrected Easting: ${formatMeter(
            correctedEasting
          )}`,
          `Corrected Northing: ${formatMeter(
            correctedNorthing
          )}`,
          `Zone: ${zone}`,
          `Band: ${getUtmBand(
            point.latitude
          )}`,
          `Hemisphere: ${hemi}`,
        ].join("\n");
      }

      return "";
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Unable to convert coordinates.";
    }
  }, [
    mode,
    lat,
    lng,
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
    inputCrs,
    customProj4,
    defaultZone,
    hemisphere,
    eastingOffset,
    northingOffset,
    autoDetectUtm,
  ]);

  const convertedRows = useMemo(
    () =>
      bulkRows.map((row, index) =>
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
      ),
    [
      bulkRows,
      bulkType,
      inputCrs,
      customProj4,
      defaultZone,
      hemisphere,
      eastingOffset,
      northingOffset,
      autoDetectUtm,
    ]
  );

  const originalColumns = useMemo(
    () => getBulkOriginalColumns(bulkRows),
    [bulkRows]
  );

  const singlePreviewPoints = useMemo(() => {
    try {
      if (mode === "dd-to-dms") {
        const latitude = parseNumber(lat);
        const longitude = parseNumber(lng);

        if (
          latitude === null ||
          longitude === null ||
          validateDecimalCoordinates(
            latitude,
            longitude
          )
        ) {
          return [];
        }

        return [
          {
            label: "Manual coordinate",
            latitude,
            longitude,
          },
        ];
      }

      if (
        mode === "dms-to-dd" ||
        mode === "dms-to-utm"
      ) {
        const latD = parseNumber(latDeg);
        const latM = parseNumber(latMin);
        const latS = parseNumber(latSec);
        const lngD = parseNumber(lngDeg);
        const lngM = parseNumber(lngMin);
        const lngS = parseNumber(lngSec);

        if (
          latD === null ||
          latM === null ||
          latS === null ||
          lngD === null ||
          lngM === null ||
          lngS === null ||
          validateDmsParts(
            latD,
            latM,
            latS,
            lngD,
            lngM,
            lngS
          )
        ) {
          return [];
        }

        const latitude = dmsToDecimal(
          latD,
          latM,
          latS,
          latDir
        );
        const longitude = dmsToDecimal(
          lngD,
          lngM,
          lngS,
          lngDir
        );

        if (
          validateDecimalCoordinates(
            latitude,
            longitude
          )
        ) {
          return [];
        }

        return [
          {
            label: "Manual coordinate",
            latitude,
            longitude,
          },
        ];
      }

      if (mode === "utm-to-dms") {
        const easting =
          parseNumber(utmEasting);
        const northing =
          parseNumber(utmNorthing);

        if (
          easting === null ||
          northing === null
        ) {
          return [];
        }

        const correctedEasting =
          easting -
          (parseNumber(eastingOffset) ?? 0);
        const correctedNorthing =
          northing -
          (parseNumber(northingOffset) ?? 0);
        const zone = normalizeZone(
          defaultZone,
          37
        );
        const hemi =
          normalizeHemisphere(
            hemisphere,
            "S"
          );

        if (
          validateUtmInput(
            correctedEasting,
            correctedNorthing,
            zone,
            inputCrs
          )
        ) {
          return [];
        }

        const point = utmToDecimal(
          correctedEasting,
          correctedNorthing,
          inputCrs,
          zone,
          hemi,
          customProj4
        );

        if (
          validateDecimalCoordinates(
            point.latitude,
            point.longitude
          )
        ) {
          return [];
        }

        return [
          {
            label: "Manual coordinate",
            latitude: point.latitude,
            longitude: point.longitude,
          },
        ];
      }

      return [];
    } catch {
      return [];
    }
  }, [
    mode,
    lat,
    lng,
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
    defaultZone,
    hemisphere,
    eastingOffset,
    northingOffset,
    inputCrs,
    customProj4,
  ]);

  const bulkPreviewPoints = useMemo(
    () =>
      convertedRows
        .filter((row) => !row.error)
        .map((row) => {
          const latitude =
            parseNumber(row.latitude);
          const longitude =
            parseNumber(row.longitude);

          if (
            latitude === null ||
            longitude === null
          ) {
            return null;
          }

          return {
            label:
              row.id ||
              row.input ||
              "Converted point",
            latitude,
            longitude,
          };
        })
        .filter(
          (point): point is PreviewPoint =>
            point !== null
        ),
    [convertedRows]
  );

  const previewPoints =
    mode === "bulk-file"
      ? bulkPreviewPoints
      : singlePreviewPoints;

  const validRowCount = convertedRows.filter(
    (row) => !row.error
  ).length;
  const errorRowCount =
    convertedRows.length - validRowCount;

  async function copyResult() {
    if (result) {
      await navigator.clipboard.writeText(
        result
      );
    }
  }

  function clearFields() {
    setLat("");
    setLng("");
    setLatDeg("");
    setLatMin("");
    setLatSec("");
    setLatDir("S");
    setLngDeg("");
    setLngMin("");
    setLngSec("");
    setLngDir("E");
    setUtmEasting("");
    setUtmNorthing("");
    setBulkRows([]);
    setBulkFileName("");
    setBulkError(null);
  }

  async function handleBulkFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    setBulkError(null);

    if (!file) {
      return;
    }

    setIsBulkChecking(true);

    try {
      const rows =
        await readRowsFromFile(file);

      if (rows.length === 0) {
        setBulkRows([]);
        setBulkFileName("");
        setBulkError(
          "No coordinate rows were found in this file."
        );
        event.target.value = "";
        return;
      }

      const usage =
        await checkCoordinateBulkUsage();

      if (!usage.allowed) {
        setBulkRows([]);
        setBulkFileName("");
        setBulkError(usage.message);
        event.target.value = "";
        return;
      }

      setBulkRows(rows);
      setBulkFileName(file.name);
    } catch (error) {
      setBulkRows([]);
      setBulkFileName("");
      setBulkError(
        error instanceof Error
          ? error.message
          : "Unable to read this CSV or Excel file."
      );
      event.target.value = "";
    } finally {
      setIsBulkChecking(false);
    }
  }

  function downloadCsv() {
    if (convertedRows.length === 0) {
      return;
    }

    const csv = rowsToCsv(
      convertedRows,
      originalColumns
    );
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url =
      URL.createObjectURL(blob);
    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      bulkFileName.replace(
        /\.[^.]+$/,
        ""
      ) || "coordinates";
    link.download += "-converted.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/tools"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Back to Tools
        </Link>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              GIS Utility
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Coordinates Converter
            </h1>

            <p className="mt-3 max-w-3xl text-gray-600">
              Convert coordinates between Decimal Degrees, DMS and UTM. Upload CSV or Excel files for bulk conversion, preview valid results on OpenStreetMap, and export the original columns with converted coordinate fields appended.
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid gap-4 text-sm leading-6 text-gray-700 md:grid-cols-3">
              <div>
                <h2 className="font-bold text-gray-900">
                  1. Choose format
                </h2>
                <p className="mt-1">
                  Select Decimal, DMS, UTM or CSV/Excel Bulk depending on your source data.
                </p>
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  2. Set CRS
                </h2>
                <p className="mt-1">
                  Choose Source CRS and confirm Target CRS. Geographic inputs can auto-detect UTM zone and hemisphere.
                </p>
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  3. Review output
                </h2>
                <p className="mt-1">
                  Check row-level errors, preview valid points on the map, then copy or download the converted CSV.
                </p>
              </div>
            </div>

            <p className="mt-4 border-t border-gray-200 pt-4 text-sm leading-6 text-gray-600">
              For normal UTM data, keep offsets at 0. Use Easting/Northing Offset only when your source uses a local grid, for example easting 1132556 that should become 232556 after subtracting 900000.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {modes.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setMode(item.key)
                }
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
            <div className="mt-6">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Bulk conversion type
                </span>

                <select
                  value={bulkType}
                  onChange={(event) =>
                    setBulkType(
                      event.target
                        .value as BulkType
                    )
                  }
                  className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {bulkTypes.map((item) => (
                    <option
                      key={item.key}
                      value={item.key}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {showProjectionControls && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Source CRS / Projection
                </span>

                <select
                  value={inputCrs}
                  onChange={(event) =>
                    setInputCrs(
                      event.target
                        .value as CrsType
                    )
                  }
                  className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {crsOptions.map((item) => (
                    <option
                      key={item.key}
                      value={item.key}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-gray-500">
                  Source: {projectionSummary.source}
                </p>
              </label>

              <div>
                <span className="text-sm font-medium text-gray-700">
                  Target CRS / Output
                </span>
                <div className="mt-2 min-h-[50px] rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {projectionSummary.target}
                </div>
              </div>

              {inputCrs === "custom" && (
                <Field
                  label="Custom Proj4"
                  value={customProj4}
                  setValue={setCustomProj4}
                  placeholder="+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs"
                />
              )}

              <Field
                label="Default UTM Zone"
                value={defaultZone}
                setValue={setDefaultZone}
                placeholder="37"
              />

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Default Hemisphere
                </span>

                <select
                  value={hemisphere}
                  onChange={(event) =>
                    setHemisphere(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="S">S</option>
                  <option value="N">N</option>
                </select>
              </label>

              {showAutoDetection && (
                <label className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={autoDetectUtm}
                    onChange={(event) =>
                      setAutoDetectUtm(
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">
                      Auto-detect UTM zone and hemisphere
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-gray-600">
                      Recommended for latitude/longitude inputs. The converter calculates zone from longitude and hemisphere from latitude for each coordinate.
                    </span>
                  </span>
                </label>
              )}

              {(mode === "utm-to-dms" ||
                mode === "bulk-file") && (
                <>
                  <Field
                    label="Easting Offset"
                    value={eastingOffset}
                    setValue={
                      setEastingOffset
                    }
                    placeholder="0"
                  />

                  <Field
                    label="Northing Offset"
                    value={northingOffset}
                    setValue={
                      setNorthingOffset
                    }
                    placeholder="0"
                  />

                  <div className="flex flex-wrap gap-3 md:col-span-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEastingOffset(
                          "900000"
                        )
                      }
                      className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                    >
                      Use 900000 Easting Offset
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEastingOffset("0");
                        setNorthingOffset("0");
                      }}
                      className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                    >
                      Reset Offsets
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {mode === "dd-to-dms" && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field
                label="Latitude"
                value={lat}
                setValue={setLat}
                placeholder="-6.7924"
              />

              <Field
                label="Longitude"
                value={lng}
                setValue={setLng}
                placeholder="39.2083"
              />
            </div>
          )}

          {(mode === "dms-to-dd" ||
            mode === "dms-to-utm") && (
            <div className="mt-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Latitude DMS
                </h2>

                <div className="mt-3 grid gap-4 md:grid-cols-4">
                  <Field
                    label="Degrees"
                    value={latDeg}
                    setValue={setLatDeg}
                    placeholder="5"
                  />

                  <Field
                    label="Minutes"
                    value={latMin}
                    setValue={setLatMin}
                    placeholder="36"
                  />

                  <Field
                    label="Seconds"
                    value={latSec}
                    setValue={setLatSec}
                    placeholder="42.3032"
                  />

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Direction
                    </span>

                    <select
                      value={latDir}
                      onChange={(event) =>
                        setLatDir(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option>N</option>
                      <option>S</option>
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Longitude DMS
                </h2>

                <div className="mt-3 grid gap-4 md:grid-cols-4">
                  <Field
                    label="Degrees"
                    value={lngDeg}
                    setValue={setLngDeg}
                    placeholder="36"
                  />

                  <Field
                    label="Minutes"
                    value={lngMin}
                    setValue={setLngMin}
                    placeholder="35"
                  />

                  <Field
                    label="Seconds"
                    value={lngSec}
                    setValue={setLngSec}
                    placeholder="8.7188"
                  />

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Direction
                    </span>

                    <select
                      value={lngDir}
                      onChange={(event) =>
                        setLngDir(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option>E</option>
                      <option>W</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          )}

          {mode === "utm-to-dms" && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field
                label="Easting"
                value={utmEasting}
                setValue={setUtmEasting}
                placeholder="232555.8"
              />

              <Field
                label="Northing"
                value={utmNorthing}
                setValue={setUtmNorthing}
                placeholder="9379161.8"
              />
            </div>
          )}

          {mode === "bulk-file" && (
            <div className="mt-6">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Upload CSV or Excel file
                </span>

                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleBulkFile}
                  disabled={isBulkChecking}
                  className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3 text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 disabled:opacity-60"
                />
              </label>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                CSV/Excel columns supported: latitude, longitude, lat, lng, easting, northing, x, y, zone, hemisphere, band, elevation. Column z is treated as elevation, not UTM zone. Original columns are preserved in the downloaded CSV.
              </p>

              {isBulkChecking && (
                <p className="mt-3 text-sm font-medium text-blue-600">
                  Checking your bulk conversion limit and reading file...
                </p>
              )}

              {bulkError && (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {bulkError}
                </p>
              )}
            </div>
          )}

          <MapPreview points={previewPoints} />

          {mode !== "bulk-file" && (
            <>
              <div className="mt-6 rounded-md bg-gray-900 p-4 text-white">
                <p className="text-sm font-semibold text-gray-300">
                  Result
                </p>

                <pre className="mt-2 whitespace-pre-wrap text-lg">
                  {result ||
                    "Enter coordinates to see the result."}
                </pre>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copyResult}
                  disabled={!result}
                  className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy Result
                </button>

                <button
                  type="button"
                  onClick={clearFields}
                  className="rounded-md bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  Clear
                </button>
              </div>
            </>
          )}

          {mode === "bulk-file" && (
            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Converted Results
                  </h2>

                  {bulkFileName && (
                    <p className="mt-1 text-sm text-gray-600">
                      Source file: {bulkFileName}
                    </p>
                  )}

                  {convertedRows.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                        {convertedRows.length} total rows
                      </span>
                      <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
                        {validRowCount} valid
                      </span>
                      <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
                        {errorRowCount} errors
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={
                    convertedRows.length === 0
                  }
                  className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download CSV
                </button>
              </div>

              <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                {convertedRows.length === 0 ? (
                  <p className="p-5 text-sm text-gray-600">
                    Upload a CSV or Excel file to see converted rows here.
                  </p>
                ) : (
                  <table className="min-w-[1600px] divide-y divide-gray-200 text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        {originalColumns.map(
                          (column) => (
                            <th
                              key={`original-${column}`}
                              className="px-4 py-3 font-semibold"
                            >
                              {column}
                            </th>
                          )
                        )}

                        {CONVERTED_COLUMNS.map(
                          (column) => (
                            <th
                              key={column.key}
                              className="px-4 py-3 font-semibold text-blue-800"
                            >
                              {column.label}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                      {convertedRows.map(
                        (row, index) => (
                          <tr
                            key={`${row.input}-${index}`}
                            className={
                              row.error
                                ? "bg-red-50/40"
                                : ""
                            }
                          >
                            {originalColumns.map(
                              (column) => (
                                <td
                                  key={`original-${column}-${index}`}
                                  className="px-4 py-3"
                                >
                                  {String(
                                    row.original[
                                      column
                                    ] ?? ""
                                  )}
                                </td>
                              )
                            )}

                            {CONVERTED_COLUMNS.map(
                              (column) => (
                                <td
                                  key={`${column.key}-${index}`}
                                  className={`px-4 py-3 ${
                                    column.key ===
                                      "status" &&
                                    row.status ===
                                      "OK"
                                      ? "font-semibold text-green-700"
                                      : ""
                                  } ${
                                    column.key ===
                                      "error" &&
                                    row.error
                                      ? "font-medium text-red-700"
                                      : ""
                                  }`}
                                >
                                  {row[column.key] ||
                                    ""}
                                </td>
                              )
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          <div className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-5 text-center">
            <h2 className="text-xl font-bold text-gray-900">
              Support This Free GIS Tool
            </h2>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              If this coordinates converter helps your GIS, survey or mapping work, you can support DocMaster AI so we can keep improving free tools.
            </p>

            <a
              href="mailto:yoelngusulu@gmail.com?subject=Support%20DocMaster%20AI"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Donate / Support
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}