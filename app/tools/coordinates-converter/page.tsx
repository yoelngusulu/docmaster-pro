"use client";

import Link from "next/link";
import proj4 from "proj4";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type Mode = "dd-to-dms" | "dms-to-dd" | "dms-to-utm" | "utm-to-dms" | "bulk-file";
type BulkType = "decimal-to-dms-utm" | "dms-to-utm" | "utm-to-dms";
type CrsOption = "wgs84-utm" | "arc1960-utm" | "custom";
type BulkRow = Record<string, string | number | null | undefined>;

type ConvertedRow = {
  input: string;
  id?: string;
  latitude?: string;
  longitude?: string;
  dmsLatitude?: string;
  dmsLongitude?: string;
  rawEasting?: string;
  rawNorthing?: string;
  easting?: string;
  northing?: string;
  zone?: string;
  band?: string;
  hemisphere?: string;
  elevation?: string;
  error?: string;
};

const modes: { key: Mode; label: string }[] = [
  { key: "dd-to-dms", label: "Decimal to DMS" },
  { key: "dms-to-dd", label: "DMS to Decimal" },
  { key: "dms-to-utm", label: "DMS to UTM" },
  { key: "utm-to-dms", label: "UTM to DMS" },
  { key: "bulk-file", label: "CSV / Excel Bulk" },
];

const crsOptions: { value: CrsOption; label: string }[] = [
  { value: "wgs84-utm", label: "WGS84 / UTM (use zone below)" },
  { value: "arc1960-utm", label: "Arc 1960 / UTM (use zone below)" },
  { value: "custom", label: "Custom Proj4 definition" },
];

function toDms(value: number, type: "lat" | "lng") {
  const direction = type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return `${degrees}° ${minutes}' ${seconds.toFixed(4)}" ${direction}`;
}

function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string) {
  const decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  return ["S", "W"].includes(direction.toUpperCase()) ? -decimal : decimal;
}

function getUtmZone(longitude: number) {
  return Math.floor((longitude + 180) / 6) + 1;
}

function getUtmBand(latitude: number) {
  const bands = "CDEFGHJKLMNPQRSTUVWX";
  if (latitude < -80 || latitude > 84) return "";
  return bands[Math.min(Math.floor((latitude + 80) / 8), bands.length - 1)];
}

function getWgs84UtmProjection(zone: number, hemisphere: string) {
  const south = hemisphere.toUpperCase() === "S" ? " +south" : "";
  return `+proj=utm +zone=${zone}${south} +datum=WGS84 +units=m +no_defs`;
}

function getArc1960UtmProjection(zone: number, hemisphere: string) {
  const south = hemisphere.toUpperCase() === "S" ? " +south" : "";
  return `+proj=utm +zone=${zone}${south} +a=6378249.145 +b=6356514.966398753 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs`;
}

function getInputProjection(inputCrs: CrsOption, customProj4: string, zone: number, hemisphere: string) {
  if (inputCrs === "custom") return customProj4.trim();
  if (inputCrs === "arc1960-utm") return getArc1960UtmProjection(zone, hemisphere);
  return getWgs84UtmProjection(zone, hemisphere);
}

function decimalToUtm(latitude: number, longitude: number) {
  const zone = getUtmZone(longitude);
  const hemisphere = latitude >= 0 ? "N" : "S";
  const [easting, northing] = proj4("WGS84", getWgs84UtmProjection(zone, hemisphere), [
    longitude,
    latitude,
  ]);

  return { easting, northing, zone, hemisphere, band: getUtmBand(latitude) };
}

function projectedToDecimal(easting: number, northing: number, inputProjection: string) {
  const [longitude, latitude] = proj4(inputProjection, "WGS84", [easting, northing]);
  return { latitude, longitude };
}

function isValidLatLng(latitude: number, longitude: number) {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function isNormalUtmEasting(easting: number) {
  return easting >= 100000 && easting <= 900000;
}

function numberValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  if (Number.isFinite(parsed)) return parsed;

  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return null;

  const matchedValue = Number(match[0]);
  return Number.isFinite(matchedValue) ? matchedValue : null;
}

function offsetValue(value: string) {
  return numberValue(value) ?? 0;
}

function normalizeColumnName(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

function getValue(row: BulkRow, keys: string[]) {
  const normalized = Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[normalizeColumnName(key)] = value;
    return acc;
  }, {});

  for (const key of keys) {
    const value = normalized[normalizeColumnName(key)];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return null;
}

function rowsToCsv(rows: ConvertedRow[]) {
  const headers = [
    "input",
    "id",
    "latitude",
    "longitude",
    "dmsLatitude",
    "dmsLongitude",
    "rawEasting",
    "rawNorthing",
    "correctedEasting",
    "correctedNorthing",
    "zone",
    "band",
    "hemisphere",
    "elevation",
    "error",
  ];

  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  return [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.input,
        row.id,
        row.latitude,
        row.longitude,
        row.dmsLatitude,
        row.dmsLongitude,
        row.rawEasting,
        row.rawNorthing,
        row.easting,
        row.northing,
        row.zone,
        row.band,
        row.hemisphere,
        row.elevation,
        row.error,
      ]
        .map(escape)
        .join(",")
    ),
  ].join("\n");
}

export default function CoordinatesConverterPage() {
  const [mode, setMode] = useState<Mode>("dd-to-dms");
  const [bulkType, setBulkType] = useState<BulkType>("decimal-to-dms-utm");

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [latD, setLatD] = useState("");
  const [latM, setLatM] = useState("");
  const [latS, setLatS] = useState("");
  const [latDir, setLatDir] = useState("S");

  const [lngD, setLngD] = useState("");
  const [lngM, setLngM] = useState("");
  const [lngS, setLngS] = useState("");
  const [lngDir, setLngDir] = useState("E");

  const [singleD, setSingleD] = useState("");
  const [singleM, setSingleM] = useState("");
  const [singleS, setSingleS] = useState("");
  const [singleDir, setSingleDir] = useState("N");

  const [easting, setEasting] = useState("");
  const [northing, setNorthing] = useState("");
  const [zone, setZone] = useState("37");
  const [hemisphere, setHemisphere] = useState("S");
  const [eastingOffset, setEastingOffset] = useState("0");
  const [northingOffset, setNorthingOffset] = useState("0");

  const [inputCrs, setInputCrs] = useState<CrsOption>("wgs84-utm");
  const [customProj4, setCustomProj4] = useState(
    "+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs"
  );

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRows, setBulkRows] = useState<ConvertedRow[]>([]);
  const [bulkError, setBulkError] = useState("");

  const result = useMemo(() => {
    if (mode === "dd-to-dms") {
      const latNumber = numberValue(lat);
      const lngNumber = numberValue(lng);

      if (!lat || !lng) return "";
      if (latNumber === null || lngNumber === null) return "Enter valid latitude and longitude numbers.";
      if (!isValidLatLng(latNumber, lngNumber)) return "Latitude must be -90 to 90 and longitude must be -180 to 180.";

      const utm = decimalToUtm(latNumber, lngNumber);

      return [
        `Latitude DMS: ${toDms(latNumber, "lat")}`,
        `Longitude DMS: ${toDms(lngNumber, "lng")}`,
        `UTM Zone: ${utm.zone}${utm.hemisphere}`,
        `UTM Band: ${utm.band}`,
        `Easting: ${utm.easting.toFixed(3)}`,
        `Northing: ${utm.northing.toFixed(3)}`,
      ].join("\n");
    }

    if (mode === "dms-to-dd") {
      const degrees = numberValue(singleD);
      const minutes = numberValue(singleM);
      const seconds = numberValue(singleS);

      if (!singleD || !singleM || !singleS) return "";
      if (degrees === null || minutes === null || seconds === null) return "Enter valid DMS numbers.";
      if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return "Minutes and seconds must be between 0 and 59.";

      return dmsToDecimal(degrees, minutes, seconds, singleDir).toFixed(8);
    }

    if (mode === "dms-to-utm") {
      if (!latD || !latM || !latS || !lngD || !lngM || !lngS) return "";

      const latDeg = numberValue(latD);
      const latMin = numberValue(latM);
      const latSec = numberValue(latS);
      const lngDeg = numberValue(lngD);
      const lngMin = numberValue(lngM);
      const lngSec = numberValue(lngS);

      if (latDeg === null || latMin === null || latSec === null || lngDeg === null || lngMin === null || lngSec === null) {
        return "Enter valid DMS values.";
      }

      const latitude = dmsToDecimal(latDeg, latMin, latSec, latDir);
      const longitude = dmsToDecimal(lngDeg, lngMin, lngSec, lngDir);

      if (!isValidLatLng(latitude, longitude)) return "Converted latitude or longitude is outside valid range.";

      const utm = decimalToUtm(latitude, longitude);

      return [
        `Latitude: ${latitude.toFixed(8)}`,
        `Longitude: ${longitude.toFixed(8)}`,
        `UTM Zone: ${utm.zone}${utm.hemisphere}`,
        `UTM Band: ${utm.band}`,
        `Easting: ${utm.easting.toFixed(3)}`,
        `Northing: ${utm.northing.toFixed(3)}`,
      ].join("\n");
    }

    if (mode === "utm-to-dms") {
      const e = numberValue(easting);
      const n = numberValue(northing);
      const z = numberValue(zone);

      if (!easting || !northing || !zone) return "";
      if (e === null || n === null || z === null || z <= 0) return "Enter valid UTM values.";

      const correctedEasting = e - offsetValue(eastingOffset);
      const correctedNorthing = n - offsetValue(northingOffset);

      if (inputCrs !== "custom" && !isNormalUtmEasting(correctedEasting)) {
        return "Corrected easting is outside the normal UTM range. Check source CRS, offset, or use Custom Proj4.";
      }

      const decimal = projectedToDecimal(
        correctedEasting,
        correctedNorthing,
        getInputProjection(inputCrs, customProj4, z, hemisphere)
      );

      if (!isValidLatLng(decimal.latitude, decimal.longitude)) {
        return "Converted coordinate is outside valid latitude/longitude range.";
      }

      return [
        `Latitude: ${decimal.latitude.toFixed(8)}`,
        `Longitude: ${decimal.longitude.toFixed(8)}`,
        `Latitude DMS: ${toDms(decimal.latitude, "lat")}`,
        `Longitude DMS: ${toDms(decimal.longitude, "lng")}`,
        `Raw Easting: ${e.toFixed(3)}`,
        `Raw Northing: ${n.toFixed(3)}`,
        `Corrected Easting: ${correctedEasting.toFixed(3)}`,
        `Corrected Northing: ${correctedNorthing.toFixed(3)}`,
      ].join("\n");
    }

    return "";
  }, [
    mode,
    lat,
    lng,
    singleD,
    singleM,
    singleS,
    singleDir,
    latD,
    latM,
    latS,
    latDir,
    lngD,
    lngM,
    lngS,
    lngDir,
    easting,
    northing,
    zone,
    hemisphere,
    eastingOffset,
    northingOffset,
    inputCrs,
    customProj4,
  ]);

  useEffect(() => {
    if (mode !== "bulk-file" || !bulkFile) return;
    void processBulkFile(bulkFile);
  }, [mode, bulkFile, bulkType, inputCrs, customProj4, zone, hemisphere, eastingOffset, northingOffset]);

  async function processBulkFile(file: File) {
    setBulkError("");
    setBulkRows([]);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<BulkRow>(sheet, { defval: "" });

      if (rows.length === 0) {
        setBulkError("The file does not contain any data rows.");
        return;
      }

      setBulkRows(
        rows.map<ConvertedRow>((row, index) => {
          try {
            const id = getValue(row, ["id", "name", "point", "pointid", "point_id", "well"]);
            const elevation = getValue(row, ["elevation", "height", "z", "rl"]);

            if (bulkType === "utm-to-dms") {
              const e = numberValue(getValue(row, ["easting", "east", "eastx", "x"]));
              const n = numberValue(getValue(row, ["northing", "north", "northy", "y"]));
              const rowZone = numberValue(getValue(row, ["zone", "utmzone", "utm_zone"]));
              const defaultZone = numberValue(zone);
              const selectedZone = rowZone !== null && rowZone > 0 ? rowZone : defaultZone;
              const selectedHemisphereRaw = String(getValue(row, ["hemisphere", "hemi", "hem"]) || hemisphere).toUpperCase();
              const selectedHemisphere = selectedHemisphereRaw === "N" ? "N" : "S";

              if (e === null || n === null || selectedZone === null || selectedZone <= 0) {
                throw new Error("Missing easting, northing or UTM zone.");
              }

              const correctedEasting = e - offsetValue(eastingOffset);
              const correctedNorthing = n - offsetValue(northingOffset);

              if (inputCrs !== "custom" && !isNormalUtmEasting(correctedEasting)) {
                throw new Error("Corrected easting is outside the normal UTM range. Check source CRS, offset, or use Custom Proj4.");
              }

              const decimal = projectedToDecimal(
                correctedEasting,
                correctedNorthing,
                getInputProjection(inputCrs, customProj4, selectedZone, selectedHemisphere)
              );

              if (!isValidLatLng(decimal.latitude, decimal.longitude)) {
                throw new Error("Converted coordinate is outside valid latitude/longitude range.");
              }

              return {
                input: `Row ${index + 2}`,
                id: id ? String(id) : "",
                latitude: decimal.latitude.toFixed(8),
                longitude: decimal.longitude.toFixed(8),
                dmsLatitude: toDms(decimal.latitude, "lat"),
                dmsLongitude: toDms(decimal.longitude, "lng"),
                rawEasting: e.toFixed(3),
                rawNorthing: n.toFixed(3),
                easting: correctedEasting.toFixed(3),
                northing: correctedNorthing.toFixed(3),
                zone: String(selectedZone),
                band: getUtmBand(decimal.latitude),
                hemisphere: selectedHemisphere,
                elevation: elevation ? String(elevation) : "",
              };
            }

            let latitude: number;
            let longitude: number;

            if (bulkType === "dms-to-utm") {
              const latDeg = numberValue(getValue(row, ["latdeg", "lat_deg", "latitude_degree"]));
              const latMin = numberValue(getValue(row, ["latmin", "lat_min", "latitude_minute"]));
              const latSec = numberValue(getValue(row, ["latsec", "lat_sec", "latitude_second"]));
              const latDirection = String(getValue(row, ["latdir", "lat_dir", "latitude_direction"]) || "S");

              const lngDeg = numberValue(getValue(row, ["lngdeg", "londeg", "longdeg", "lng_deg", "lon_deg"]));
              const lngMin = numberValue(getValue(row, ["lngmin", "lonmin", "longmin", "lng_min", "lon_min"]));
              const lngSec = numberValue(getValue(row, ["lngsec", "lonsec", "longsec", "lng_sec", "lon_sec"]));
              const lngDirection = String(getValue(row, ["lngdir", "londir", "longdir", "lng_dir", "lon_dir"]) || "E");

              if (latDeg === null || latMin === null || latSec === null || lngDeg === null || lngMin === null || lngSec === null) {
                throw new Error("Missing DMS columns.");
              }

              latitude = dmsToDecimal(latDeg, latMin, latSec, latDirection);
              longitude = dmsToDecimal(lngDeg, lngMin, lngSec, lngDirection);
            } else {
              const latValue = numberValue(getValue(row, ["latitude", "lat"]));
              const lngValue = numberValue(getValue(row, ["longitude", "lng", "lon", "long"]));

              if (latValue === null || lngValue === null) {
                throw new Error("Missing latitude or longitude.");
              }

              latitude = latValue;
              longitude = lngValue;
            }

            if (!isValidLatLng(latitude, longitude)) {
              throw new Error("Invalid latitude or longitude range.");
            }

            const utm = decimalToUtm(latitude, longitude);

            return {
              input: `Row ${index + 2}`,
              id: id ? String(id) : "",
              latitude: latitude.toFixed(8),
              longitude: longitude.toFixed(8),
              dmsLatitude: toDms(latitude, "lat"),
              dmsLongitude: toDms(longitude, "lng"),
              easting: utm.easting.toFixed(3),
              northing: utm.northing.toFixed(3),
              zone: String(utm.zone),
              band: utm.band,
              hemisphere: utm.hemisphere,
              elevation: elevation ? String(elevation) : "",
            };
          } catch (error) {
            return {
              input: `Row ${index + 2}`,
              error: error instanceof Error ? error.message : "Unable to convert row.",
            };
          }
        })
      );
    } catch {
      setBulkError("Unable to read file. Please upload a valid CSV or Excel file.");
    }
  }

  async function copyResult() {
    if (result) await navigator.clipboard.writeText(result);
  }

  function clearFields() {
    setLat("");
    setLng("");
    setLatD("");
    setLatM("");
    setLatS("");
    setLatDir("S");
    setLngD("");
    setLngM("");
    setLngS("");
    setLngDir("E");
    setSingleD("");
    setSingleM("");
    setSingleS("");
    setSingleDir("N");
    setEasting("");
    setNorthing("");
    setZone("37");
    setHemisphere("S");
    setEastingOffset("0");
    setNorthingOffset("0");
    setInputCrs("wgs84-utm");
    setCustomProj4("+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs");
    setBulkFile(null);
    setBulkRows([]);
    setBulkError("");
  }

  function downloadCsv() {
    const blob = new Blob([rowsToCsv(bulkRows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "converted-coordinates.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to Home
        </Link>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">GIS Utility</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Coordinates Converter</h1>
          <p className="mt-3 max-w-3xl text-gray-600">
            Convert coordinates between Decimal Degrees, DMS and UTM. Upload CSV or Excel files for bulk conversion.
          </p>
<div className="mt-8 border-y border-gray-200 py-8">
  <div className="text-center">
    <h2 className="text-2xl font-bold text-gray-900">
      How Coordinates Converter Works
    </h2>

    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
      Convert single coordinates or bulk CSV/Excel files by selecting the
      correct coordinate format, projection, UTM zone and hemisphere.
    </p>
  </div>

  <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
    {[
      {
        step: "01",
        title: "Choose Mode",
        text:
          "Select Decimal, DMS, UTM or CSV/Excel bulk conversion depending on your source data.",
      },
      {
        step: "02",
        title: "Enter Data",
        text:
          "Type coordinates manually or upload a CSV/Excel file with latitude, longitude, easting or northing columns.",
      },
      {
        step: "03",
        title: "Set Projection",
        text:
          "Choose the correct CRS, UTM zone and hemisphere. Use offsets only for local grid coordinates.",
      },
      {
        step: "04",
        title: "Convert",
        text:
          "Review the converted results instantly, then copy the output or download the converted CSV file.",
      },
    ].map((item) => (
      <div
        key={item.step}
        className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
          {item.step}
        </div>

        <h3 className="mt-4 text-lg font-bold text-gray-900">
          {item.title}
        </h3>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {item.text}
        </p>
      </div>
    ))}
  </div>

  <div className="mt-6 rounded-xl bg-blue-50 px-5 py-4 text-sm leading-6 text-gray-700">
    <strong className="text-gray-900">Important:</strong>{" "}
    For standard UTM coordinates, keep offsets at 0. Use Easting Offset or
    Northing Offset only when your source data uses a local grid value, for
    example easting 1132556 that should be converted as 232556 after subtracting
    900000.
  </div>
</div>
          
          <div className="mt-8 flex flex-wrap gap-3">
            {modes.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMode(item.key)}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${
                  mode === item.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === "dd-to-dms" && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Latitude" value={lat} setValue={setLat} placeholder="-6.7924" />
              <Field label="Longitude" value={lng} setValue={setLng} placeholder="39.2083" />
            </div>
          )}

          {mode === "dms-to-dd" && (
            <DmsSingleForm
              d={singleD}
              m={singleM}
              s={singleS}
              dir={singleDir}
              setD={setSingleD}
              setM={setSingleM}
              setS={setSingleS}
              setDir={setSingleDir}
            />
          )}

          {mode === "dms-to-utm" && (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <DmsPairForm title="Latitude" d={latD} m={latM} s={latS} dir={latDir} directions={["N", "S"]} setD={setLatD} setM={setLatM} setS={setLatS} setDir={setLatDir} />
              <DmsPairForm title="Longitude" d={lngD} m={lngM} s={lngS} dir={lngDir} directions={["E", "W"]} setD={setLngD} setM={setLngM} setS={setLngS} setDir={setLngDir} />
            </div>
          )}

          {mode === "utm-to-dms" && (
            <div className="mt-6 space-y-5">
              <ProjectionFields inputCrs={inputCrs} setInputCrs={setInputCrs} customProj4={customProj4} setCustomProj4={setCustomProj4} />

              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Easting" value={easting} setValue={setEasting} placeholder="324570" />
                <Field label="Northing" value={northing} setValue={setNorthing} placeholder="9628362" />
                <Field label="Zone" value={zone} setValue={setZone} placeholder="37" />
                <SelectField label="Hemisphere" value={hemisphere} setValue={setHemisphere} options={["N", "S"]} />
              </div>

              <OffsetFields eastingOffset={eastingOffset} northingOffset={northingOffset} setEastingOffset={setEastingOffset} setNorthingOffset={setNorthingOffset} />
            </div>
          )}

          {mode === "bulk-file" && (
            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Bulk conversion type</span>
                <select value={bulkType} onChange={(event) => setBulkType(event.target.value as BulkType)} className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3">
                  <option value="decimal-to-dms-utm">Decimal latitude/longitude to DMS and UTM</option>
                  <option value="dms-to-utm">DMS columns to UTM</option>
                  <option value="utm-to-dms">UTM columns to Decimal and DMS</option>
                </select>
              </label>

              {bulkType === "utm-to-dms" && (
                <>
                  <ProjectionFields inputCrs={inputCrs} setInputCrs={setInputCrs} customProj4={customProj4} setCustomProj4={setCustomProj4} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Default UTM Zone" value={zone} setValue={setZone} placeholder="37" />
                    <SelectField label="Default Hemisphere" value={hemisphere} setValue={setHemisphere} options={["N", "S"]} />
                  </div>

                  <OffsetFields eastingOffset={eastingOffset} northingOffset={northingOffset} setEastingOffset={setEastingOffset} setNorthingOffset={setNorthingOffset} />
                </>
              )}

              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3"
              />

              <p className="text-sm text-gray-600">
                Columns accepted: latitude/longitude, lat/lng, easting/northing, east/north, or x/y. Column z is kept as elevation. Offsets are subtracted before UTM conversion.
              </p>

              {bulkError && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{bulkError}</p>}
            </div>
          )}

          {mode !== "bulk-file" && (
            <>
              <div className="mt-6 rounded-md bg-gray-900 p-4 text-white">
                <p className="text-sm font-semibold text-gray-300">Result</p>
                <pre className="mt-2 whitespace-pre-wrap text-lg">{result || "Enter coordinates to see the result."}</pre>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={copyResult} disabled={!result} className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                  Copy Result
                </button>
                <button type="button" onClick={clearFields} className="rounded-md bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700">
                  Clear
                </button>
              </div>
            </>
          )}

          {mode === "bulk-file" && bulkRows.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-900">Converted Results</h2>
                <button type="button" onClick={downloadCsv} className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
                  Download CSV
                </button>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Input", "ID", "Latitude", "Longitude", "DMS Latitude", "DMS Longitude", "Raw Easting", "Raw Northing", "Corrected Easting", "Corrected Northing", "Zone", "Band", "Hemisphere", "Elevation", "Error"].map((header) => (
                        <th key={header} className="px-4 py-3 text-left font-semibold text-gray-700">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {bulkRows.map((row) => (
                      <tr key={row.input}>
                        {[row.input, row.id, row.latitude, row.longitude, row.dmsLatitude, row.dmsLongitude, row.rawEasting, row.rawNorthing, row.easting, row.northing, row.zone, row.band, row.hemisphere, row.elevation, row.error].map((value, index) => (
                          <td key={index} className="whitespace-nowrap px-4 py-3 text-gray-700">{value || ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

<div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5 text-center">
  <h2 className="text-xl font-bold text-gray-900">
    Support This Free Tool
  </h2>

  <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600">
    If this coordinates converter helps your GIS, survey or mapping work,
    you can support DocMaster AI so we can keep improving free tools.
  </p>

  <a
    href="mailto:yoelngusulu@gmail.com?subject=Support%20DocMaster%20AI"
    className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
  >
    Donate / Support
  </a>
</div>

      </div>
    </main>
  );
}

function Field({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3" />
    </label>
  );
}

function SelectField({ label, value, setValue, options }: { label: string; value: string; setValue: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <select value={value} onChange={(event) => setValue(event.target.value)} className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ProjectionFields({ inputCrs, setInputCrs, customProj4, setCustomProj4 }: { inputCrs: CrsOption; setInputCrs: (value: CrsOption) => void; customProj4: string; setCustomProj4: (value: string) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Input CRS / Projection</span>
        <select value={inputCrs} onChange={(event) => setInputCrs(event.target.value as CrsOption)} className="mt-2 w-full rounded-md border border-gray-300 px-4 py-3">
          {crsOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      {inputCrs === "custom" && (
        <Field label="Custom Proj4" value={customProj4} setValue={setCustomProj4} placeholder="+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs" />
      )}
    </div>
  );
}

function OffsetFields({ eastingOffset, northingOffset, setEastingOffset, setNorthingOffset }: { eastingOffset: string; northingOffset: string; setEastingOffset: (value: string) => void; setNorthingOffset: (value: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Easting Offset" value={eastingOffset} setValue={setEastingOffset} placeholder="0" />
        <Field label="Northing Offset" value={northingOffset} setValue={setNorthingOffset} placeholder="0" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setEastingOffset("900000"); setNorthingOffset("0"); }} className="rounded-md bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
          Use 900000 Easting Offset
        </button>
        <button type="button" onClick={() => { setEastingOffset("0"); setNorthingOffset("0"); }} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
          Reset Offsets
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Use 0 for standard UTM. Use 900000 only when the source grid stores easting with that offset.
      </p>
    </div>
  );
}

function DmsSingleForm(props: { d: string; m: string; s: string; dir: string; setD: (value: string) => void; setM: (value: string) => void; setS: (value: string) => void; setDir: (value: string) => void }) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-4">
      <Field label="Degrees" value={props.d} setValue={props.setD} placeholder="6" />
      <Field label="Minutes" value={props.m} setValue={props.setM} placeholder="47" />
      <Field label="Seconds" value={props.s} setValue={props.setS} placeholder="32.64" />
      <SelectField label="Direction" value={props.dir} setValue={props.setDir} options={["N", "S", "E", "W"]} />
    </div>
  );
}

function DmsPairForm(props: { title: string; d: string; m: string; s: string; dir: string; directions: string[]; setD: (value: string) => void; setM: (value: string) => void; setS: (value: string) => void; setDir: (value: string) => void }) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <h2 className="font-semibold text-gray-900">{props.title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Degrees" value={props.d} setValue={props.setD} placeholder="6" />
        <Field label="Minutes" value={props.m} setValue={props.setM} placeholder="47" />
        <Field label="Seconds" value={props.s} setValue={props.setS} placeholder="32.64" />
        <SelectField label="Direction" value={props.dir} setValue={props.setDir} options={props.directions} />
      </div>
      <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
  <h2 className="text-2xl font-bold text-gray-900">
    Support This Free GIS Tool
  </h2>

  <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-700">
    If this coordinate converter helps your GIS, survey or mapping work,
    you can support DocMaster AI so we can keep improving free tools for
    more users.
  </p>

  <div className="mt-5">
    <a
      href="mailto:yoelngusulu@gmail.com?subject=Support%20DocMaster%20AI"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
    >
      Donate to Support
    </a>
  </div>
</div>
    </div>
  );
}