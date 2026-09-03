"use client";

import Link from "next/link";
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

type CoordinatePoint = {
  latitude: number;
  longitude: number;
  label: string;
};

type ParsedCoordinates = {
  points: CoordinatePoint[];
  errors: string[];
};

const EARTH_RADIUS_METERS = 6371008.8;

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

function parseCoordinateText(text: string): ParsedCoordinates {
  const points: CoordinatePoint[] = [];
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    const values = line
      .split(/[\s,;|]+/)
      .map(parseNumericToken)
      .filter((value): value is number => value !== null);

    if (values.length < 2) {
      errors.push(
        `Line ${index + 1}: enter latitude and longitude.`
      );
      return;
    }

    const latitude = values[0];
    const longitude = values[1];

    if (latitude < -90 || latitude > 90) {
      errors.push(
        `Line ${index + 1}: latitude must be between -90 and 90.`
      );
      return;
    }

    if (longitude < -180 || longitude > 180) {
      errors.push(
        `Line ${index + 1}: longitude must be between -180 and 180.`
      );
      return;
    }

    points.push({
      latitude,
      longitude,
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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
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
        className="h-[360px] w-full bg-slate-100"
      />

      {points.length === 0 && (
        <p className="border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
          Enter valid decimal degree coordinates to show them on the map.
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
  const [coordinateText, setCoordinateText] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy Summary");

  const parsed = useMemo(
    () => parseCoordinateText(coordinateText),
    [coordinateText]
  );

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
  }, [areaSquareMeters, mode, points.length, totalDistanceMeters]);

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
                decimal degree latitude and longitude coordinates.
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold">Input format</p>
              <p className="mt-1">One pair per line: latitude, longitude</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-5">
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
                  placeholder="Latitude, Longitude"
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
