window.__ModuleLoader__.load({
  id: "dsh-plugins-manager",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require("react");

    const inject = ["slots", "settingsScope"];

    const css = `
.dpm-root{display:flex;flex-direction:column;gap:16px;font-size:13px;line-height:1.5}
.dpm-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dpm-input{border:1px solid var(--dsw-alias-border-l2,#333);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font:inherit;min-width:220px}
.dpm-btn{font:inherit;border:1px solid var(--dsw-alias-border-l2,#333);background:var(--dsw-alias-bg-layer-3,#222);color:inherit;border-radius:8px;padding:6px 12px;cursor:pointer}
.dpm-btn:hover{border-color:var(--dsw-alias-brand-primary,#4a9eff)}
.dpm-list{display:flex;flex-direction:column;gap:8px}
.dpm-item{display:flex;gap:8px;align-items:center;justify-content:space-between;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:8px;padding:8px 12px}
.dpm-name{font-weight:600}
.dpm-ver{color:var(--dsw-alias-label-secondary,#999)}
.dpm-actions{display:flex;gap:6px}
.dpm-pre{white-space:pre-wrap;background:var(--dsw-alias-bg-layer-3,#222);border-radius:8px;padding:10px;margin:0;font-family:ui-monospace,monospace;font-size:12px}
`;

    function useSnapshot(scope) {
      return React.useSyncExternalStore(
        (cb) => scope.subscribe(cb),
        () => scope.getSnapshot(),
      );
    }

    function Section(props) {
      const action = useSnapshot(props.action);
      const [pkgName, setPkgName] = React.useState("");
      const [busy, setBusy] = React.useState(false);

      const actionValue = action?.value ?? {};
      let response = null;
      if (typeof actionValue.response === "string") {
        try { response = JSON.parse(actionValue.response); } catch { response = null; }
      }

      function run(act) {
        const target = act === "list" || act === "status" ? "" : pkgName;
        if (target === "" && act !== "list" && act !== "status") {
          setBusy(false);
          return;
        }
        setBusy(true);
        const id = String(Date.now()) + "-" + Math.random().toString(36).slice(2);
        Promise.resolve()
          .then(() => props.action.set("request", JSON.stringify({ action: act, package: target })))
          .then(() => props.action.set("requestId", id))
          .finally(() => setBusy(false));
      }

      return React.createElement("div", { className: "dpm-root" },
        React.createElement("style", null, css),
        React.createElement("h3", null, "Plugin Manager"),
        React.createElement("p", null,
          "Control the custom plugins installed in this DSH profile. Changes apply after the next DSH restart."),

        React.createElement("div", { className: "dpm-row" },
          React.createElement("input", {
            className: "dpm-input",
            placeholder: "npm package name (e.g. dsh-image-studio)",
            value: pkgName,
            onChange: (e) => setPkgName(e.target.value),
          }),
          React.createElement("button", { className: "dpm-btn", disabled: busy, onClick: () => run("install") }, "Install"),
          React.createElement("button", { className: "dpm-btn", disabled: busy, onClick: () => run("update") }, "Update"),
          React.createElement("button", { className: "dpm-btn", disabled: busy, onClick: () => run("uninstall") }, "Uninstall"),
          React.createElement("button", { className: "dpm-btn", disabled: busy, onClick: () => run("enable") }, "Enable"),
          React.createElement("button", { className: "dpm-btn", disabled: busy, onClick: () => run("disable") }, "Disable"),
          React.createElement("button", { className: "dpm-btn", disabled: busy, onClick: () => run("list") }, "Refresh"),
        ),

        response
          ? React.createElement("pre", { className: "dpm-pre" },
              response.ok ? String(response.result ?? "") : "Error: " + String(response.error ?? ""))
          : React.createElement("p", null,
              "Use the buttons above, or ask the agent to run dsh_plugin_manage (e.g. action=list)."),
      );
    }

    function apply(ctx) {
      const config = ctx.settingsScope.bind({ namespace: "plugins-manager" });
      const action = ctx.settingsScope.bind({ namespace: "plugins-manager-action" });
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "plugins-manager",
        order: 50,
        label: () => "Plugin Manager",
        inject: () => ({ config, action }),
        children: {},
      }, Section));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
