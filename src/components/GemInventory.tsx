import { useState } from "react";
import type { Gem, Order } from "../types";
import { MAX_ACCENTS, gemBlockReason, isMainClarity, planAddAccent, blockReasonText } from "../kit";interface Props {
  gems: Gem[];
  orders: Order[];
  activeOrderId: string;
  onSetMain: (gemId: string) => void;
  onAddAccent: (gemId: string) => void;
}

const SHAPE_FILTERS = ["全部", "圆形", "椭圆", "梨形", "祖母绿切"];

function ownerOf(gem: Gem, orders: Order[]): Order | undefined {
  return orders.find((o) => o.mainId === gem.id || o.accentIds.includes(gem.id));
}

export default function GemInventory({ gems, orders, activeOrderId, onSetMain, onAddAccent }: Props) {
  const [shape, setShape] = useState("全部");
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const order = orders.find((o) => o.id === activeOrderId)!;

  const rows = gems.filter((g) => {
    if (shape !== "全部" && g.shape !== shape) return false;
    if (hideUnavailable) {
      const owner = ownerOf(g, orders);
      if (owner) return false;
      if (g.clarity === "" || g.defect === "pending") return false;
    }
    return true;
  });

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>在库宝石（分拣台）</p>
          <h2>
            为订单 {order.id} 选石
            {order.locked && <span className="badge badge-lock">订单已锁定</span>}
          </h2>
        </div>
        <label className="inline-check">
          <input type="checkbox" checked={hideUnavailable} onChange={(e) => setHideUnavailable(e.target.checked)} />
          只看可入套件
        </label>
      </div>

      <div className="chips filter-chips">
        {SHAPE_FILTERS.map((s) => (
          <button key={s} className={shape === s ? "chip-on" : ""} onClick={() => setShape(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="gem-table">
          <thead>
            <tr>
              <th>宝石编号</th>
              <th>种类</th>
              <th>形状</th>
              <th>克拉/尺寸</th>
              <th>净度</th>
              <th>颜色</th>
              <th>批次/状态</th>
              <th>占用</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => {
              const owner = ownerOf(g, orders);
              const block = gemBlockReason(g, order.id, gems, orders);
              const inThisKit = order.mainId === g.id || order.accentIds.includes(g.id);
              const isAccent = order.accentIds.includes(g.id);
              const accentIssues = !order.locked && !inThisKit ? planAddAccent(order, g.id, gems, orders) : [];
              const addAccentBlocked = accentIssues.length > 0;
              const setMainBlocked = !isMainClarity(g) || block !== "none" || order.locked || inThisKit;
              const accentFull = order.accentIds.length >= MAX_ACCENTS;

              return (
                <tr key={g.id} className={inThisKit ? "row-in-kit" : ""}>
                  <td>
                    <strong>{g.id}</strong>
                  </td>
                  <td>{g.kind}</td>
                  <td>{g.shape}</td>
                  <td>
                    {g.carat}ct
                    <br />
                    <small>{g.size}</small>
                  </td>
                  <td>
                    <span className={g.clarity === "" ? "tag tag-warn" : isMainClarity(g) ? "tag tag-ok" : "tag"}>{g.clarity || "缺检"}</span>
                  </td>
                  <td>{g.color}</td>
                  <td>
                    {g.batch}
                    <br />
                    {g.defect === "none" && <small className="text-muted">无缺陷</small>}
                    {g.defect === "pending" && <small className="text-danger">缺陷待确认</small>}
                    {g.defect === "confirmed" && <small className="text-muted">缺陷已确认放行</small>}
                  </td>
                  <td>
                    {owner ? (
                      <span className={"tag " + (owner.id === order.id ? "tag-ok" : "tag-warn")}>
                        {owner.id === order.id ? "本单占用" : owner.id}
                        {owner.locked ? " 🔒" : ""}
                      </span>
                    ) : (
                      <span className="text-muted">在库</span>
                    )}
                  </td>
                  <td className="row-actions">
                    {inThisKit ? (
                      <span className="text-muted">{order.mainId === g.id ? "本单主石" : "本单围石"}</span>
                    ) : order.locked ? (
                      <span className="text-muted">已锁定</span>
                    ) : (
                      <>
                        <button className="mini" disabled={setMainBlocked} title={g.clarity === "" ? "缺检不能入套件" : !isMainClarity(g) ? "主石净度须至少 VS2" : block !== "none" ? blockReasonText(block, owner?.id) : "设为本订单主石"} onClick={() => onSetMain(g.id)}>
                          设为主石
                        </button>
                        <button
                          className="mini"
                          disabled={addAccentBlocked || accentFull || isAccent}
                          title={
                            accentFull
                              ? `围石最多 ${MAX_ACCENTS} 颗`
                              : accentIssues[0]?.text ?? "加入围石（形状、颜色须与现有围石一致）"
                          }
                          onClick={() => onAddAccent(g.id)}
                        >
                          加入围石
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="table-foot">
        提示：已属其他订单（无论是否锁定）、净度缺检、缺陷待客户确认的宝石均不能入套件；围石须形状、颜色一致，全套总克拉不超过订单上限。
      </p>
    </section>
  );
}
