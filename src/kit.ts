import type { AuditEntry, Gem, Order } from "./types";

export const MAX_ACCENTS = 8;

const CLARITY_RANK: Record<string, number> = {
  FL: 9,
  IF: 8,
  VVS1: 7,
  VVS2: 6,
  VS1: 5,
  VS2: 4,
  SI1: 3,
  SI2: 2,
  I1: 1,
};

/** 净度是否达到主石要求（至少 VS2） */
export function isMainClarity(gem: Gem): boolean {
  return gem.clarity !== "" && (CLARITY_RANK[gem.clarity] ?? 0) >= CLARITY_RANK.VS2;
}

/** 两数相加按两位小数结算，避免 0.1 + 0.2 类误差 */
export function sumCarat(values: number[]): number {
  const cents = values.reduce((acc, v) => acc + Math.round(v * 100), 0);
  return cents / 100;
}

export type BlockReason =
  | "occupied" // 已属其他订单
  | "uninspected" // 缺检（净度未出）
  | "defect" // 缺陷未确认
  | "none";

/**
 * 宝石能否进入某订单套件：
 * - 已被其他订单占用 → 不能
 * - 缺检（净度证书未出）→ 不能
 * - 存在缺陷且客户尚未确认 → 不能
 */
export function gemBlockReason(gem: Gem, orderId: string, gems: Gem[], orders: Order[]): BlockReason {
  const owner = orders.find(
    (o) => o.id !== orderId && (o.mainId === gem.id || o.accentIds.includes(gem.id))
  );
  if (owner) return "occupied";
  if (gem.clarity === "") return "uninspected";
  if (gem.defect === "pending") return "defect";
  return "none";
}

export function blockReasonText(reason: BlockReason, ownerOrderId?: string): string {
  switch (reason) {
    case "occupied":
      return ownerOrderId ? `已属订单 ${ownerOrderId}` : "已被其他订单占用";
    case "uninspected":
      return "缺检：净度证书未出";
    case "defect":
      return "缺陷未确认";
    default:
      return "";
  }
}

export type IssueCode =
  | "main-required"
  | "main-clarity"
  | "main-blocked"
  | "accent-blocked"
  | "too-many-accents"
  | "accent-shape"
  | "accent-color"
  | "carat-overflow";

export interface KitIssue {
  code: IssueCode;
  text: string;
}

export function kitGemIds(order: Order): string[] {
  return order.mainId ? [order.mainId, ...order.accentIds] : [...order.accentIds];
}

/**
 * 复核整套（按当前占用关系）。这是锁定与换主石成功与否的唯一判定依据。
 */
export function validateKit(order: Order, gems: Gem[], allOrders: Order[]): KitIssue[] {
  const issues: KitIssue[] = [];
  const byId = new Map(gems.map((g) => [g.id, g]));
  const main = order.mainId ? byId.get(order.mainId) ?? null : null;
  const accents = order.accentIds.map((id) => byId.get(id)).filter((g): g is Gem => Boolean(g));

  if (!order.mainId) {
    issues.push({ code: "main-required", text: "需要先选定一颗主石" });
  } else if (!main) {
    issues.push({ code: "main-required", text: "主石记录缺失，请重选" });
  } else {
    if (!isMainClarity(main)) {
      issues.push({ code: "main-clarity", text: `主石 ${main.id} 净度 ${main.clarity || "缺检"}，未达到 VS2` });
    }
    const blocked = gemBlockReason(main, order.id, gems, allOrders);
    if (blocked !== "none") {
      const owner = allOrders.find((o) => o.id !== order.id && kitGemIds(o).includes(main.id));
      issues.push({ code: "main-blocked", text: `主石 ${main.id}：${blockReasonText(blocked, owner?.id)}` });
    }
  }

  for (const a of accents) {
    const blocked = gemBlockReason(a, order.id, gems, allOrders);
    if (blocked !== "none") {
      const owner = allOrders.find((o) => o.id !== order.id && kitGemIds(o).includes(a.id));
      issues.push({ code: "accent-blocked", text: `围石 ${a.id}：${blockReasonText(blocked, owner?.id)}` });
    }
  }

  if (order.accentIds.length > MAX_ACCENTS) {
    issues.push({ code: "too-many-accents", text: `围石 ${order.accentIds.length} 颗，超过最多 ${MAX_ACCENTS} 颗` });
  }

  if (accents.length >= 2) {
    const shape = accents[0].shape;
    const color = accents[0].color;
    if (accents.some((a) => a.shape !== shape)) {
      issues.push({ code: "accent-shape", text: "围石形状必须全部一致" });
    }
    if (accents.some((a) => a.color !== color)) {
      issues.push({ code: "accent-color", text: "围石颜色必须全部一致" });
    }
  }

  const used = sumCarat([...(main ? [main.carat] : []), ...accents.map((a) => a.carat)]);
  if (sumCarat([used, -order.maxCarat]) > 0) {
    issues.push({
      code: "carat-overflow",
      text: `总克拉 ${used.toFixed(2)}ct 超过订单上限 ${order.maxCarat.toFixed(2)}ct`,
    });
  }

  return issues;
}

export interface ReplacePlan {
  ok: boolean;
  issues: KitIssue[];
}

/**
 * 更换主石规划：先释放旧主石，再放入新主石，最后复核整套。
 * 复核失败时调用方必须保持原套件与原占用不变。
 */
export function planReplaceMain(order: Order, newMainId: string, gems: Gem[], orders: Order[]): ReplacePlan {
  if (newMainId === order.mainId) {
    return { ok: false, issues: [{ code: "main-blocked", text: "新主石与当前主石相同，无需更换" }] };
  }
  if (order.accentIds.includes(newMainId)) {
    return { ok: false, issues: [{ code: "main-blocked", text: "该宝石已在本套件中担任围石，请先从围石移除" }] };
  }

  // 1) 释放旧主石（临时假设中，它不再占用任何订单）
  const released: Order = { ...order, mainId: null };
  // 2) 新主石入位
  const trial: Order = { ...released, mainId: newMainId };
  // 3) 复核整套
  const issues = validateKit(trial, gems, orders);
  return { ok: issues.length === 0, issues };
}

/** 追加一颗围石后的预览校验（允许先凑围石，主石缺失留待锁定前复核） */
export function planAddAccent(order: Order, gemId: string, gems: Gem[], orders: Order[]): KitIssue[] {
  if (order.mainId === gemId || order.accentIds.includes(gemId)) {
    return [{ code: "accent-blocked", text: "该宝石已在本套件中" }];
  }
  if (order.accentIds.length >= MAX_ACCENTS) {
    return [{ code: "too-many-accents", text: `围石最多 ${MAX_ACCENTS} 颗` }];
  }
  return validateKit({ ...order, accentIds: [...order.accentIds, gemId] }, gems, orders).filter(
    (i) => i.code !== "main-required" && i.code !== "main-clarity" && i.code !== "main-blocked"
  );
}

let auditSeq = 0;
export function makeAudit(
  partial: Omit<AuditEntry, "id" | "time">
): AuditEntry {
  auditSeq += 1;
  return {
    id: `AUD-${Date.now().toString(36)}-${auditSeq}`,
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
    ...partial,
  };
}
