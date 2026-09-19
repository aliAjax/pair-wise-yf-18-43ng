import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import {
  MAX_SIDE_STONES,
  MIN_MAIN_CLARITY,
  buildOccupancy,
  clarityAtLeast,
  gemBlockers,
  kitCarat,
  validateKit,
  type Gem,
  type Kit,
  type KitEvent,
  type Order,
} from "./domain";
import { seedState } from "./seed";
import { clearState, loadState, saveState, type PersistedState } from "./storage";

const EMPTY_KIT: Kit = {
  mainStoneId: null,
  sideStoneIds: [],
  locked: false,
  lockedAt: null,
};

let eventSeq = 0;

function makeEvent(
  orderId: string,
  type: KitEvent["type"],
  ok: boolean,
  reason: string,
  detail: string
): KitEvent {
  eventSeq += 1;
  return {
    id: `EV-${Date.now()}-${eventSeq}`,
    at: new Date().toISOString(),
    orderId,
    type,
    ok,
    reason,
    detail,
  };
}

const EVENT_LABEL: Record<KitEvent["type"], string> = {
  lock: "锁定",
  unlock: "解锁",
  replace: "更换主石",
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("zh-CN", { hour12: false });
}

function fmtCt(n: number): string {
  return `${n.toFixed(2)}ct`;
}

/** 镶嵌位置示意图：中间主石位，外圈 8 个围石位 */
function SettingDiagram({
  kit,
  gemsById,
}: {
  kit: Kit;
  gemsById: Record<string, Gem>;
}) {
  const pts = Array.from({ length: MAX_SIDE_STONES }, (_, i) => {
    const angle = (Math.PI * 2 * i) / MAX_SIDE_STONES - Math.PI / 2;
    return { x: 110 + 76 * Math.cos(angle), y: 110 + 76 * Math.sin(angle) };
  });
  return (
    <svg viewBox="0 0 220 220" className="setting-diagram" role="img" aria-label="镶嵌位置示意图">
      {pts.map((p, i) => {
        const gid = kit.sideStoneIds[i];
        const gem = gid ? gemsById[gid] : undefined;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={13} className={gid ? "filled side" : "empty"}>
              <title>
                {gid && gem
                  ? `围石位 ${i + 1}：${gid} · ${gem.kind} ${fmtCt(gem.carat)}`
                  : `围石位 ${i + 1}（空）`}
              </title>
            </circle>
            <text x={p.x} y={p.y + 4} textAnchor="middle" className={gid ? "slot-label on" : "slot-label"}>
              {i + 1}
            </text>
          </g>
        );
      })}
      <circle cx={110} cy={110} r={30} className={kit.mainStoneId ? "filled main" : "empty"}>
        <title>{kit.mainStoneId ? `主石 ${kit.mainStoneId}` : "主石位（空）"}</title>
      </circle>
      <text x={110} y={115} textAnchor="middle" className={kit.mainStoneId ? "slot-label on" : "slot-label"}>
        主石
      </text>
    </svg>
  );
}

function StoneChip({
  gem,
  locked,
  onRemove,
}: {
  gem: Gem;
  locked: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="stone-chip">
      <b>{gem.id}</b>
      <span>
        {gem.kind} · {gem.shape} · {fmtCt(gem.carat)} · {gem.clarity} · {gem.color}
      </span>
      {!locked && (
        <button className="mini" onClick={onRemove}>
          移出
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<PersistedState>(() => loadState(seedState));
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [shapeFilter, setShapeFilter] = useState<string | null>(null);
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [replaceReason, setReplaceReason] = useState("");
  const [newOrderTitle, setNewOrderTitle] = useState("");
  const [newOrderLimit, setNewOrderLimit] = useState("3.00");

  // 锁定、解锁、更换原因与订单清单全部写入浏览器，刷新后继续
  useEffect(() => {
    saveState(state);
  }, [state]);

  const gemsById = useMemo(
    () => Object.fromEntries(state.gems.map((g) => [g.id, g])) as Record<string, Gem>,
    [state.gems]
  );
  const occupancy = useMemo(() => buildOccupancy(state.kits), [state.kits]);

  const order: Order =
    state.orders.find((o) => o.id === selectedOrderId) ??
    state.orders[0] ?? { id: "—", title: "暂无订单", caratLimit: 0 };
  const kit = state.kits[order.id] ?? EMPTY_KIT;

  // 切换订单时清理该订单的临时操作状态
  useEffect(() => {
    setReplaceTarget(null);
    setReplaceReason("");
    setUnlockReason("");
    setNotice(null);
  }, [order.id]);

  const problems = validateKit(order, kit, gemsById, occupancy, order.id);
  const totalCarat = kitCarat(kit, gemsById);
  const sideCarat = kit.sideStoneIds.reduce(
    (sum, id) => sum + (gemsById[id]?.carat ?? 0),
    0
  );
  const overLimit = totalCarat > order.caratLimit + 1e-9;

  const occupiedByOther = (gemId: string): string | null => {
    const holder = occupancy[gemId];
    return holder && holder !== order.id ? holder : null;
  };

  /** 围石需与已选围石保持形状、颜色一致 */
  const sideConsistency = (g: Gem): string | null => {
    if (kit.sideStoneIds.length === 0) return null;
    const first = gemsById[kit.sideStoneIds[0]];
    if (!first) return null;
    if (first.shape !== g.shape) return `形状需与已选围石一致（${first.shape}）`;
    if (first.color !== g.color) return `颜色需与已选围石一致（${first.color}）`;
    return null;
  };

  const updateKit = (next: Kit) => {
    setState((s) => ({ ...s, kits: { ...s.kits, [order.id]: next } }));
  };

  const handleSetMain = (gemId: string) => {
    updateKit({
      ...kit,
      mainStoneId: gemId,
      sideStoneIds: kit.sideStoneIds.filter((id) => id !== gemId),
    });
    setNotice(null);
  };

  const handleToggleSide = (gemId: string) => {
    if (kit.sideStoneIds.includes(gemId)) {
      updateKit({ ...kit, sideStoneIds: kit.sideStoneIds.filter((id) => id !== gemId) });
    } else if (kit.sideStoneIds.length < MAX_SIDE_STONES) {
      updateKit({ ...kit, sideStoneIds: [...kit.sideStoneIds, gemId] });
    }
  };

  const handleLock = () => {
    const probs = validateKit(order, kit, gemsById, occupancy, order.id);
    if (probs.length > 0) {
      setState((s) => ({
        ...s,
        events: [makeEvent(order.id, "lock", false, "", `锁定被拦截：${probs.join("；")}`), ...s.events],
      }));
      setNotice({ kind: "err", text: `锁定失败：${probs.join("；")}` });
      return;
    }
    const now = new Date().toISOString();
    setState((s) => ({
      ...s,
      kits: { ...s.kits, [order.id]: { ...kit, locked: true, lockedAt: now } },
      events: [
        makeEvent(
          order.id,
          "lock",
          true,
          "",
          `锁定主石 ${kit.mainStoneId}，围石 ${kit.sideStoneIds.length} 颗，总克拉 ${fmtCt(totalCarat)}`
        ),
        ...s.events,
      ],
    }));
    setNotice({ kind: "ok", text: `订单 ${order.id} 套件已锁定，宝石已被本订单占用。` });
  };

  const handleUnlock = () => {
    const reason = unlockReason.trim();
    setState((s) => ({
      ...s,
      kits: { ...s.kits, [order.id]: { ...kit, locked: false, lockedAt: null } },
      events: [
        makeEvent(
          order.id,
          "unlock",
          true,
          reason,
          `释放主石 ${kit.mainStoneId ?? "无"} 与围石 ${kit.sideStoneIds.length} 颗，宝石回到在库`
        ),
        ...s.events,
      ],
    }));
    setUnlockReason("");
    setNotice({ kind: "ok", text: `订单 ${order.id} 已解锁，占用已释放。` });
  };

  /** 更换主石：先释放旧石并复核整套，复核失败保持原套件和原占用 */
  const handleReplaceConfirm = () => {
    if (!replaceTarget) return;
    const reason = replaceReason.trim();
    if (!reason) {
      setNotice({ kind: "err", text: "请填写更换原因。" });
      return;
    }
    const oldMainId = kit.mainStoneId;
    // 1) 先释放旧主石：候选套件中旧主石不再占用
    const candidate: Kit = { ...kit, mainStoneId: replaceTarget };
    // 2) 复核整套：主石净度、围石一致性、总克拉、质检与占用状态
    const probs = validateKit(order, candidate, gemsById, occupancy, order.id);
    const target = gemsById[replaceTarget];
    if (probs.length > 0) {
      // 3) 复核失败：保持原套件和原占用，仅记录日志
      setState((s) => ({
        ...s,
        events: [
          makeEvent(
            order.id,
            "replace",
            false,
            reason,
            `拟以 ${replaceTarget} 替换 ${oldMainId}，复核失败，已保持原套件与原占用：${probs.join("；")}`
          ),
          ...s.events,
        ],
      }));
      setNotice({ kind: "err", text: `复核失败，已保持原套件与原占用：${probs.join("；")}` });
    } else {
      setState((s) => ({
        ...s,
        kits: { ...s.kits, [order.id]: candidate },
        events: [
          makeEvent(
            order.id,
            "replace",
            true,
            reason,
            `旧主石 ${oldMainId} 已释放回在库，${replaceTarget}（${target?.kind ?? ""} ${target ? fmtCt(target.carat) : ""}）锁定为新主石，整套复核通过`
          ),
          ...s.events,
        ],
      }));
      setNotice({ kind: "ok", text: `主石已更换为 ${replaceTarget}，旧主石 ${oldMainId} 已释放。` });
    }
    setReplaceTarget(null);
    setReplaceReason("");
  };

  const handleAddOrder = () => {
    const title = newOrderTitle.trim();
    const limit = parseFloat(newOrderLimit);
    if (!title) {
      setNotice({ kind: "err", text: "请填写订单名称。" });
      return;
    }
    if (!Number.isFinite(limit) || limit <= 0) {
      setNotice({ kind: "err", text: "克拉上限需为正数。" });
      return;
    }
    const nextNum =
      Math.max(1000, ...state.orders.map((o) => parseInt(o.id.replace(/\D/g, ""), 10) || 1000)) + 1;
    const id = `ORD-${nextNum}`;
    setState((s) => ({ ...s, orders: [...s.orders, { id, title, caratLimit: limit }] }));
    setSelectedOrderId(id);
    setNewOrderTitle("");
    setNotice({ kind: "ok", text: `订单 ${id} 已创建，可开始配套。` });
  };

  const handleMarkInspected = (gemId: string) => {
    setState((s) => ({
      ...s,
      gems: s.gems.map((g) => (g.id === gemId ? { ...g, inspected: true } : g)),
    }));
  };

  const handleConfirmDefect = (gemId: string) => {
    setState((s) => ({
      ...s,
      gems: s.gems.map((g) => (g.id === gemId ? { ...g, defectConfirmed: true } : g)),
    }));
  };

  const handleReset = () => {
    if (!window.confirm("确定清空浏览器中的配套记录并恢复示例数据吗？")) return;
    clearState();
    setState(seedState);
    setSelectedOrderId("");
    setNotice({ kind: "ok", text: "已恢复示例数据。" });
  };

  // —— 汇总指标 ——
  const lockedKits = state.orders
    .map((o) => state.kits[o.id])
    .filter((k): k is Kit => Boolean(k && k.locked));
  const lockedCarat = lockedKits.reduce((sum, k) => sum + kitCarat(k, gemsById), 0);
  const qcPending = state.gems.filter(
    (g) => !g.inspected || (g.defect && !g.defectConfirmed)
  ).length;
  const availableCount = state.gems.filter((g) => !occupancy[g.id]).length;

  const shapes = [...new Set(state.gems.map((g) => g.shape))];
  const batches = useMemo(() => {
    const map = new Map<string, { total: number; pending: number }>();
    for (const g of state.gems) {
      const b = map.get(g.batch) ?? { total: 0, pending: 0 };
      b.total += 1;
      if (!g.inspected || (g.defect && !g.defectConfirmed)) b.pending += 1;
      map.set(g.batch, b);
    }
    return [...map.entries()];
  }, [state.gems]);

  const visibleGems = state.gems.filter((g) => {
    if (shapeFilter && g.shape !== shapeFilter) return false;
    if (eligibleOnly) {
      const inKit = kit.mainStoneId === g.id || kit.sideStoneIds.includes(g.id);
      if (!inKit && gemBlockers(g, occupiedByOther(g.id)).length > 0) return false;
    }
    return true;
  });

  const metrics = [
    { label: "在库宝石", value: String(availableCount) },
    { label: "已锁定订单", value: String(lockedKits.length) },
    { label: "质检待办", value: String(qcPending) },
    { label: "已锁总克拉", value: lockedCarat.toFixed(2) },
  ];

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62006 · 源提示词8 · Port 62006</p>
        <h1>宝石分拣台 · 订单配套锁定</h1>
        <span>
          每个订单从在库宝石中锁定 1 颗主石（净度 ≥ {MIN_MAIN_CLARITY}）与最多 {MAX_SIDE_STONES} 颗围石
          （形状、颜色一致），总克拉不得超出订单上限；已属其他订单、缺检或缺陷未确认的宝石不能入套件。
          更换主石需先释放旧石并复核整套，复核失败自动保持原套件与原占用。锁定、解锁与更换原因均写入浏览器，刷新后继续。
        </span>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      {notice && <p className={`notice ${notice.kind}`}>{notice.text}</p>}

      <section className="workspace">
        <aside className="panel">
          <h2>形状筛选</h2>
          <div className="chips">
            <button className={shapeFilter === null ? "chip-on" : ""} onClick={() => setShapeFilter(null)}>
              全部
            </button>
            {shapes.map((s) => (
              <button
                key={s}
                className={shapeFilter === s ? "chip-on" : ""}
                onClick={() => setShapeFilter(shapeFilter === s ? null : s)}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="check-line">
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={(e) => setEligibleOnly(e.target.checked)}
            />
            仅看可入套件（当前订单）
          </label>

          <h3>分拣批次</h3>
          <div className="batch-list">
            {batches.map(([name, info]) => (
              <div className="batch-item" key={name}>
                <b>{name}</b>
                <span>
                  {info.total} 颗{info.pending > 0 ? ` · ${info.pending} 颗待质检` : " · 质检完成"}
                </span>
              </div>
            ))}
          </div>

          <h3>配套规则</h3>
          <ul className="rules">
            <li>主石 1 颗，净度 ≥ {MIN_MAIN_CLARITY}</li>
            <li>围石 ≤ {MAX_SIDE_STONES} 颗，形状颜色一致</li>
            <li>总克拉 ≤ 订单上限</li>
            <li>已属他单 / 缺检 / 缺陷未确认不可入套件</li>
            <li>更换主石先释放旧石并复核整套，失败保持原占用</li>
          </ul>
        </aside>

        <div className="main-col">
          <section className="panel">
            <div className="heading">
              <div>
                <p>订单清单（{state.orders.length}）</p>
                <h2>选择配套订单</h2>
              </div>
            </div>
            <div className="orders">
              {state.orders.map((o) => {
                const k = state.kits[o.id];
                const hasDraft = Boolean(k && (k.mainStoneId || k.sideStoneIds.length > 0));
                const status = k?.locked ? "已锁定" : hasDraft ? "配套中" : "未配套";
                return (
                  <button
                    key={o.id}
                    className={`order-card ${o.id === order.id ? "active" : ""}`}
                    onClick={() => setSelectedOrderId(o.id)}
                  >
                    <b>
                      {o.id}
                      <span className={`badge ${k?.locked ? "err" : hasDraft ? "warn" : "muted"}`}>{status}</span>
                    </b>
                    <span>{o.title}</span>
                    <small>
                      上限 {fmtCt(o.caratLimit)}
                      {hasDraft && k
                        ? ` · 主石 ${k.mainStoneId ?? "—"} · 围石 ${k.sideStoneIds.length} 颗 · ${fmtCt(kitCarat(k, gemsById))}`
                        : " · 尚未配套"}
                    </small>
                  </button>
                );
              })}
            </div>
            <div className="new-order">
              <input
                placeholder="新订单名称，如：赵女士 · 红宝石项链"
                value={newOrderTitle}
                onChange={(e) => setNewOrderTitle(e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="克拉上限"
                value={newOrderLimit}
                onChange={(e) => setNewOrderLimit(e.target.value)}
              />
              <button onClick={handleAddOrder}>新增订单</button>
            </div>
          </section>

          <section className="panel">
            <div className="heading">
              <div>
                <p>在库宝石 · 当前订单 {order.id}</p>
                <h2>
                  宝石分拣台（{visibleGems.length}/{state.gems.length}）
                </h2>
              </div>
            </div>
            <div className="table-wrap">
              <table className="gem-table">
                <thead>
                  <tr>
                    <th>编号</th>
                    <th>种类</th>
                    <th>形状 · 尺寸</th>
                    <th>克拉</th>
                    <th>净度</th>
                    <th>颜色</th>
                    <th>切工</th>
                    <th>镶嵌位置</th>
                    <th>批次</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGems.map((g) => {
                    const holder = occupancy[g.id];
                    const holderOther = holder && holder !== order.id ? holder : null;
                    const blockers = gemBlockers(g, holderOther);
                    const isMain = kit.mainStoneId === g.id;
                    const isSide = kit.sideStoneIds.includes(g.id);
                    const mainProblems = [
                      ...blockers,
                      ...(clarityAtLeast(g.clarity) ? [] : [`净度 ${g.clarity} 低于 ${MIN_MAIN_CLARITY}`]),
                      ...(g.carat + sideCarat > order.caratLimit + 1e-9
                        ? [`作为主石后总克拉 ${(g.carat + sideCarat).toFixed(2)} 超上限`]
                        : []),
                    ];
                    const consistency = sideConsistency(g);
                    const sideProblems = [
                      ...blockers,
                      ...(consistency ? [consistency] : []),
                      ...(kit.sideStoneIds.length >= MAX_SIDE_STONES
                        ? [`围石已满 ${MAX_SIDE_STONES} 颗`]
                        : []),
                      ...(totalCarat + g.carat > order.caratLimit + 1e-9
                        ? [`加入后总克拉 ${(totalCarat + g.carat).toFixed(2)} 超上限`]
                        : []),
                    ];
                    return (
                      <tr key={g.id} className={isMain || isSide ? "in-kit" : ""}>
                        <td><b>{g.id}</b></td>
                        <td>{g.kind}</td>
                        <td>{g.shape} · {g.size}</td>
                        <td>{fmtCt(g.carat)}</td>
                        <td>{g.clarity}</td>
                        <td>{g.color}</td>
                        <td>{g.cut}</td>
                        <td>{g.position}</td>
                        <td>{g.batch}</td>
                        <td className="status-cell">
                          <div className="badges">
                            {holder ? (
                              <span className="badge err">{holder === order.id ? "本单已锁" : `已属 ${holder}`}</span>
                            ) : (
                              <span className="badge ok">在库</span>
                            )}
                            {!g.inspected && <span className="badge warn">缺检</span>}
                            {g.defect && !g.defectConfirmed && <span className="badge warn">缺陷未确认</span>}
                            {g.defect && g.defectConfirmed && (
                              <span className="badge muted" title={g.defect}>缺陷已确认</span>
                            )}
                            {isMain && <span className="badge main">主石</span>}
                            {isSide && <span className="badge side">围石</span>}
                          </div>
                          {g.defect && <small className="defect-note">{g.defect}</small>}
                        </td>
                        <td>
                          <div className="actions">
                            {!isMain && !isSide && (
                              <button
                                className="mini primary-ghost"
                                disabled={mainProblems.length > 0}
                                title={
                                  mainProblems.join("；") ||
                                  (kit.locked ? "更换主石：先释放旧石并复核整套" : "设为主石")
                                }
                                onClick={() => {
                                  if (kit.locked) {
                                    setReplaceTarget(g.id);
                                    setReplaceReason("");
                                    setNotice(null);
                                  } else {
                                    handleSetMain(g.id);
                                  }
                                }}
                              >
                                {kit.locked ? "更换为主石" : "设为主石"}
                              </button>
                            )}
                            {isMain && !kit.locked && (
                              <button className="mini" onClick={() => updateKit({ ...kit, mainStoneId: null })}>
                                移出主石
                              </button>
                            )}
                            {!isMain && (
                              <button
                                className="mini"
                                disabled={kit.locked || (!isSide && sideProblems.length > 0)}
                                title={isSide ? "移出围石" : sideProblems.join("；") || "加入围石"}
                                onClick={() => handleToggleSide(g.id)}
                              >
                                {isSide ? "移出围石" : "加入围石"}
                              </button>
                            )}
                            {!g.inspected && (
                              <button className="mini warn-btn" onClick={() => handleMarkInspected(g.id)}>
                                补检
                              </button>
                            )}
                            {g.defect && !g.defectConfirmed && (
                              <button className="mini warn-btn" onClick={() => handleConfirmDefect(g.id)}>
                                确认缺陷
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      <section className="duo">
        <section className="panel">
          <div className="heading">
            <div>
              <p>
                订单 {order.id} · 总克拉上限 {fmtCt(order.caratLimit)}
              </p>
              <h2>
                配套方案{" "}
                {kit.locked ? (
                  <span className="badge err">已锁定</span>
                ) : (
                  <span className="badge muted">配套中（未锁定）</span>
                )}
              </h2>
            </div>
            {kit.locked && kit.lockedAt && <small className="hint">锁定于 {fmtTime(kit.lockedAt)}</small>}
          </div>

          <div className="kit-grid">
            <div>
              <SettingDiagram kit={kit} gemsById={gemsById} />
              <div className="carat-row">
                <div className="carat-bar">
                  <i
                    className={overLimit ? "over" : ""}
                    style={{ width: `${Math.min(100, (totalCarat / Math.max(order.caratLimit, 1e-9)) * 100)}%` }}
                  />
                </div>
                <small>
                  总克拉 {fmtCt(totalCarat)} / 上限 {fmtCt(order.caratLimit)}
                </small>
              </div>
            </div>
            <div>
              <p className="sub">主石（净度 ≥ {MIN_MAIN_CLARITY}）</p>
              {kit.mainStoneId && gemsById[kit.mainStoneId] ? (
                <StoneChip
                  gem={gemsById[kit.mainStoneId]}
                  locked={kit.locked}
                  onRemove={() => updateKit({ ...kit, mainStoneId: null })}
                />
              ) : (
                <div className="empty-slot">尚未选择主石，请在宝石表中点击「设为主石」</div>
              )}
              <p className="sub">
                围石（{kit.sideStoneIds.length}/{MAX_SIDE_STONES}，形状颜色需一致）
              </p>
              {kit.sideStoneIds.length > 0 ? (
                <div className="stone-list">
                  {kit.sideStoneIds.map((id) =>
                    gemsById[id] ? (
                      <StoneChip
                        key={id}
                        gem={gemsById[id]}
                        locked={kit.locked}
                        onRemove={() => handleToggleSide(id)}
                      />
                    ) : null
                  )}
                </div>
              ) : (
                <div className="empty-slot">尚未加入围石</div>
              )}
            </div>
          </div>

          {problems.length > 0 ? (
            <ul className="problems">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="ok-line">✓ 整套校验通过{kit.locked ? "，套件已锁定" : "，可执行锁定"}</p>
          )}

          <div className="kit-controls">
            {!kit.locked ? (
              <button className="primary" onClick={handleLock} disabled={problems.length > 0}>
                锁定套件（占用宝石）
              </button>
            ) : (
              <>
                <input
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="解锁原因（选填，将写入日志）"
                />
                <button onClick={handleUnlock}>解锁并释放宝石</button>
                <span className="hint">更换主石：在宝石表中点击「更换为主石」，需填写原因并复核整套</span>
              </>
            )}
          </div>

          {replaceTarget && kit.locked && (
            <div className="replace-bar">
              <p>
                将以 <b>{replaceTarget}</b> 替换主石 <b>{kit.mainStoneId}</b>
                ：旧主石先释放并复核整套，复核失败将保持原套件与原占用。
              </p>
              <div className="row">
                <input
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  placeholder="更换原因（必填，将写入日志）"
                />
                <button className="primary" onClick={handleReplaceConfirm}>
                  确认更换
                </button>
                <button
                  onClick={() => {
                    setReplaceTarget(null);
                    setReplaceReason("");
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>持久化于浏览器 localStorage</p>
              <h2>配套操作日志</h2>
            </div>
            <button onClick={handleReset}>恢复示例数据</button>
          </div>
          {state.events.length === 0 ? (
            <p className="empty">暂无锁定 / 解锁 / 更换记录</p>
          ) : (
            <div className="records log-list">
              {state.events.map((ev) => (
                <article key={ev.id}>
                  <b className={ev.ok ? "" : "fail"}>{EVENT_LABEL[ev.type]}</b>
                  <div>
                    <h3>
                      {ev.orderId} · {fmtTime(ev.at)}
                      {ev.ok ? "" : "（失败）"}
                    </h3>
                    <p>{ev.detail}</p>
                    {ev.reason && <p className="reason">原因：{ev.reason}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
