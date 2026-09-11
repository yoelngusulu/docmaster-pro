"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Droplets, Gauge, Sprout } from "lucide-react";

type Mode = "rainwater" | "pump" | "irrigation" | "dimensions";

const number = (value: string) => Math.max(0, Number(value) || 0);
const fmt = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);

export default function WaterStorageCalculatorPage() {
  const [mode, setMode] = useState<Mode>("rainwater");

  const [roofArea, setRoofArea] = useState("100");
  const [rainfall, setRainfall] = useState("800");
  const [runoff, setRunoff] = useState("0.85");
  const [people, setPeople] = useState("5");
  const [demand, setDemand] = useState("25");
  const [dryDays, setDryDays] = useState("120");
  const [safety, setSafety] = useState("20");

  const [flow, setFlow] = useState("4.5");
  const [pumpHours, setPumpHours] = useState("8");
  const [pumpDemand, setPumpDemand] = useState("30");
  const [reserveDays, setReserveDays] = useState("1");

  const [area, setArea] = useState("1");
  const [eto, setEto] = useState("5");
  const [kc, setKc] = useState("1.0");
  const [effectiveRain, setEffectiveRain] = useState("1");
  const [efficiency, setEfficiency] = useState("80");
  const [interval, setInterval] = useState("3");

  const [shape, setShape] = useState<"cylindrical" | "rectangular">("cylindrical");
  const [diameter, setDiameter] = useState("4");
  const [height, setHeight] = useState("3");
  const [length, setLength] = useState("5");
  const [width, setWidth] = useState("4");

  const result = useMemo(() => {
    if (mode === "rainwater") {
      const annualYieldM3 = (number(rainfall) * number(roofArea) * number(runoff)) / 1000;
      const dailyDemandL = number(people) * number(demand);
      const dryDemandM3 = (dailyDemandL * number(dryDays)) / 1000;
      const recommendedM3 = dryDemandM3 * (1 + number(safety) / 100);
      return {
        primary: recommendedM3,
        primaryLabel: "Recommended storage",
        rows: [
          ["Annual harvest potential", `${fmt(annualYieldM3)} m³`],
          ["Daily demand", `${fmt(dailyDemandL, 0)} L/day`],
          ["Dry-period demand", `${fmt(dryDemandM3)} m³`],
          ["Supply / storage ratio", recommendedM3 ? `${fmt(annualYieldM3 / recommendedM3)}×` : "—"],
        ],
      };
    }

    if (mode === "pump") {
      const dailySupply = number(flow) * number(pumpHours);
      const dailyDemand = number(pumpDemand);
      const reserve = dailyDemand * number(reserveDays);
      const deficit = Math.max(0, dailyDemand - dailySupply);
      return {
        primary: reserve,
        primaryLabel: "Reserve storage",
        rows: [
          ["Available supply", `${fmt(dailySupply)} m³/day`],
          ["Daily demand", `${fmt(dailyDemand)} m³/day`],
          ["Daily surplus / deficit", `${fmt(dailySupply - dailyDemand)} m³/day`],
          ["Unmet daily demand", `${fmt(deficit)} m³/day`],
        ],
      };
    }

    if (mode === "irrigation") {
      const etc = number(eto) * number(kc);
      const netDepth = Math.max(0, etc - number(effectiveRain));
      const grossDepth = number(efficiency) ? netDepth / (number(efficiency) / 100) : 0;
      const dailyVolume = grossDepth * number(area) * 10;
      const storage = dailyVolume * number(interval);
      return {
        primary: storage,
        primaryLabel: "Irrigation-cycle storage",
        rows: [
          ["Crop ET (ETc)", `${fmt(etc)} mm/day`],
          ["Net irrigation depth", `${fmt(netDepth)} mm/day`],
          ["Gross irrigation depth", `${fmt(grossDepth)} mm/day`],
          ["Gross water demand", `${fmt(dailyVolume)} m³/day`],
        ],
      };
    }

    const volume =
      shape === "cylindrical"
        ? Math.PI * Math.pow(number(diameter) / 2, 2) * number(height)
        : number(length) * number(width) * number(height);
    return {
      primary: volume,
      primaryLabel: "Tank volume",
      rows: [
        ["Capacity", `${fmt(volume)} m³`],
        ["Capacity", `${fmt(volume * 1000, 0)} litres`],
        ["Tank type", shape === "cylindrical" ? "Cylindrical" : "Rectangular"],
      ],
    };
  }, [mode, roofArea, rainfall, runoff, people, demand, dryDays, safety, flow, pumpHours, pumpDemand, reserveDays, area, eto, kc, effectiveRain, efficiency, interval, shape, diameter, height, length, width]);

  const modes = [
    { id: "rainwater" as const, label: "Rainwater Harvesting", icon: Droplets },
    { id: "pump" as const, label: "Borehole & Pump", icon: Gauge },
    { id: "irrigation" as const, label: "Irrigation Storage", icon: Sprout },
    { id: "dimensions" as const, label: "Tank Dimensions", icon: Calculator },
  ];

  const field = (label: string, value: string, setter: (v: string) => void, unit: string, step = "any") => (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input type="number" min="0" step={step} value={value} onChange={(e) => setter(e.target.value)} className="min-w-0 flex-1 px-4 py-3 outline-none" />
        <span className="flex items-center border-l border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">{unit}</span>
      </div>
    </label>
  );

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/tools/gis" className="text-sm font-semibold text-blue-600 hover:text-blue-700">← Back to YAJU Coordinates</Link>
        <div className="mt-5 max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">YAJU Engineering Tools</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-950 md:text-5xl">Water Storage & Tank Sizing Calculator</h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">Estimate storage for rainwater harvesting, borehole and pumping systems, irrigation demand, or calculate physical tank capacity.</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modes.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setMode(id)} className={`flex items-center gap-3 rounded-xl border p-4 text-left font-semibold transition ${mode === id ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"}`}>
              <Icon size={20} /> {label}
            </button>
          ))}
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-bold text-gray-900">Design inputs</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {mode === "rainwater" && <>
                {field("Catchment / roof area", roofArea, setRoofArea, "m²")}
                {field("Annual rainfall", rainfall, setRainfall, "mm")}
                {field("Runoff coefficient", runoff, setRunoff, "C")}
                {field("Number of users", people, setPeople, "people", "1")}
                {field("Water demand per person", demand, setDemand, "L/p/d")}
                {field("Dry period", dryDays, setDryDays, "days", "1")}
                {field("Storage safety allowance", safety, setSafety, "%")}
              </>}
              {mode === "pump" && <>
                {field("Source / pump flow rate", flow, setFlow, "m³/hr")}
                {field("Pumping hours", pumpHours, setPumpHours, "hr/day")}
                {field("Daily water demand", pumpDemand, setPumpDemand, "m³/day")}
                {field("Reserve storage", reserveDays, setReserveDays, "days")}
              </>}
              {mode === "irrigation" && <>
                {field("Irrigated area", area, setArea, "ha")}
                {field("Reference ET (ETo)", eto, setEto, "mm/day")}
                {field("Crop coefficient (Kc)", kc, setKc, "Kc")}
                {field("Effective rainfall", effectiveRain, setEffectiveRain, "mm/day")}
                {field("Irrigation efficiency", efficiency, setEfficiency, "%")}
                {field("Irrigation interval", interval, setInterval, "days", "1")}
              </>}
              {mode === "dimensions" && <>
                <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-gray-700">Tank shape</span><select value={shape} onChange={(e) => setShape(e.target.value as "cylindrical" | "rectangular")} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-blue-500"><option value="cylindrical">Cylindrical</option><option value="rectangular">Rectangular</option></select></label>
                {shape === "cylindrical" ? field("Diameter", diameter, setDiameter, "m") : <>{field("Length", length, setLength, "m")}{field("Width", width, setWidth, "m")}</>}
                {field("Water depth / height", height, setHeight, "m")}
              </>}
            </div>
          </section>

          <aside className="rounded-2xl bg-blue-600 p-6 text-white shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">Calculated result</p>
            <p className="mt-5 text-sm text-blue-100">{result.primaryLabel}</p>
            <div className="mt-1 text-4xl font-bold">{fmt(result.primary)} m³</div>
            <div className="mt-1 text-blue-100">{fmt(result.primary * 1000, 0)} litres</div>
            <div className="mt-7 space-y-3 border-t border-white/20 pt-5">
              {result.rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 text-sm"><span className="text-blue-100">{label}</span><strong className="text-right">{value}</strong></div>)}
            </div>
          </aside>
        </div>

        <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <strong>Engineering note:</strong> This calculator provides preliminary sizing estimates. Final tank and water-supply design should use site-specific rainfall, demand, source-yield, operating-pattern, crop and hydraulic data and should be checked against applicable engineering standards.
        </section>
      </div>
    </main>
  );
}
