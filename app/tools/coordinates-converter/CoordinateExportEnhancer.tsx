"use client";

import { useEffect } from "react";
import JSZip from "jszip";

type KmlPoint = {
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  details: Record<string, string>;
};

const EXPORT_GROUP_ID = "yaju-coordinate-export-actions";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseNumber(value: string) {
  const cleaned = value.trim().replace(/,/g, "");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function findLastHeaderIndex(headers: string[], label: string) {
  const normalizedLabel = normalizeHeader(label);

  for (let index = headers.length - 1; index >= 0; index -= 1) {
    if (normalizeHeader(headers[index]) === normalizedLabel) {
      return index;
    }
  }

  return -1;
}

function getCellText(row: HTMLTableRowElement, index: number) {
  if (index < 0) {
    return "";
  }

  return row.cells[index]?.textContent?.trim() || "";
}

function getResultsPanel() {
  const headings = Array.from(document.querySelectorAll("h2"));
  const heading = headings.find(
    (item) => item.textContent?.trim() === "Converted Results"
  );

  return heading?.closest(".mt-8") || null;
}

function getSourceBaseName(panel: Element | null) {
  const sourceText = Array.from(
    panel?.querySelectorAll("p") || []
  ).find((item) =>
    item.textContent?.trim().startsWith("Source file:")
  )?.textContent;

  const rawName =
    sourceText?.replace(/^Source file:\s*/i, "") ||
    "coordinates";

  return rawName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "coordinates";
}

function readKmlPoints() {
  const panel = getResultsPanel();
  const table = panel?.querySelector("table");

  if (!table) {
    return { points: [] as KmlPoint[], baseName: "coordinates" };
  }

  const headers = Array.from(table.querySelectorAll("thead th")).map(
    (header) => header.textContent?.trim() || ""
  );

  const latitudeIndex = findLastHeaderIndex(headers, "Latitude");
  const longitudeIndex = findLastHeaderIndex(headers, "Longitude");
  const statusIndex = findLastHeaderIndex(headers, "Status");
  const idIndex = findLastHeaderIndex(headers, "ID");
  const inputIndex = findLastHeaderIndex(headers, "Input");
  const dmsLatitudeIndex = findLastHeaderIndex(headers, "DMS Latitude");
  const dmsLongitudeIndex = findLastHeaderIndex(headers, "DMS Longitude");
  const rawEastingIndex = findLastHeaderIndex(headers, "Raw Easting");
  const rawNorthingIndex = findLastHeaderIndex(headers, "Raw Northing");
  const zoneIndex = findLastHeaderIndex(headers, "Zone");
  const bandIndex = findLastHeaderIndex(headers, "Band");
  const hemisphereIndex = findLastHeaderIndex(headers, "Hemisphere");
  const elevationIndex = findLastHeaderIndex(headers, "Elevation");
  const errorIndex = findLastHeaderIndex(headers, "Error");

  const rows = Array.from(
    table.querySelectorAll<HTMLTableRowElement>("tbody tr")
  );

  const points = rows.flatMap((row, index) => {
    const status = getCellText(row, statusIndex);
    const error = getCellText(row, errorIndex);
    const latitude = parseNumber(getCellText(row, latitudeIndex));
    const longitude = parseNumber(getCellText(row, longitudeIndex));

    if (
      status.toLowerCase() === "error" ||
      error ||
      latitude === null ||
      longitude === null
    ) {
      return [];
    }

    const id = getCellText(row, idIndex);
    const input = getCellText(row, inputIndex);
    const elevation = parseNumber(getCellText(row, elevationIndex)) ?? 0;

    return [
      {
        name: id || input || `Point ${index + 1}`,
        latitude,
        longitude,
        elevation,
        details: {
          ID: id,
          Input: input,
          Latitude: String(latitude),
          Longitude: String(longitude),
          "DMS Latitude": getCellText(row, dmsLatitudeIndex),
          "DMS Longitude": getCellText(row, dmsLongitudeIndex),
          "Raw Easting": getCellText(row, rawEastingIndex),
          "Raw Northing": getCellText(row, rawNorthingIndex),
          Zone: getCellText(row, zoneIndex),
          Band: getCellText(row, bandIndex),
          Hemisphere: getCellText(row, hemisphereIndex),
          Elevation: elevation ? String(elevation) : "",
        },
      },
    ];
  });

  return {
    points,
    baseName: getSourceBaseName(panel),
  };
}

function buildKml(points: KmlPoint[], documentName: string) {
  const placemarks = points
    .map((point) => {
      const details = Object.entries(point.details)
        .filter(([, value]) => value)
        .map(
          ([label, value]) =>
            `<tr><td>${escapeXml(label)}</td><td>${escapeXml(value)}</td></tr>`
        )
        .join("");

      return `    <Placemark>
      <name>${escapeXml(point.name)}</name>
      <description><![CDATA[<table>${details}</table>]]></description>
      <Point>
        <coordinates>${point.longitude},${point.latitude},${point.elevation}</coordinates>
      </Point>
    </Placemark>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(documentName)}</name>
${placemarks}
  </Document>
</kml>
`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadKml() {
  const { points, baseName } = readKmlPoints();

  if (points.length === 0) {
    return;
  }

  const kml = buildKml(points, `${baseName}-converted`);
  downloadBlob(
    new Blob([kml], {
      type: "application/vnd.google-earth.kml+xml;charset=utf-8",
    }),
    `${baseName}-converted.kml`
  );
}

async function downloadKmz() {
  const { points, baseName } = readKmlPoints();

  if (points.length === 0) {
    return;
  }

  const zip = new JSZip();
  zip.file("doc.kml", buildKml(points, `${baseName}-converted`));

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
  });

  downloadBlob(blob, `${baseName}-converted.kmz`);
}

function createExportButton(label: string, onClick: () => void | Promise<void>) {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = label;
  button.className =
    "rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";
  button.addEventListener("click", () => {
    void onClick();
  });

  return button;
}

function syncExportButtons() {
  const csvButton = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Download CSV"
  );

  if (!csvButton || document.getElementById(EXPORT_GROUP_ID)) {
    updateExportButtonState();
    return;
  }

  const group = document.createElement("div");
  group.id = EXPORT_GROUP_ID;
  group.className = "flex flex-wrap gap-3";

  const parent = csvButton.parentElement;

  parent?.insertBefore(group, csvButton);
  group.appendChild(csvButton);
  group.appendChild(createExportButton("Download KML", downloadKml));
  group.appendChild(createExportButton("Download KMZ", downloadKmz));

  updateExportButtonState();
}

function updateExportButtonState() {
  const group = document.getElementById(EXPORT_GROUP_ID);

  if (!group) {
    return;
  }

  const hasPoints = readKmlPoints().points.length > 0;

  Array.from(group.querySelectorAll("button")).forEach((button) => {
    if (button.textContent?.trim() === "Download CSV") {
      return;
    }

    button.toggleAttribute("disabled", !hasPoints);
  });
}

export default function CoordinateExportEnhancer() {
  useEffect(() => {
    syncExportButtons();

    const observer = new MutationObserver(syncExportButtons);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
