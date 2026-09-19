import type { Gem, Order } from "./types";

export const SEED_GEMS: Gem[] = [
  // 主石候选
  { id: "ST-2048", kind: "蓝宝石", shape: "椭圆", carat: 1.52, size: "8x6mm", clarity: "VVS1", color: "皇家蓝", cut: "椭圆明亮切工", batch: "B-2401", defect: "none" },
  { id: "ST-2051", kind: "蓝宝石", shape: "椭圆", carat: 1.18, size: "7x5mm", clarity: "VS2", color: "矢车菊蓝", cut: "椭圆明亮切工", batch: "B-2401", defect: "none" },
  { id: "ST-2060", kind: "红宝石", shape: "圆形", carat: 1.05, size: "6.2mm", clarity: "VS1", color: "鸽血红", cut: "圆形明亮切工", batch: "B-2402", defect: "none" },
  { id: "ST-2072", kind: "蓝宝石", shape: "椭圆", carat: 2.1, size: "9x7mm", clarity: "SI1", color: "深蓝", cut: "椭圆混合切工", batch: "B-2402", defect: "none" },
  { id: "ST-2077", kind: "祖母绿", shape: "祖母绿切", carat: 1.86, size: "9x7mm", clarity: "", color: "Verdant Green", cut: "阶梯切工", batch: "B-2403", defect: "none" },
  { id: "ST-2099", kind: "祖母绿", shape: "祖母绿切", carat: 1.34, size: "8x6mm", clarity: "VVS2", color: "Muzo Green", cut: "阶梯切工", batch: "B-2403", defect: "pending" },
  { id: "ST-2103", kind: "祖母绿", shape: "祖母绿切", carat: 1.21, size: "7.5x5.5mm", clarity: "VS2", color: "翠绿", cut: "阶梯切工", batch: "B-2403", defect: "confirmed" },
  { id: "ST-2110", kind: "粉钻", shape: "梨形", carat: 0.96, size: "7x5mm", clarity: "VS1", color: "Fancy Pink", cut: "梨形切工", batch: "B-2404", defect: "none" },

  // 围石：圆形白钻
  { id: "ST-2061", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.7mm", clarity: "VVS2", color: "D", cut: "圆形明亮切工", batch: "B-2405", defect: "none" },
  { id: "ST-2062", kind: "钻石", shape: "圆形", carat: 0.07, size: "2.6mm", clarity: "VS1", color: "D", cut: "圆形明亮切工", batch: "B-2405", defect: "none" },
  { id: "ST-2063", kind: "钻石", shape: "圆形", carat: 0.09, size: "2.8mm", clarity: "VS2", color: "D", cut: "圆形明亮切工", batch: "B-2405", defect: "none" },
  { id: "ST-2064", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.7mm", clarity: "SI1", color: "F", cut: "圆形明亮切工", batch: "B-2405", defect: "none" },
  { id: "ST-2065", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.7mm", clarity: "VVS1", color: "D", cut: "圆形明亮切工", batch: "B-2405", defect: "pending" },
  { id: "ST-2066", kind: "钻石", shape: "圆形", carat: 0.1, size: "3.0mm", clarity: "IF", color: "D", cut: "圆形明亮切工", batch: "B-2405", defect: "none" },
  { id: "ST-2067", kind: "钻石", shape: "圆形", carat: 0.07, size: "2.6mm", clarity: "VS1", color: "E", cut: "圆形明亮切工", batch: "B-2405", defect: "none" },
  { id: "ST-2068", kind: "钻石", shape: "圆形", carat: 0.09, size: "2.8mm", clarity: "VVS2", color: "D", cut: "圆形明亮切工", batch: "B-2405", defect: "none" },
  { id: "ST-2069", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.7mm", clarity: "VS2", color: "D", cut: "圆形明亮切工", batch: "B-2405", defect: "none" },
  { id: "ST-2070", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.7mm", clarity: "", color: "D", cut: "圆形明亮切工", batch: "B-2406", defect: "none" },

  // 围石：椭圆皇家蓝
  { id: "ST-2081", kind: "蓝宝石", shape: "椭圆", carat: 0.22, size: "4x3mm", clarity: "VS1", color: "皇家蓝", cut: "椭圆明亮切工", batch: "B-2407", defect: "none" },
  { id: "ST-2082", kind: "蓝宝石", shape: "椭圆", carat: 0.2, size: "3.8x2.8mm", clarity: "VS2", color: "皇家蓝", cut: "椭圆明亮切工", batch: "B-2407", defect: "none" },
  { id: "ST-2083", kind: "蓝宝石", shape: "椭圆", carat: 0.21, size: "4x3mm", clarity: "VVS2", color: "皇家蓝", cut: "椭圆明亮切工", batch: "B-2407", defect: "none" },
  { id: "ST-2084", kind: "蓝宝石", shape: "梨形", carat: 0.23, size: "4.5x3mm", clarity: "VS1", color: "皇家蓝", cut: "梨形切工", batch: "B-2407", defect: "none" },
];

export const SEED_ORDERS: Order[] = [
  {
    id: "PO-3001",
    name: "皇家蓝蓝宝石吊坠（1+6）",
    maxCarat: 2.2,
    mainId: "ST-2048",
    accentIds: ["ST-2061", "ST-2062", "ST-2066", "ST-2068", "ST-2069", "ST-2063"],
    locked: true,
    lockedReason: "客户已确认款式与预算，投产镶口加工",
    lockedAt: "2026-09-12 10:24",
  },
  {
    id: "PO-3002",
    name: "鸽血红宝石戒指（1+4）",
    maxCarat: 1.6,
    mainId: "ST-2060",
    accentIds: ["ST-2067"],
    locked: false,
  },
  {
    id: "PO-3003",
    name: "祖母绿阶梯吊坠（1+8）",
    maxCarat: 4.2,
    mainId: null,
    accentIds: [],
    locked: false,
  },
];
