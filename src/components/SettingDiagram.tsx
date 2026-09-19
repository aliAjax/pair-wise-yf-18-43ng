import type { Gem } from "../types";

interface Props {
  main: Gem | null;
  accents: Gem[];
  maxAccents: number;
}

/** 镶嵌位置示意图：中心主石位，外圈最多 8 个围石位 */
export default function SettingDiagram({ main, accents, maxAccents }: Props) {
  const slots = Array.from({ length: maxAccents }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / maxAccents;
    return {
      x: 110 + Math.cos(angle) * 68,
      y: 105 + Math.sin(angle) * 68,
      gem: accents[i] ?? null,
      index: i,
    };
  });

  return (
    <svg viewBox="0 0 220 210" className="diagram" role="img" aria-label="镶嵌位置示意图">
      <circle cx="110" cy="105" r="92" fill="none" stroke="var(--border)" strokeDasharray="3 4" />
      <circle cx="110" cy="105" r="74" fill="none" stroke="var(--border)" strokeWidth="1" />
      {slots.map((s) => (
        <g key={s.index}>
          <circle
            cx={s.x}
            cy={s.y}
            r="11"
            fill={s.gem ? "var(--secondary)" : "#eef2f7"}
            stroke={s.gem ? "var(--secondary)" : "var(--border)"}
          />
          <text
            x={s.x}
            y={s.y + 3.5}
            textAnchor="middle"
            fontSize="9"
            fill={s.gem ? "#fff" : "#94a3b8"}
          >
            {s.gem ? s.gem.id.replace("ST-", "") : s.index + 1}
          </text>
        </g>
      ))}
      <circle cx="110" cy="105" r="34" fill={main ? "var(--primary)" : "#f1f5f9"} stroke={main ? "var(--primary)" : "var(--border)"} />
      <text x="110" y="101" textAnchor="middle" fontSize="10" fill={main ? "#fff" : "#94a3b8"}>
        {main ? main.id : "主石位"}
      </text>
      {main && (
        <text x="110" y="115" textAnchor="middle" fontSize="9" fill="#ffe4ec">
          {main.carat.toFixed(2)}ct
        </text>
      )}
    </svg>
  );
}
