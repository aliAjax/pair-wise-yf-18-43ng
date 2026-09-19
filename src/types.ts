export type Clarity = "FL" | "IF" | "VVS1" | "VVS2" | "VS1" | "VS2" | "SI1" | "SI2" | "I1";

export type DefectStatus = "none" | "pending" | "confirmed";

export interface Gem {
  id: string; // 宝石编号
  kind: string; // 种类
  shape: string; // 形状
  carat: number; // 克拉重量
  size: string; // 尺寸
  clarity: Clarity | ""; // 净度，未出证书可空（缺检）
  color: string; // 颜色
  cut: string; // 切工
  batch: string; // 分拣批次
  defect: DefectStatus; // 缺陷确认状态
}

export interface Order {
  id: string; // 订单号
  name: string; // 订单名称
  maxCarat: number; // 总克拉上限
  mainId: string | null; // 主石
  accentIds: string[]; // 围石，最多 8 颗
  locked: boolean; // 是否已锁定配套
  lockedReason?: string;
  lockedAt?: string;
}

export type AuditAction = "lock" | "unlock" | "replace-main";

export interface AuditEntry {
  id: string;
  time: string;
  action: AuditAction;
  orderId: string;
  reason: string;
  oldMainId?: string;
  newMainId?: string;
  success: boolean;
  detail: string;
}

export interface PersistState {
  version: number;
  gems: Gem[];
  orders: Order[];
  audit: AuditEntry[];
}
