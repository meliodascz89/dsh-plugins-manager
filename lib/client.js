window.__ModuleLoader__.load({
  id: "dsh-plugins-manager",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require("react");

    const inject = ["slots", "settingsScope"];

    const CSS = ".stu-root{display:flex;flex-direction:column;gap:16px;padding:20px 24px;max-width:860px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}.stu-title{font-size:24px;font-weight:700;margin:0;background:linear-gradient(90deg,#7c5cff,#00c2ff);-webkit-background-clip:text;background-clip:text;color:transparent}.stu-sub{color:#9aa0b4;font-size:13px;margin:0}.stu-input{border:1px solid #2a2e3f;background:#151827;color:inherit;border-radius:10px;padding:9px 12px;font:inherit}.stu-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.stu-btn{font:inherit;font-size:13px;font-weight:600;border:1px solid #2a2e3f;background:#1b1f30;color:inherit;border-radius:10px;padding:8px 14px;cursor:pointer}.stu-btn:hover{border-color:#7c5cff}.stu-primary{background:linear-gradient(135deg,#6d4dff,#0aa8ff);border:none;color:#fff}.stu-pre{white-space:pre-wrap;background:#151827;border-radius:10px;padding:12px;margin:0;font-family:ui-monospace,monospace;font-size:12px;max-height:280px;overflow:auto}.stu-msg{color:#9aa0b4;font-size:13px;margin:0;white-space:pre-wrap}";

    function useAction(scope) {
      return async function call(args) {
        const id = String(Date.now()) + "-" + Math.random().toString(36).slice(2);
        await scope.set("request", JSON.stringify(args));
        await scope.set("requestId", id);
        for (let i = 0; i < 300; i++) {
          const v = scope.getSnapshot().value;
          if (v && v.responseId === id) {
            try { return JSON.parse(v.response); } catch { return { ok: false, error: "bad response" }; }
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        return { ok: false, error: "timeout" };
      };
    }

    function Plugins(props) {
      const [list, setList] = React.useState("");
      const [pkg, setPkg] = React.useState("");
      const [msg, setMsg] = React.useState("");
      const action = React.useMemo(() => useAction(props.action), [props.action]);

      async function refresh() {
        const r = await action({ action: "list" });
        setList(r && r.ok ? String(r.result || "") : "(chyba)");
      }
      async function act(a) {
        const r = await action({ action: a, package: pkg });
        setMsg(r && r.ok ? String(r.result || "Hotovo") : (r && r.error) || "Chyba");
        refresh();
      }
      React.useEffect(() => { refresh(); }, []);

      return React.createElement("div", { className: "stu-root" },
        React.createElement("div", null,
          React.createElement("h1", { className: "stu-title" }, "Správce pluginů"),
          React.createElement("p", { className: "stu-sub" }, "Instalace · aktualizace · zapnutí/vypnutí")),
        React.createElement("div", { className: "stu-row" },
          React.createElement("input", { className: "stu-input", value: pkg, onChange: (e) => setPkg(e.target.value), placeholder: "dsh-image-studio" }),
          React.createElement("button", { className: "stu-btn stu-primary", onClick: () => act("install") }, "Instalovat"),
          React.createElement("button", { className: "stu-btn", onClick: () => act("update") }, "Aktualizovat"),
          React.createElement("button", { className: "stu-btn", onClick: () => act("enable") }, "Zapnout"),
          React.createElement("button", { className: "stu-btn", onClick: () => act("disable") }, "Vypnout"),
          React.createElement("button", { className: "stu-btn", onClick: () => act("remove") }, "Odstranit")),
        React.createElement("pre", { className: "stu-pre" }, list || "(načítám…)"),
        msg ? React.createElement("p", { className: "stu-msg" }, msg) : null);
    }

    function apply(ctx) {
      const style = document.createElement("style");
      style.textContent = CSS;
      document.head.appendChild(style);
      ctx.effect(() => () => style.remove());

      const action = ctx.settingsScope.bind({ namespace: "plugins-manager-action" });
      ctx.slots.inject("conversation.view", () => ctx.slots.register({
        name: "conversation.view",
        id: "studio-plugins",
        order: 7,
        label: () => "🧩 Pluginy",
        inject: () => ({ action }),
        children: {},
      }, Plugins));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
