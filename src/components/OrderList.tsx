import type { Gem, Order } from "../types";
import { sumCarat } from "../kit";

interface Props {
  orders: Order[];
  gems: Gem[];
  activeOrderId: string;
  onSelect: (id: string) => void;
}

/** 左侧订单清单：每个订单的配套概况与占用状态 */
export default function OrderList({ orders, gems, activeOrderId, onSelect }: Props) {
  const byId = new Map(gems.map((g) => [g.id, g]));

  return (
    <aside className="panel order-list">
      <h2>订单清单</h2>
      <div className="order-cards">
        {orders.map((o) => {
          const main = o.mainId ? byId.get(o.mainId) ?? null : null;
          const accents = o.accentIds.map((id) => byId.get(id)).filter((g): g is Gem => Boolean(g));
          const used = sumCarat([...(main ? [main.carat] : []), ...accents.map((a) => a.carat)]);
          return (
            <button
              key={o.id}
              className={"order-card " + (o.id === activeOrderId ? "active" : "")}
              onClick={() => onSelect(o.id)}
            >
              <div className="order-card-head">
                <strong>{o.id}</strong>
                {o.locked ? <span className="badge badge-lock">已锁定</span> : <span className="badge badge-draft">配套中</span>}
              </div>
              <span className="order-card-name">{o.name}</span>
              <span className="order-card-meta">
                主石 {main ? main.id : "未选"} · 围石 {o.accentIds.length}/8
              </span>
              <span className={"order-card-carat " + (used > o.maxCarat ? "text-danger" : "")}>
                {used.toFixed(2)} / {o.maxCarat.toFixed(2)} ct
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
