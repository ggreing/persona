"use client";
import { useEffect, useState } from "react";

export default function ScenarioSelect() {
  const [options, setOptions] = useState<{ [k: string]: string }>({});
  const [selected, setSelected] = useState("intro_meeting");

  useEffect(() => {
    fetch("/api/scenarios")
      .then((res) => res.json())
      .then(setOptions);
  }, []);

  useEffect(() => {
    console.log("선택된 시나리오:", selected);
  }, [selected]);

  return (
    <select
      className="border rounded-md px-3 py-1 text-sm"
      value={selected}
      onChange={(e) => setSelected(e.target.value)}
    >
      {Object.entries(options).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </select>
  );
}