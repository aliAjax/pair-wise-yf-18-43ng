import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { AuditEntry, Gem, Order } from "./types";
import { loadState, resetState, saveState } from "./storage";
import { MAX_ACCENTS, makeAudit, planAddAccent, planReplaceMain, sumCarat, validateKit } from "./kit";
import OrderList from "./components/OrderList";
import OrderPanel from "./components/OrderPanel";
import GemInventory from "./components/GemInventory";
import AuditLog from "./components/AuditLog";
import ReasonDialog from "./components/ReasonDialog";
import ReplaceMainDialog from "./components/ReplaceMainDialog";

type Dialog =
  | { kind: "none" }
  | { kind: "lock"; orderId: string }
  | { kind: "unlock"; orderId: string }
  | { kind: "replace"; orderId: string; preselect?: string };

interface Toast {
  id: number;
  tone: "ok" | "bad";
  text: string;
}

let toastSeq = 0;

export default function App() {
  const initial = useMemo(loadState, []);
  const [gems, setGems] = useState<Gem[]>(initial.gems);
  const [orders, setOrders] = useState<Order[]>(initial.orders);
  const [audit, setAudit] = useState<AuditEntry[]>(initial.audit);
  const [activeOrderId, setActiveOrderId] = useState(initial.orders[0]?.id ?? "");
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 锁定、解锁、更换原因和订单清单写入浏览器，刷新后继续
  useEffect(() => {
    saveState(gems, orders, audit);
  }, [gems, orders, audit]);

  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? orders[0];

  function pushToast(tone: Toast["tone"], text: string) {
    toastSeq += 1;
    const id = toastSeq;
    setToasts((t) => [...t, { id, tone, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4600);
  }

  function pushAudit(entry: Omit<AuditEntry, "id" | "time">) {
    setAudit((list) => [makeAudit(entry), ...list]);
  }

  function patchOrder(orderId: string, patch: Partial<Order>) {
    setOrders((list) => list.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
  }

  // ---- 套件编辑（仅配套中订单）----

  function handleSetMain(gemId: string) {
    if (!activeOrder || activeOrder.locked) return;
    if (activeOrder.mainId) {
      // 已有主石 → 走“释放旧石 + 复核整套”的更换流程，必须填原因
      setDialog({ kind: "replace", orderId: activeOrder.id, preselect: gemId });
      return;
    }
    const trial = validateKit({ ...activeOrder, mainId: gemId }, gems, orders);
    const mainIssues = trial.filter((i) => i.code === "main-blocked" || i.code === "main-clarity");
    if (mainIssues.length > 0) {
      pushToast("bad", mainIssues[0].text);
      return;
    }
    patchOrder(activeOrder.id, { mainId: gemId });
    pushToast("ok", `已设为主石：${gemId}，该石现由 ${activeOrder.id} 占用`);
  }

  function handleRemoveMain() {
    if (!activeOrder || activeOrder.locked) return;
    const old = activeOrder.mainId;
    patchOrder(activeOrder.id, { mainId: null });
    if (old) pushToast("ok", `已撤下主石 ${old} 并释放占用`);
  }

  function handleAddAccent(gemId: string) {
    if (!activeOrder || activeOrder.locked) return;
    const issues = planAddAccent(activeOrder, gemId, gems, orders);
    if (issues.length > 0) {
      pushToast("bad", `不能加入围石：${issues[0].text}`);
      return;
    }
    if (activeOrder.accentIds.length >= MAX_ACCENTS) return;
    patchOrder(activeOrder.id, { accentIds: [...activeOrder.accentIds, gemId] });
    pushToast("ok", `围石 ${gemId} 已加入，现由 ${activeOrder.id} 占用`);
  }

  function handleRemoveAccent(gemId: string) {
    if (!activeOrder || activeOrder.locked) return;
    patchOrder(activeOrder.id, { accentIds: activeOrder.accentIds.filter((id) => id !== gemId) });
    pushToast("ok", `围石 ${gemId} 已移出并释放占用`);
  }

  // ---- 锁定 / 解锁 ----

  function handleLock(reason: string) {
    if (!activeOrder) return;
    const issues = validateKit(activeOrder, gems, orders);
    if (issues.length > 0) {
      pushToast("bad", `复核未通过，未锁定：${issues[0].text}`);
      pushAudit({
        action: "lock",
        orderId: activeOrder.id,
        reason,
        success: false,
        detail: `锁定被拒：${issues.map((i) => i.text).join("；")}。套件与占用保持不变。`,
      });
      setDialog({ kind: "none" });
      return;
    }
    patchOrder(activeOrder.id, {
      locked: true,
      lockedReason: reason,
      lockedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    });
    pushAudit({
      action: "lock",
      orderId: activeOrder.id,
      reason,
      success: true,
      detail: `复核通过并锁定：主石 ${activeOrder.mainId}，围石 ${activeOrder.accentIds.length} 颗。`,
    });
    pushToast("ok", `订单 ${activeOrder.id} 已锁定，套件宝石占用中`);
    setDialog({ kind: "none" });
  }

  function handleUnlock(reason: string) {
    if (!activeOrder) return;
    patchOrder(activeOrder.id, { locked: false });
    pushAudit({
      action: "unlock",
      orderId: activeOrder.id,
      reason,
      success: true,
      detail: "套件解锁，可调整围石或更换主石；宝石仍由本订单占用。",
    });
    pushToast("ok", `订单 ${activeOrder.id} 已解锁，可继续调整`);
    setDialog({ kind: "none" });
  }

  // ---- 更换主石（事务：释放旧石 → 放入新石 → 复核整套；失败回滚）----

  function handleReplaceMain(newMainId: string, reason: string) {
    if (!activeOrder) return;
    const oldMainId = activeOrder.mainId;
    const wasLocked = activeOrder.locked;
    const plan = planReplaceMain(activeOrder, newMainId, gems, orders);

    if (!plan.ok) {
      // 复核失败：不落任何状态，保持原套件和原占用
      pushAudit({
        action: "replace-main",
        orderId: activeOrder.id,
        reason,
        oldMainId: oldMainId ?? undefined,
        newMainId,
        success: false,
        detail: `更换被拒（${newMainId}）：${plan.issues.map((i) => i.text).join("；")}。已保持原套件与原占用，旧主石 ${oldMainId ?? "无"} 未释放。`,
      });
      pushToast("bad", `复核失败，未更换：${plan.issues[0].text}；原套件与占用保持不变`);
      setDialog({ kind: "none" });
      return;
    }

    patchOrder(activeOrder.id, { mainId: newMainId });
    pushAudit({
      action: "replace-main",
      orderId: activeOrder.id,
      reason,
      oldMainId: oldMainId ?? undefined,
      newMainId,
      success: true,
      detail: `先释放旧主石 ${oldMainId ?? "无"}，新主石 ${newMainId} 入位后复核通过，整套占用已更新。${wasLocked ? "订单保持锁定状态。" : ""}`,
    });
    pushToast("ok", `主石已更换：${oldMainId ?? "无"} → ${newMainId}（旧石已释放${wasLocked ? "，订单仍锁定" : ""}）`);
    setDialog({ kind: "none" });
  }

  function handleReset() {
    if (!window.confirm("确定清空浏览器中保存的锁定、清单与原因记录，恢复演示数据？")) return;
    const fresh = resetState();
    setGems(fresh.gems);
    setOrders(fresh.orders);
    setAudit(fresh.audit);
    setActiveOrderId(fresh.orders[0]?.id ?? "");
    pushToast("ok", "已恢复演示数据");
  }

  // ---- 顶部指标 ----
  const metrics = useMemo(() => {
    const batches = new Set(gems.map((g) => g.batch)).size;
    const pendingSetting = orders.filter((o) => !o.locked).length;
    const defectPending = gems.filter((g) => g.defect === "pending").length;
    const lockedCarat = sumCarat(
      orders
        .filter((o) => o.locked)
        .flatMap((o) => kitCarats(o, gems))
    );
    return [
      { label: "分拣批次", value: String(batches) },
      { label: "待镶嵌订单", value: String(pendingSetting) },
      { label: "缺陷待确认", value: String(defectPending) },
      { label: "锁定套件总克拉", value: `${lockedCarat.toFixed(2)}ct` },
    ];
  }, [gems, orders]);

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62006 · 珠宝镶嵌 · Port 62006</p>
        <h1>珠宝镶嵌宝石分拣 · 订单配套锁定</h1>
        <span>
          每个订单从在库宝石中选择 1 颗主石与最多 {MAX_ACCENTS} 颗围石：主石净度至少 VS2，围石形状与颜色一致，总克拉不超过订单上限；
          已属其他订单、缺检或缺陷未确认的宝石不能入套件。更换主石先释放旧石并复核整套，失败自动回滚。锁定、解锁与更换原因随本地存储保留，刷新后继续。
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

      <div className="workspace workspace-orders">
        <OrderList orders={orders} gems={gems} activeOrderId={activeOrder?.id ?? ""} onSelect={setActiveOrderId} />
        <div className="order-panels">
          {activeOrder && (
            <OrderPanel
              key={activeOrder.id}
              order={activeOrder}
              gems={gems}
              orders={orders}
              onAskLock={() => setDialog({ kind: "lock", orderId: activeOrder.id })}
              onAskUnlock={() => setDialog({ kind: "unlock", orderId: activeOrder.id })}
              onAskReplace={() => setDialog({ kind: "replace", orderId: activeOrder.id })}
              onRemoveMain={handleRemoveMain}
              onRemoveAccent={handleRemoveAccent}
            />
          )}
        </div>
      </div>

      {activeOrder && (
        <GemInventory
          gems={gems}
          orders={orders}
          activeOrderId={activeOrder.id}
          onSetMain={handleSetMain}
          onAddAccent={handleAddAccent}
        />
      )}

      <AuditLog entries={audit} />

      <section className="panel persistence-bar">
        <div>
          <strong>数据保存在本浏览器（localStorage）</strong>
          <p>订单清单、套件占用、锁定状态与全部原因记录都会保留，关闭或刷新页面后继续。</p>
        </div>
        <button onClick={handleReset}>恢复演示数据</button>
      </section>

      {dialog.kind === "lock" && activeOrder && (
        <ReasonDialog mode="lock" order={activeOrder} onConfirm={handleLock} onCancel={() => setDialog({ kind: "none" })} />
      )}
      {dialog.kind === "unlock" && activeOrder && (
        <ReasonDialog mode="unlock" order={activeOrder} onConfirm={handleUnlock} onCancel={() => setDialog({ kind: "none" })} />
      )}
      {dialog.kind === "replace" && activeOrder && (
        <ReplaceMainDialog
          order={activeOrder}
          initialMainId={dialog.preselect}
          gems={gems}
          orders={orders}
          onConfirm={handleReplaceMain}
          onCancel={() => setDialog({ kind: "none" })}
        />
      )}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={"toast " + t.tone}>
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
}

function kitCarats(order: Order, gems: Gem[]): number[] {
  const byId = new Map(gems.map((g) => [g.id, g]));
  return [order.mainId, ...order.accentIds]
    .filter((id): id is string => Boolean(id))
    .map((id) => byId.get(id)?.carat ?? 0);
}
