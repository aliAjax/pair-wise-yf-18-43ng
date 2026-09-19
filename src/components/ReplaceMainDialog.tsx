import { useMemo, useState } from "react";
import type { Gem, Order } from "../types";
import { gemBlockReason, isMainClarity, planReplaceMain, sumCarat } from "../kit";

interface Props {
  order: Order;
  gems: Gem[];
  orders: Order[];
  initialMainId?: string;
  onConfirm: (newMainId: string, reason: string) => void;
  onCancel: () => void;
}

export default function ReplaceMainDialog({ order, gems, orders, initialMainId, onConfirm, onCancel }: Props) {
  const [newMainId, setNewMainId] = useState(initialMainId ?? "");
  const [reason, setReason] = useState("");
  const byId = useMemo(() => new Map(gems.map((g) => [g.id, g])), [gems]);

  const candidates = gems
    .filter((g) => g.id !== order.mainId && !order.accentIds.includes(g.id))
    .sort((a, b) => Number(isMainClarity(b)) - Number(isMainClarity(a)));

  const trial = newMainId ? planReplaceMain(order, newMainId, gems, orders) : null;
  const newMain = newMainId ? byId.get(newMainId) ?? null : null;

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="heading">
          <div>
            <p>更换主石</p>
            <h2>
              {order.id} · {order.name}
            </h2>
          </div>
          <button onClick={onCancel} aria-label="关闭">
            ✕
          </button>
        </div>

        <p className="modal-note">
          操作将先释放旧主石 {order.mainId ?? "（无）"}，放入新主石后复核整套；复核失败则保持原套件和原占用不变。
        </p>

        <label className="modal-field">
          <span>新主石（净度须 ≥ VS2，且未被其他订单占用 / 非缺检 / 无未确认缺陷）</span>
          <select value={newMainId} onChange={(e) => setNewMainId(e.target.value)}>
            <option value="">请选择候选宝石…</option>
            {candidates.map((g) => {
              const blocked = gemBlockReason(g, order.id, gems, orders);
              const disabled = blocked !== "none" || !isMainClarity(g);
              return (
                <option key={g.id} value={g.id} disabled={disabled}>
                  {g.id} · {g.kind} · {g.shape} · {g.carat}ct · 净度{g.clarity || "缺检"} · {g.color}
                  {blocked !== "none" ? `（不可选：${blocked === "occupied" ? "已属其他订单" : blocked === "uninspected" ? "缺检" : "缺陷未确认"}）` : !isMainClarity(g) ? "（净度不足）" : ""}
                </option>
              );
            })}
          </select>
        </label>

        <label className="modal-field">
          <span>更换原因（必填，写入审计记录）</span>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如：客户看石后要求升级颜色；旧主石腰棱发现缺口…"
          />
        </label>

        {newMain && (
          <div className={"trial-box " + (trial?.ok ? "ok" : "bad")}>
            <strong>
              复核结果（按先释放旧石 {order.mainId ?? "—"} 再放入 {newMain.id} 模拟）
            </strong>
            {trial && trial.ok ? (
              <p>
                通过：新主石 {newMain.clarity} ≥ VS2，整套合计{" "}
                {sumCarat([
                  newMain.carat,
                  ...order.accentIds.map((id) => byId.get(id)?.carat ?? 0),
                ]).toFixed(2)}
                ct，未超上限 {order.maxCarat.toFixed(2)}ct。确认后才会真正占用。
              </p>
            ) : (
              <ul>
                {trial?.issues.map((i) => (
                  <li key={i.code}>{i.text}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onCancel}>取消</button>
          <button
            className="primary"
            disabled={!newMainId || !reason.trim() || (trial !== null && !trial.ok)}
            onClick={() => onConfirm(newMainId, reason.trim())}
          >
            释放旧石并更换
          </button>
        </div>
      </div>
    </div>
  );
}
