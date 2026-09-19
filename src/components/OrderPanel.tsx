import type { Gem, Order } from "../types";
import { MAX_ACCENTS, sumCarat, validateKit } from "../kit";
import SettingDiagram from "./SettingDiagram";

interface Props {
  order: Order;
  gems: Gem[];
  orders: Order[];
  onAskLock: () => void;
  onAskUnlock: () => void;
  onAskReplace: () => void;
  onRemoveMain: () => void;
  onRemoveAccent: (gemId: string) => void;
}

export default function OrderPanel({ order, gems, orders, onAskLock, onAskUnlock, onAskReplace, onRemoveMain, onRemoveAccent }: Props) {
  const byId = new Map(gems.map((g) => [g.id, g]));
  const main = order.mainId ? byId.get(order.mainId) ?? null : null;
  const accents = order.accentIds.map((id) => byId.get(id)).filter((g): g is Gem => Boolean(g));
  const used = sumCarat([...(main ? [main.carat] : []), ...accents.map((a) => a.carat)]);
  const issues = validateKit(order, gems, orders);
  const pct = Math.min(100, (used / order.maxCarat) * 100);
  const over = used > order.maxCarat;

  return (
    <article className={"order-panel " + (order.locked ? "is-locked" : "")}>
      <div className="heading">
        <div>
          <p>
            {order.id} {order.locked && <span className="badge badge-lock">已锁定</span>}
            {!order.locked && <span className="badge badge-draft">配套中</span>}
          </p>
          <h2>{order.name}</h2>
          {order.locked && order.lockedAt && (
            <small className="lock-meta">
              锁定于 {order.lockedAt} · 原因：{order.lockedReason}
            </small>
          )}
        </div>
        <div className="order-actions">
          <button onClick={onAskReplace} title="先释放旧主石，放入新主石后复核整套；失败保持原状">
            更换主石…
          </button>
          {order.locked ? (
            <button className="primary ghost-danger" onClick={onAskUnlock}>
              解锁
            </button>
          ) : (
            <button className="primary" onClick={onAskLock} disabled={issues.length > 0} title={issues.length ? "复核未通过，不能锁定" : "复核通过后锁定套件"}>
              锁定配套
            </button>
          )}
        </div>
      </div>

      <div className="order-body">
        <div className="diagram-wrap">
          <SettingDiagram main={main} accents={accents} maxAccents={MAX_ACCENTS} />
          <p className="diagram-caption">镶嵌位置示意图（中心主石位 + 外圈 {MAX_ACCENTS} 围石位）</p>
        </div>

        <div className="kit">
          <div className="kit-row kit-main">
            <span className="kit-tag">主石</span>
            {main ? (
              <div className="kit-gem">
                <div>
                  <strong>{main.id}</strong>
                  <span>
                    {main.kind} · {main.shape} · {main.carat}ct · 净度{main.clarity} · {main.color}
                  </span>
                </div>
                {!order.locked && (
                  <button className="mini" onClick={onRemoveMain} title="撤下主石并释放占用">
                    撤下
                  </button>
                )}
              </div>
            ) : (
              <div className="kit-empty">未选主石（净度 ≥ VS2，从下方在库清单点“设为主石”）</div>
            )}
          </div>

          <div className="kit-row">
            <span className="kit-tag">
              围石 {order.accentIds.length}/{MAX_ACCENTS}
            </span>
            <div className="kit-accents">
              {accents.map((g) => (
                <div className="kit-gem" key={g.id}>
                  <div>
                    <strong>{g.id}</strong>
                    <span>
                      {g.shape} · {g.color} · {g.carat}ct
                    </span>
                  </div>
                  {!order.locked && (
                    <button className="mini" onClick={() => onRemoveAccent(g.id)}>
                      移出
                    </button>
                  )}
                </div>
              ))}
              {accents.length === 0 && <div className="kit-empty">尚无围石，围石形状与颜色须一致，从下方清单“加入围石”</div>}
            </div>
          </div>

          <div className="carat-meter">
            <div className="carat-meter-head">
              <span>总克拉</span>
              <strong className={over ? "text-danger" : ""}>
                {used.toFixed(2)} / {order.maxCarat.toFixed(2)} ct
              </strong>
            </div>
            <div className="meter">
              <div className={"meter-fill " + (over ? "over" : issues.some((i) => i.code === "carat-overflow") ? "over" : "")} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {order.locked ? (
            <p className="review ok">✓ 已通过复核并锁定，宝石处于订单占用中；如需调整请先解锁或使用“更换主石”。</p>
          ) : issues.length === 0 ? (
            <p className="review ok">✓ 复核通过，可以锁定（主石净度达标、围石一致、总克拉未超限）。</p>
          ) : (
            <ul className="review bad">
              {issues.map((i) => (
                <li key={i.code}>{i.text}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {order.locked && (
        <p className="locked-tip">已锁定：围石不可增删；“更换主石”同样按释放→入位→复核执行，失败自动回滚并记录原因。</p>
      )}
    </article>
  );
}
