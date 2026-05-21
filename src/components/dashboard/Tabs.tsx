"use client";

export function Tabs({
  tabs,
  value,
  onChange
}: {
  tabs: Array<{ id: string; label: string }>;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
            value === tab.id ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
