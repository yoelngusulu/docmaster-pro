"use client";

import Link from "next/link";
import proj4 from "proj4";
import type {
  LayerGroup,
  Map as LeafletMap,
} from "leaflet";
import {
  ArrowLeft,
  Clipboard,
  Download,
  MapPinned,
  RefreshCw,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type MeasurementMode = "distance" | "area";
type InputFormat = "decimal" | "dms" | "utm";
type CrsType = "wgs84-utm" | "arc1960-utm" | "custom";
type UtmHemisphere = "N" | "S";
type CoordinateAxis = "lat" | "lng";

type CoordinatePoint = {
  latitude: number;
  longitude: number;
  label: string;
};

type ParsedCoordinates = {
  points: CoordinatePoint[];
  errors: string[];
};

type UtmOptions = {
  crs: CrsType;
  zone: number;
  hemisphere: UtmHemisphere;
  customProj4: string;
};

const EARTH_RADIUS_METERS = 6371008.8;

const WGS84_GEOGRAPHIC =
  "+proj=longlat +datum=WGS84 +no_defs";

const ARC1960_GEOGRAPHIC =
  "+proj=longlat +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +no_defs";

const DEFAULT_CUSTOM_PROJ4 =
  "+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs";

const inputFormats: {
  key: InputFormat;
  label: string;
}[] = [
  { key: "decimal", label: "Decimal" },
  { key: "dms", label: "DMS" },
  { key: "utm", label: "UTM" },
];

const inputFormatDetails: Record<
  InputFormat,
  {
    description: string;
    placeholder: string;
  }
> = {
  decimal: {
    description: "One pair per line: latitude, longitude.",
    placeholder: "Latitude, Longitude",
  },
  dms: {
    description:
      "One point per line: latitude DMS, longitude DMS. Use N/S and E/W where needed.",
    placeholder: "Lat DMS, Long DMS",
  },
  utm: {
    description:
      "One point per line: easting, northing. Optional zone and N/S can also be included per line.",
    placeholder: "Easting, Northing",
  },
};

const crsOptions: {
  key: CrsType;
  label: string;
}[] = [
  { key: "wgs84-utm", label: "WGS84 / UTM" },
  { key: "arc1960-utm", label: "Arc 1960 / UTM" },
  { key: "custom", label: "Custom Proj4 definition" },
];

function toRadians(value: number) {
  return (value * Math.PI) / 180;
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

function parseDmsCoordinateFromValues(
  values: number[],
  startIndex: number,
  axis: CoordinateAxis,
  direction: string | null,
  lineNumber: number
) {
  const degrees = values[startIndex];
  const minutes = values[startIndex + 1];
  const seconds = values[startIndex + 2];

  if (
    degrees === undefined ||
    minutes === undefined ||
    seconds === undefined
  ) {
    return {
      error: `Line ${lineNumber}: enter degrees, minutes and seconds for both latitude and longitude.`,
      value: null,
    };
  }

  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    return {
      error: `Line ${lineNumber}: DMS minutes and seconds must be between 0 and 59.`,
      value: null,
    };
  }

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

  const latitudeResult = parseDmsCoordinateFromValues(
    values,
    0,
    "lat",
    latitudeDirection,
    lineNumber
  );
  const longitudeResult = parseDmsCoordinateFromValues(
    values,
    3,
    "lng",
    longitudeDirection,
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
): ParsedCoordinates {
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
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function calculateAreaSquareMeters(points: CoordinatePoint[]) {
  if (points.length < 3) {
    return 0;
  }

  let total = 0;

  points.forEach((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    total +=
      toRadians(nextPoint.longitude - point.longitude) *
      (2 +
        Math.sin(toRadians(point.latitude)) +
        Math.sin(toRadians(nextPoint.latitude)));
  });

  return Math.abs((total * EARTH_RADIUS_METERS ** 2) / 2);
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function formatDistance(value: number) {
  if (value < 1000) {
    return `${formatNumber(value, 2)} m`;
  }

  return `${formatNumber(value / 1000, 3)} km`;
}

function formatArea(value: number) {
  if (value < 1000000) {
    return `${formatNumber(value, 2)} sq m`;
  }

  return `${formatNumber(value / 1000000, 4)} sq km`;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function MapPreview({
  points,
  mode,
}: {
  points: CoordinatePoint[];
  mode: MeasurementMode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      if (!containerRef.current) {
        return;
      }

      try {
        const L = await import("leaflet");

        if (cancelled || !containerRef.current) {
          return;
        }

        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current, {
            scrollWheelZoom: false,
          }).setView([-6.7924, 39.2083], 6);

          L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 19,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }
          ).addTo(mapRef.current);
        }

        const map = mapRef.current;

        if (!map) {
          return;
        }

        layerRef.current?.remove();

        const group = L.layerGroup();
        const latLngs = points.map(
          (point) =>
            [point.latitude, point.longitude] as [number, number]
        );

        if (latLngs.length > 1) {
          if (mode === "area" && latLngs.length > 2) {
            L.polygon(latLngs, {
              color: "#1d4ed8",
              fillColor: "#2563eb",
              fillOpacity: 0.16,
              weight: 3,
            }).addTo(group);
          } else {
            L.polyline(latLngs, {
              color: "#1d4ed8",
              weight: 4,
            }).addTo(group);
          }
        }

        points.forEach((point) => {
          L.circleMarker([point.latitude, point.longitude], {
            radius: 7,
            color: "#1d4ed8",
            fillColor: "#2563eb",
            fillOpacity: 0.9,
            weight: 2,
          })
            .bindPopup(
              `<strong>${escapeHtml(point.label)}</strong><br/>Lat: ${formatCoordinate(
                point.latitude
              )}<br/>Lng: ${formatCoordinate(point.longitude)}`
            )
            .addTo(group);
        });

        group.addTo(map);
        layerRef.current = group;

        if (latLngs.length === 0) {
          map.setView([-6.7924, 39.2083], 6);
        } else if (latLngs.length === 1) {
          map.setView(latLngs[0], 13);
        } else {
          const bounds = L.latLngBounds(latLngs);
          map.fitBounds(bounds.pad(0.22), {
            maxZoom: 13,
          });
        }

        window.setTimeout(() => {
          map.invalidateSize();
        }, 60);

        setMapError(null);
      } catch {
        setMapError("Map preview could not be loaded.");
      }
    }

    void loadMap();

    return () => {
      cancelled = true;
    };
  }, [points, mode]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative isolate z-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Map Preview
          </h2>
          <p className="text-sm text-gray-600">
            Visual check for the coordinate points and measurement path.
          </p>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {points.length} point{points.length === 1 ? "" : "s"}
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative z-0 h-[360px] w-full bg-slate-100"
      />

      {points.length === 0 && (
        <p className="border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
          Enter valid coordinates to show them on the map.
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

export default function DistanceAreaCalculatorPage() {
  const [mode, setMode] = useState<MeasurementMode>("distance");
  const [inputFormat, setInputFormat] =
    useState<InputFormat>("decimal");
  const [coordinateText, setCoordinateText] = useState("");
  const [utmCrs, setUtmCrs] = useState<CrsType>("wgs84-utm");
  const [utmZone, setUtmZone] = useState("37");
  const [utmHemisphere, setUtmHemisphere] =
    useState<UtmHemisphere>("S");
  const [customProj4, setCustomProj4] =
    useState(DEFAULT_CUSTOM_PROJ4);
  const [copyLabel, setCopyLabel] = useState("Copy Summary");

  const activeInputFormat = inputFormatDetails[inputFormat];
  const utmZoneError =
    inputFormat === "utm" ? getUtmZoneError(utmZone) : null;
  const normalizedUtmZone = normalizeUtmZone(utmZone, 37);

  const parsed = useMemo(() => {
    if (utmZoneError) {
      return {
        points: [],
        errors: [utmZoneError],
      };
    }

    return parseCoordinateText(coordinateText, inputFormat, {
      crs: utmCrs,
      zone: normalizedUtmZone,
      hemisphere: utmHemisphere,
      customProj4,
    });
  }, [
    coordinateText,
    customProj4,
    inputFormat,
    normalizedUtmZone,
    utmCrs,
    utmHemisphere,
    utmZoneError,
  ]);

  const points = parsed.points;

  const distanceSegments = useMemo(
    () =>
      points.slice(1).map((point, index) => ({
        from: points[index],
        to: point,
        distanceMeters: calculateDistanceMeters(points[index], point),
      })),
    [points]
  );

  const totalDistanceMeters = distanceSegments.reduce(
    (total, segment) => total + segment.distanceMeters,
    0
  );

  const areaSquareMeters = useMemo(
    () => calculateAreaSquareMeters(points),
    [points]
  );

  const hasEnoughPoints =
    mode === "distance" ? points.length >= 2 : points.length >= 3;

  const statusMessage = parsed.errors.length
    ? "Fix the coordinate errors before using the result."
    : hasEnoughPoints
      ? "Measurement preview is ready."
      : mode === "distance"
        ? "Enter at least two points for distance."
        : "Enter at least three points for area.";

  const summaryLines = useMemo(() => {
    const lines = [
      `Mode: ${mode === "distance" ? "Distance" : "Area"}`,
      `Input format: ${inputFormats.find((format) => format.key === inputFormat)?.label || inputFormat}`,
      `Points: ${points.length}`,
    ];

    if (points.length >= 2) {
      lines.push(`Total distance: ${formatDistance(totalDistanceMeters)}`);
    }

    if (mode === "area" && points.length >= 3) {
      lines.push(`Area: ${formatArea(areaSquareMeters)}`);
      lines.push(
        `Area hectares: ${formatNumber(areaSquareMeters / 10000, 4)} ha`
      );
    }

    return lines;
  }, [
    areaSquareMeters,
    inputFormat,
    mode,
    points.length,
    totalDistanceMeters,
  ]);

  async function copySummary() {
    await navigator.clipboard.writeText(summaryLines.join("\n"));
    setCopyLabel("Copied");

    window.setTimeout(() => {
      setCopyLabel("Copy Summary");
    }, 1500);
  }

  function downloadCsv() {
    const rows: string[][] = [
      ["Metric", "Value"],
      ["Mode", mode],
      [
        "Input format",
        inputFormats.find((format) => format.key === inputFormat)?.label ||
          inputFormat,
      ],
      ["Point count", String(points.length)],
      ["Total distance", formatDistance(totalDistanceMeters)],
    ];

    if (mode === "area" && points.length >= 3) {
      rows.push(["Area", formatArea(areaSquareMeters)]);
      rows.push([
        "Area hectares",
        `${formatNumber(areaSquareMeters / 10000, 4)} ha`,
      ]);
    }

    rows.push([]);
    rows.push(["Point", "Latitude", "Longitude"]);

    points.forEach((point) => {
      rows.push([
        point.label,
        formatCoordinate(point.latitude),
        formatCoordinate(point.longitude),
      ]);
    });

    if (distanceSegments.length > 0) {
      rows.push([]);
      rows.push(["Segment", "From", "To", "Distance"]);

      distanceSegments.forEach((segment, index) => {
        rows.push([
          String(index + 1),
          segment.from.label,
          segment.to.label,
          formatDistance(segment.distanceMeters),
        ]);
      });
    }

    const csv = rows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "docmaster-gis-measurement.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/tools/gis"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          <ArrowLeft size={16} />
          Back to GIS Tools
        </Link>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase text-blue-700">
                <MapPinned size={14} />
                GIS Utility
              </p>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
                Distance & Area Calculator
              </h1>

              <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
                Measure distance, perimeter and approximate polygon area from
                Decimal, DMS or UTM coordinate points.
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold">Input format</p>
              <p className="mt-1">{activeInputFormat.description}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="inline-flex rounded-lg bg-gray-100 p-1">
                  {([
                    ["distance", "Distance"],
                    ["area", "Area"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                        mode === value
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-700 hover:bg-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Coordinate input type
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {inputFormats.map((format) => (
                      <button
                        key={format.key}
                        type="button"
                        onClick={() => setInputFormat(format.key)}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                          inputFormat === format.key
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        {format.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {inputFormat === "utm" && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-800">
                        Source CRS
                      </span>
                      <select
                        value={utmCrs}
                        onChange={(event) =>
                          setUtmCrs(event.target.value as CrsType)
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        {crsOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-gray-800">
                        UTM Zone
                      </span>
                      <input
                        value={utmZone}
                        onChange={(event) => setUtmZone(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-gray-800">
                        Hemisphere
                      </span>
                      <select
                        value={utmHemisphere}
                        onChange={(event) =>
                          setUtmHemisphere(
                            event.target.value as UtmHemisphere
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="S">S</option>
                        <option value="N">N</option>
                      </select>
                    </label>

                    <div className="rounded-lg bg-white px-4 py-3 text-sm text-gray-600">
                      Rows can also include a zone or hemisphere. If omitted,
                      the settings here are used.
                    </div>
                  </div>

                  {utmCrs === "custom" && (
                    <label className="mt-4 block">
                      <span className="text-sm font-semibold text-gray-800">
                        Custom Proj4
                      </span>
                      <textarea
                        value={customProj4}
                        onChange={(event) =>
                          setCustomProj4(event.target.value)
                        }
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  )}
                </div>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-gray-800">
                  Coordinates
                </span>

                <textarea
                  value={coordinateText}
                  onChange={(event) =>
                    setCoordinateText(event.target.value)
                  }
                  rows={8}
                  spellCheck={false}
                  placeholder={activeInputFormat.placeholder}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setCoordinateText("")}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  <RefreshCw size={16} />
                  Clear
                </button>
              </div>

              {parsed.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">Coordinate errors</p>
                  <ul className="mt-2 space-y-1">
                    {parsed.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">
                  Status
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {statusMessage}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-500">
                    Points
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-950">
                    {points.length}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-500">
                    Distance
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-950">
                    {points.length >= 2
                      ? formatDistance(totalDistanceMeters)
                      : "-"}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:col-span-2">
                  <p className="text-sm font-semibold text-gray-500">
                    Area
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-950">
                    {mode === "area" && points.length >= 3
                      ? formatArea(areaSquareMeters)
                      : "-"}
                  </p>
                  {mode === "area" && points.length >= 3 && (
                    <p className="mt-1 text-sm text-gray-600">
                      {formatNumber(areaSquareMeters / 10000, 4)} hectares
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copySummary}
                  disabled={!hasEnoughPoints || parsed.errors.length > 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Clipboard size={16} />
                  {copyLabel}
                </button>

                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={!hasEnoughPoints || parsed.errors.length > 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  Download CSV
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <MapPreview points={points} mode={mode} />
          </div>

          {points.length > 0 && (
            <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Point</th>
                    <th className="px-4 py-3 font-semibold">Latitude</th>
                    <th className="px-4 py-3 font-semibold">Longitude</th>
                    <th className="px-4 py-3 font-semibold">Next segment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                  {points.map((point, index) => {
                    const segment = distanceSegments[index];

                    return (
                      <tr key={`${point.label}-${index}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {point.label}
                        </td>
                        <td className="px-4 py-3">
                          {formatCoordinate(point.latitude)}
                        </td>
                        <td className="px-4 py-3">
                          {formatCoordinate(point.longitude)}
                        </td>
                        <td className="px-4 py-3">
                          {segment
                            ? formatDistance(segment.distanceMeters)
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
