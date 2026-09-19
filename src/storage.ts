import { SEED_GEMS, SEED_ORDERS } from "./data";
import type { AuditEntry, Gem, Order, PersistState } from "./types";

const STORAGE_KEY = "gem-sort-kit-lock-v1";
const VERSION = 1;

export function loadState(): PersistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistState;
      if (parsed && parsed.version === VERSION && Array.isArray(parsed.gems) && Array.isArray(parsed.orders)) {
        return {
          version: VERSION,
          gems: parsed.gems,
          orders: parsed.orders,
          audit: Array.isArray(parsed.audit) ? parsed.audit : [],
        };
      }
    }
  } catch {
    // 存储损坏时回退到种子数据
  }
  return { version: VERSION, gems: SEED_GEMS, orders: SEED_ORDERS, audit: [] };
}

export function saveState(gems: Gem[], orders: Order[], audit: AuditEntry[]): void {
  const state: PersistState = { version: VERSION, gems, orders, audit };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 隐私模式等场景下静默失败
  }
}

export function resetState(): PersistState {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return { version: VERSION, gems: SEED_GEMS, orders: SEED_ORDERS, audit: [] };
}
