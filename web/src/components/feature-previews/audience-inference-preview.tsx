"use client";

import { useState } from "react";
import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";

type Profile = {
  name: string;
  age: string;
  tone: string[];
  platforms: string[];
  summary: string;
};

const PROFILES: Profile[] = [
  {
    name: "Meliva",
    age: "25–44",
    tone: ["Confident", "Helpful", "Promotional"],
    platforms: ["Meta", "Google", "LinkedIn"],
    summary: "Health-conscious professionals seeking trusted dental care with clear pricing.",
  },
  {
    name: "Nike",
    age: "18–34",
    tone: ["Bold", "Aspirational", "Performance-driven"],
    platforms: ["Meta", "TikTok", "YouTube"],
    summary: "Active lifestyle audience motivated by athlete stories and limited drops.",
  },
];

export function AudienceInferencePreview() {
  const [index, setIndex] = useState(0);
  const profile = PROFILES[index] ?? PROFILES[0];

  return (
    <PreviewGlassPanel>
      <div className="flex gap-2">
        {PROFILES.map((p, i) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setIndex(i)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              index === i ? "bg-[#4a7fa5] text-white" : "bg-white/60 text-gray-600"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-white/75 bg-white/55 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Inferred audience</p>
        <p className="mt-2 text-xs font-semibold text-[#1a1a1a]">Age range: {profile.age}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {profile.tone.map((t) => (
            <span key={t} className="rounded-full bg-[#4a7fa5]/10 px-2 py-0.5 text-[10px] font-semibold text-[#4a7fa5]">
              {t}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-gray-600">
          Primary platforms: <span className="font-semibold text-[#1a1a1a]">{profile.platforms.join(", ")}</span>
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{profile.summary}</p>
      </div>
    </PreviewGlassPanel>
  );
}
