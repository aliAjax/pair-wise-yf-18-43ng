import type { AuditEntry } from "../types";

const ACTION_TEXT: Record<AuditEntry["action"], string> = {
  lock: "锁定",
  unlock: "解锁",
  "replace-main": "更换主石",
};

export default function AuditLog({ entries }: { entries: AuditEntry[] }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>操作留痕</p>
          <h2>锁定 / 解锁 / 更换主石原因记录</h2>
        </div>
        <small className="text-muted">随浏览器本地存储保存，刷新页面后继续可查</small>
      </div>
      {entries.length === 0 ? (
        <p className="text-muted empty-hint">暂无操作记录。</p>
      ) : (
        <div className="table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>订单</th>
                <th>操作</th>
                <th>结果</th>
                <th>原因 / 说明</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className={e.success ? "" : "row-fail"}>
                  <td className="nowrap">{e.time}</td>
                  <td>{e.orderId}</td>
                  <td>
                    {ACTION_TEXT[e.action]}
                    {e.oldMainId && (
                      <small className="text-muted">
                        {" "}
                        {e.oldMainId} → {e.newMainId}
                      </small>
                    )}
                  </td>
                  <td>
                    <span className={"tag " + (e.success ? "tag-ok" : "tag-danger")}>{e.success ? "成功" : "失败·已回滚"}</span>
                  </td>
                  <td>
                    <strong>{e.reason}</strong>
                    <br />
                    <small className="text-muted">{e.detail}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
