"use client";

import Link from "next/link";
import proj4 from "proj4";
import {
  useMemo,
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
  error?: string;
};

const modes: {
  key: Mode;
  label: string;
}[] = [
  {
    key: "dd-to-dms",
    label: "Decimal to DMS",
  },
  {
    key: "dms-to-dd",
    label: "DMS to Decimal",
  },
  {
    key: "dms-to-utm",
    label: "DMS to UTM",
  },
  {
    key: "utm-to-dms",
    label: "UTM to DMS",
  },
  {
    key: "bulk-file",
    label: "CSV / Excel Bulk",
  },
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
  {
    key: "wgs84-utm",
    label: "WGS84 / UTM",
  },
  {
    key: "arc1960-utm",
    label: "Arc 1960 / UTM",
  },
  {
    key: "custom",
    label: "Custom Proj4 definition",
  },
];

const WGS84_GEOGRAPHIC =
  "+proj=longlat +datum=WGS84 +no_defs";

const ARC1960_GEOGRAPHIC =
  "+proj=longlat +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +no_defs";

const DEFAULT_CUSTOM_PROJ4 =
  "+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs";

const EXPORT_COLUMNS: {
  key: keyof ConvertedRow;
  label: string;
}[] = [
  {
    key: "input",
    label: "Input",
  },
  {
    key: "id",
    label: "ID",
  },
  {
    key: "latitude",
    label: "Latitude",
  },
  {
    key: "longitude",
    label: "Longitude",
  },
  {
    key: "dmsLatitude",
    label: "DMS Latitude",
  },
  {
    key: "dmsLongitude",
    label: "DMS Longitude",
  },
  {
    key: "rawEasting",
    label: "Raw Easting",
  },
  {
    key: "rawNorthing",
    label: "Raw Northing",
  },
  {
    key: "correctedEasting",
    label: "Corrected Easting",
  },
  {
    key: "correctedNorthing",
    label: "Corrected Northing",
  },
  {
    key: "zone",
    label: "Zone",
  },
  {
    key: "band",
    label: "Band",
  },
  {
    key: "hemisphere",
    label: "Hemisphere",
  },
  {
    key: "elevation",
    label: "Elevation",
  },
  {
    key: "error",
    label: "Error",
  },
];

async function checkCoordinateBulkUsage(): Promise<UsageCheckResult> {
  const response = await fetch(
    "/api/tools/coordinates-bulk-usage",
    {
      method: "POST",
    }
  );

  if (response.ok) {
    return {
      allowed: true,
      message: null,
    };
  }

  const data = await response.json().catch(() => null);

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

  for (const [key, value] of Object.entries(
    row
  )) {
    const normalizedKey =
      normalizeHeader(key);

    if (
      normalizedAliases.includes(
        normalizedKey
      ) &&
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
  return parseNumber(
    getValue(row, aliases)
  );
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

function convertBulkRow(
  row: BulkRow,
  index: number,
  bulkType: BulkType,
  crs: CrsType,
  customProj4: string,
  defaultZone: string,
  defaultHemisphere: string,
  eastingOffset: string,
  northingOffset: string
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
          input,
          id,
          zone: String(resolvedZone),
          band,
          hemisphere,
          elevation,
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

      const point = utmToDecimal(
        correctedEasting,
        correctedNorthing,
        crs,
        resolvedZone,
        hemisphere,
        customProj4
      );

      return {
        input,
        id,
        latitude: formatDecimal(
          point.latitude
        ),
        longitude: formatDecimal(
          point.longitude
        ),
        dmsLatitude: toDms(
          point.latitude,
          "lat"
        ),
        dmsLongitude: toDms(
          point.longitude,
          "lng"
        ),
        rawEasting: formatMeter(
          rawEasting
        ),
        rawNorthing: formatMeter(
          rawNorthing
        ),
        correctedEasting: formatMeter(
          correctedEasting
        ),
        correctedNorthing: formatMeter(
          correctedNorthing
        ),
        zone: String(resolvedZone),
        band:
          band ||
          getUtmBand(point.latitude),
        hemisphere,
        elevation,
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
          input,
          id,
          elevation,
          error:
            "Missing DMS latitude or longitude columns.",
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
        input,
        id,
        elevation,
        error:
          "Missing latitude or longitude columns.",
      };
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return {
        input,
        id,
        latitude: String(latitude),
        longitude: String(longitude),
        elevation,
        error:
          "Latitude or longitude is outside the valid range.",
      };
    }

    const rowZone = getNumber(row, [
      "zone",
      "utm_zone",
      "utmzone",
    ]);

    const resolvedZone = normalizeZone(
      rowZone,
      fallbackZone ||
        zoneFromLongitude(longitude)
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
      input,
      id,
      latitude: formatDecimal(latitude),
      longitude: formatDecimal(longitude),
      dmsLatitude: toDms(
        latitude,
        "lat"
      ),
      dmsLongitude: toDms(
        longitude,
        "lng"
      ),
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
      elevation,
    };
  } catch (error) {
    return {
      input,
      id,
      elevation,
      error:
        error instanceof Error
          ? error.message
          : "Unable to convert this row.",
    };
  }
}

function rowsToCsv(rows: ConvertedRow[]) {
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

  const header = EXPORT_COLUMNS.map(
    (column) => column.label
  ).join(",");

  const body = rows.map((row) =>
    EXPORT_COLUMNS.map((column) =>
      escapeCsv(row[column.key])
    ).join(",")
  );

  return [header, ...body].join("\n");
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

        return [
          `DMS Latitude: ${toDms(
            latitude,
            "lat"
          )}`,
          `DMS Longitude: ${toDms(
            longitude,
            "lng"
          )}`,
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

        const zone = normalizeZone(
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

        const point = utmToDecimal(
          correctedEasting,
          correctedNorthing,
          inputCrs,
          zone,
          hemi,
          customProj4
        );

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
          northingOffset
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
    ]
  );

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

      setIsBulkChecking(true);

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

    const csv = rowsToCsv(convertedRows);
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
              Convert coordinates between Decimal Degrees, DMS and UTM. Upload
              CSV or Excel files for bulk conversion.
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid gap-4 text-sm leading-6 text-gray-700 md:grid-cols-3">
              <div>
                <h2 className="font-bold text-gray-900">
                  1. Choose format
                </h2>
                <p className="mt-1">
                  Select Decimal, DMS, UTM or CSV/Excel Bulk depending on your
                  source data.
                </p>
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  2. Set projection
                </h2>
                <p className="mt-1">
                  For UTM data, choose the correct CRS, zone and hemisphere
                  before converting.
                </p>
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  3. Review output
                </h2>
                <p className="mt-1">
                  Check the converted results, then copy a single result or
                  download the converted CSV.
                </p>
              </div>
            </div>

            <p className="mt-4 border-t border-gray-200 pt-4 text-sm leading-6 text-gray-600">
              For normal UTM data, keep offsets at 0. Use Easting/Northing
              Offset only when your source uses a local grid, for example
              easting 1132556 that should become 232556 after subtracting
              900000.
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
                  Input CRS / Projection
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
              </label>

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
                CSV/Excel columns supported: latitude, longitude, lat, lng,
                easting, northing, x, y, zone, hemisphere, band, elevation.
                Column z is treated as elevation, not UTM zone.
              </p>

              {isBulkChecking && (
                <p className="mt-3 text-sm font-medium text-blue-600">
                  Checking your bulk conversion limit...
                </p>
              )}

              {bulkError && (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {bulkError}
                </p>
              )}
            </div>
          )}

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
                  <table className="min-w-[1200px] divide-y divide-gray-200 text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        {EXPORT_COLUMNS.map(
                          (column) => (
                            <th
                              key={column.key}
                              className="px-4 py-3 font-semibold"
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
                          <tr key={`${row.input}-${index}`}>
                            {EXPORT_COLUMNS.map(
                              (column) => (
                                <td
                                  key={column.key}
                                  className={`px-4 py-3 ${
                                    column.key ===
                                      "error" &&
                                    row.error
                                      ? "font-medium text-red-600"
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
              If this coordinates converter helps your GIS, survey or mapping
              work, you can support DocMaster AI so we can keep improving free
              tools.
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