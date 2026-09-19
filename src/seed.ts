import type { Gem, Order } from "./domain";
import type { PersistedState } from "./storage";

function gem(
  partial: Pick<
    Gem,
    "id" | "kind" | "shape" | "carat" | "size" | "clarity" | "color"
  > &
    Partial<Gem>
): Gem {
  return {
    cut: "VG",
    position: "围石",
    batch: "B-2410",
    inspected: true,
    defect: null,
    defectConfirmed: false,
    ...partial,
  };
}

const gems: Gem[] = [
  // —— 批次 B-2409 · 主石候选 ——
  gem({
    id: "ST-2048", kind: "蓝宝石", shape: "椭圆", carat: 2.4, size: "8.0×6.0mm",
    clarity: "VS1", color: "皇家蓝", cut: "EX", position: "主石位", batch: "B-2409",
  }),
  gem({
    id: "ST-2052", kind: "红宝石", shape: "椭圆", carat: 1.85, size: "7.0×5.0mm",
    clarity: "VS2", color: "鸽血红", cut: "EX", position: "主石位", batch: "B-2409",
  }),
  gem({
    id: "ST-2055", kind: "钻石", shape: "圆形", carat: 1.2, size: "6.8mm",
    clarity: "VVS2", color: "D", cut: "EX", position: "主石位", batch: "B-2409",
  }),
  gem({
    id: "ST-2060", kind: "祖母绿", shape: "祖母绿切", carat: 1.6, size: "7.0×5.0mm",
    clarity: "SI1", color: "艳绿", position: "主石位", batch: "B-2409",
    defect: "内含物明显", defectConfirmed: true,
  }),
  gem({
    id: "ST-2070", kind: "蓝宝石", shape: "梨形", carat: 1.1, size: "8.0×5.0mm",
    clarity: "VS2", color: "皇家蓝", position: "主石位", batch: "B-2409",
    defect: "腰棱划痕", defectConfirmed: false,
  }),
  gem({
    id: "ST-2075", kind: "钻石", shape: "圆形", carat: 0.9, size: "6.2mm",
    clarity: "VS1", color: "F", cut: "EX", position: "主石位", batch: "B-2409",
    inspected: false,
  }),
  // —— 批次 B-2410 · 围石：圆形钻石 G 色 ——
  gem({ id: "ST-2061", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.6mm", clarity: "VS1", color: "G", cut: "EX", position: "围石A组" }),
  gem({ id: "ST-2062", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.6mm", clarity: "VS2", color: "G", cut: "EX", position: "围石A组" }),
  gem({ id: "ST-2063", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.6mm", clarity: "VS1", color: "G", cut: "EX", position: "围石A组" }),
  gem({ id: "ST-2064", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.6mm", clarity: "SI1", color: "G", position: "围石A组" }),
  gem({ id: "ST-2065", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.6mm", clarity: "VS2", color: "G", position: "围石A组" }),
  gem({ id: "ST-2066", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.6mm", clarity: "SI1", color: "G", position: "围石A组" }),
  gem({
    id: "ST-2067", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.6mm",
    clarity: "VS1", color: "G", position: "围石A组", inspected: false,
  }),
  gem({ id: "ST-2068", kind: "钻石", shape: "圆形", carat: 0.08, size: "2.6mm", clarity: "VS1", color: "H", position: "围石A组" }),
  // —— 批次 B-2411 · 围石：椭圆蓝宝石 ——
  gem({ id: "ST-2080", kind: "蓝宝石", shape: "椭圆", carat: 0.3, size: "5.0×3.0mm", clarity: "VS2", color: "皇家蓝", position: "围石B组", batch: "B-2411" }),
  gem({ id: "ST-2081", kind: "蓝宝石", shape: "椭圆", carat: 0.3, size: "5.0×3.0mm", clarity: "VS1", color: "皇家蓝", position: "围石B组", batch: "B-2411" }),
  gem({ id: "ST-2082", kind: "蓝宝石", shape: "椭圆", carat: 0.3, size: "5.0×3.0mm", clarity: "SI1", color: "皇家蓝", position: "围石B组", batch: "B-2411" }),
  gem({ id: "ST-2083", kind: "蓝宝石", shape: "椭圆", carat: 0.3, size: "5.0×3.0mm", clarity: "VS2", color: "矢车菊", position: "围石B组", batch: "B-2411" }),
  // —— 批次 B-2412 · 围石：异形 ——
  gem({ id: "ST-2090", kind: "钻石", shape: "梨形", carat: 0.15, size: "4.5×3.0mm", clarity: "VS1", color: "F", position: "围石C组", batch: "B-2412" }),
  gem({ id: "ST-2091", kind: "钻石", shape: "梨形", carat: 0.15, size: "4.5×3.0mm", clarity: "VS2", color: "F", position: "围石C组", batch: "B-2412" }),
  gem({
    id: "ST-2098", kind: "祖母绿", shape: "祖母绿切", carat: 0.5, size: "5.0×4.0mm",
    clarity: "SI1", color: "艳绿", position: "耳饰位", batch: "B-2412",
    defect: "羽状纹", defectConfirmed: true,
  }),
  gem({
    id: "ST-2099", kind: "祖母绿", shape: "祖母绿切", carat: 0.45, size: "4.8×3.8mm",
    clarity: "SI2", color: "艳绿", position: "耳饰位", batch: "B-2412",
    defect: "内含物明显，需客户确认", defectConfirmed: false,
  }),
];

const orders: Order[] = [
  { id: "ORD-1001", title: "陈女士 · 蓝宝石钻戒", caratLimit: 4.0 },
  { id: "ORD-1002", title: "王先生 · 钻石吊坠", caratLimit: 2.5 },
  { id: "ORD-1003", title: "李小姐 · 祖母绿耳饰", caratLimit: 3.2 },
];

export const seedState: PersistedState = {
  gems,
  orders,
  kits: {},
  events: [],
};
