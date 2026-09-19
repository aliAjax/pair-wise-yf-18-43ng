import { useState } from "react";
import type { Order } from "../types";

interface Props {
  mode: "lock" | "unlock";
  order: Order;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const COPY = {
  lock: {
    title: "锁定配套",
    hint: "锁定后套件宝石被该订单占用，不可再编辑；如需改动须先解锁。",
    placeholder: "如：客户确认 3D 图与预算，安排镶口加工…",
    cta: "确认锁定",
  },
  unlock: {
    title: "解锁配套",
    hint: "解锁后宝石仍由本订单占用，但可以调整围石或更换主石。",
    placeholder: "如：客户要求调整围石数量；主石返厂复检…",
    cta: "确认解锁",
  },
} as const;

export default function ReasonDialog({ mode, order, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("");
  const copy = COPY[mode];

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="heading">
          <div>
            <p>{copy.title}</p>
            <h2>
              {order.id} · {order.name}
            </h2>
          </div>
          <button onClick={onCancel} aria-label="关闭">
            ✕
          </button>
        </div>
        <p className="modal-note">{copy.hint}</p>
        <label className="modal-field">
          <span>原因（必填，写入审计记录）</span>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={copy.placeholder} autoFocus />
        </label>
        <div className="modal-actions">
          <button onClick={onCancel}>取消</button>
          <button className="primary" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
            {copy.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
