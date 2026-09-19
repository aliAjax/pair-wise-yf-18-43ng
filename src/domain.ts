export type Clarity =
  | "FL"
  | "IF"
  | "VVS1"
  | "VVS2"
  | "VS1"
  | "VS2"
  | "SI1"
  | "SI2"
  | "I1";

/** 净度由高到低排列 */
export const CLARITY_ORDER: Clarity[] = [
  "FL",
  "IF",
  "VVS1",
  "VVS2",
  "VS1",
  "VS2",
  "SI1",
  "SI2",
  "I1",
];

/** 主石净度门槛：至少 VS2 */
export const MIN_MAIN_CLARITY: Clarity = "VS2";
/** 每单围石上限 */
export const MAX_SIDE_STONES = 8;

export function clarityAtLeast(
  clarity: Clarity,
  min: Clarity = MIN_MAIN_CLARITY
): boolean {
  return CLARITY_ORDER.indexOf(clarity) <= CLARITY_ORDER.indexOf(min);
}

export interface Gem {
  id: string; // 宝石编号
  kind: string; // 种类
  shape: string; // 形状
  carat: number; // 克拉重量
  size: string; // 尺寸
  clarity: Clarity; // 净度
  color: string; // 颜色
  cut: string; // 切工
  position: string; // 镶嵌位置
  batch: string; // 分拣批次
  inspected: boolean; // 是否已检（缺检 = false）
  defect: string | null; // 缺陷备注
  defectConfirmed: boolean; // 缺陷是否已确认
}

export interface Order {
  id: string;
  title: string;
  caratLimit: number; // 订单总克拉上限
}

export interface Kit {
  mainStoneId: string | null;
  sideStoneIds: string[];
  locked: boolean;
  lockedAt: string | null;
}

export interface KitEvent {
  id: string;
  at: string; // ISO 时间
  orderId: string;
  type: "lock" | "unlock" | "replace";
  ok: boolean;
  reason: string; // 解锁/更换原因
  detail: string;
}

/**
 * 宝石不能入套件的原因：缺检、缺陷未确认、已属其他订单。
 * occupiedBy 传入占用该宝石的“其他”订单号，无则传 null。
 */
export function gemBlockers(gem: Gem, occupiedBy: string | null): string[] {
  const problems: string[] = [];
  if (!gem.inspected) problems.push("缺检");
  if (gem.defect && !gem.defectConfirmed) problems.push("缺陷未确认");
  if (occupiedBy) problems.push(`已属订单 ${occupiedBy}`);
  return problems;
}

/** 由已锁定套件推导宝石占用表：gemId -> orderId */
export function buildOccupancy(
  kits: Record<string, Kit>
): Record<string, string> {
  const occupancy: Record<string, string> = {};
  for (const [orderId, kit] of Object.entries(kits)) {
    if (!kit.locked) continue;
    if (kit.mainStoneId) occupancy[kit.mainStoneId] = orderId;
    for (const id of kit.sideStoneIds) occupancy[id] = orderId;
  }
  return occupancy;
}

export function kitCarat(
  kit: Pick<Kit, "mainStoneId" | "sideStoneIds">,
  gems: Record<string, Gem>
): number {
  let total = 0;
  const main = kit.mainStoneId ? gems[kit.mainStoneId] : undefined;
  if (main) total += main.carat;
  for (const id of kit.sideStoneIds) {
    const gem = gems[id];
    if (gem) total += gem.carat;
  }
  return total;
}

/**
 * 复核整套套件，返回全部问题（空数组 = 通过）。
 * selfOrderId 为正在校验的订单，其自身已锁定的宝石不算“已属其他订单”。
 */
export function validateKit(
  order: Order,
  kit: Pick<Kit, "mainStoneId" | "sideStoneIds">,
  gems: Record<string, Gem>,
  occupancy: Record<string, string>,
  selfOrderId: string
): string[] {
  const problems: string[] = [];
  const occupiedByOther = (gemId: string): string | null => {
    const holder = occupancy[gemId];
    return holder && holder !== selfOrderId ? holder : null;
  };

  if (kit.mainStoneId && kit.sideStoneIds.includes(kit.mainStoneId)) {
    problems.push(`主石 ${kit.mainStoneId} 同时在围石列表中`);
  }
  if (new Set(kit.sideStoneIds).size !== kit.sideStoneIds.length) {
    problems.push("围石列表存在重复宝石");
  }
  if (kit.sideStoneIds.length > MAX_SIDE_STONES) {
    problems.push(
      `围石 ${kit.sideStoneIds.length} 颗，超过上限 ${MAX_SIDE_STONES} 颗`
    );
  }

  let total = 0;

  if (!kit.mainStoneId) {
    problems.push("缺少主石");
  } else {
    const main = gems[kit.mainStoneId];
    if (!main) {
      problems.push(`主石 ${kit.mainStoneId} 不在在库清单中`);
    } else {
      if (!clarityAtLeast(main.clarity)) {
        problems.push(
          `主石 ${main.id} 净度 ${main.clarity} 低于 ${MIN_MAIN_CLARITY}`
        );
      }
      for (const p of gemBlockers(main, occupiedByOther(main.id))) {
        problems.push(`主石 ${main.id}：${p}`);
      }
      total += main.carat;
    }
  }

  const shapes = new Set<string>();
  const colors = new Set<string>();
  for (const id of kit.sideStoneIds) {
    const side = gems[id];
    if (!side) {
      problems.push(`围石 ${id} 不在在库清单中`);
      continue;
    }
    shapes.add(side.shape);
    colors.add(side.color);
    for (const p of gemBlockers(side, occupiedByOther(id))) {
      problems.push(`围石 ${side.id}：${p}`);
    }
    total += side.carat;
  }
  if (shapes.size > 1) {
    problems.push(`围石形状不一致（${[...shapes].join("、")}）`);
  }
  if (colors.size > 1) {
    problems.push(`围石颜色不一致（${[...colors].join("、")}）`);
  }

  if (total > order.caratLimit + 1e-9) {
    problems.push(
      `总克拉 ${total.toFixed(2)}ct 超出订单上限 ${order.caratLimit.toFixed(2)}ct`
    );
  }

  return problems;
}
