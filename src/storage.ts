import type { Gem, Kit, KitEvent, Order } from "./domain";

export interface PersistedState {
  gems: Gem[];
  orders: Order[];
  kits: Record<string, Kit>;
  events: KitEvent[];
}

const STORAGE_KEY = "hxyfront-62006:kit-lock:v1";

/** 从浏览器恢复配套数据；无数据或数据损坏时回退到示例数据 */
export function loadState(seed: PersistedState): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      gems: Array.isArray(parsed.gems) ? parsed.gems : seed.gems,
      orders: Array.isArray(parsed.orders) ? parsed.orders : seed.orders,
      kits:
        parsed.kits && typeof parsed.kits === "object" ? parsed.kits : seed.kits,
      events: Array.isArray(parsed.events) ? parsed.events : seed.events,
    };
  } catch {
    return seed;
  }
}

/** 锁定、解锁、更换原因与订单清单全部写入浏览器，刷新后继续 */
export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用（如隐私模式）时静默失败，页面内状态仍然有效
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 同上
  }
}
