import { defineTool } from "@deepseek-ai/dsh-tools";
import { settingsNamespace, installSettingsSection } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
import { execFile } from "node:child_process";
import { readFile, writeFile, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const name = "plugins-manager";
const inject = ["tools", "settings"];

const NS = settingsNamespace("plugins-manager");
const ACTION_NS = settingsNamespace("plugins-manager-action");

const SCHEMA = z.object({ managed: z.array(z.string()) });

const PROFILE_DIR = join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "profiles", "web");
const PROFILE_PATH = join(PROFILE_DIR, "package.json");

async function readProfile() {
  const raw = await readFile(PROFILE_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeProfile(pkg) {
  const tmp = PROFILE_PATH + ".tmp";
  await writeFile(tmp, JSON.stringify(pkg, null, 2) + "\n");
  await rename(tmp, PROFILE_PATH);
}

function userPlugins(pkg) {
  const bundles = pkg?.dsh?.profile?.bundles ?? [];
  const deps = pkg?.dependencies ?? {};
  return bundles
    .filter((b) => !b.startsWith("@deepseek-ai/"))
    .map((b) => ({ name: b, version: deps[b] ?? "?" }));
}

async function runDshPlugin(args) {
  const { stdout, stderr } = await execFileAsync(
    "dsh", ["plugin", "--profile", "web", ...args],
    { timeout: 600000, maxBuffer: 10 * 1024 * 1024 },
  );
  const out = (stdout || "").trim();
  const err = (stderr || "").trim();
  return out + (out && err ? "\n" : "") + err;
}

async function ensureBundled(pkgName) {
  const profile = await readProfile();
  const bundles = profile.dsh?.profile?.bundles ?? [];
  if (!bundles.includes(pkgName)) {
    bundles.push(pkgName);
    profile.dsh = profile.dsh ?? {};
    profile.dsh.profile = profile.dsh.profile ?? {};
    profile.dsh.profile.bundles = bundles;
    await writeProfile(profile);
    return true;
  }
  return false;
}

async function removeFromBundles(pkgName) {
  const profile = await readProfile();
  const bundles = (profile.dsh?.profile?.bundles ?? []).filter((b) => b !== pkgName);
  if (profile.dsh?.profile) profile.dsh.profile.bundles = bundles;
  await writeProfile(profile);
  return bundles;
}

async function setEnabled(pkgName, enabled) {
  const profile = await readProfile();
  const bundles = profile.dsh?.profile?.bundles ?? [];
  const has = bundles.includes(pkgName);
  if (enabled && !has) bundles.push(pkgName);
  if (!enabled && has) {
    const idx = bundles.indexOf(pkgName);
    bundles.splice(idx, 1);
  }
  profile.dsh = profile.dsh ?? {};
  profile.dsh.profile = profile.dsh.profile ?? {};
  profile.dsh.profile.bundles = bundles;
  await writeProfile(profile);
  return enabled ? "enabled" : "disabled";
}

function listText(pkg) {
  const plugins = userPlugins(pkg);
  if (plugins.length === 0) return "(no user plugins installed)";
  return plugins.map((p) => `- ${p.name} (${p.version})`).join("\n");
}

async function runAction(req) {
  switch (req.action) {
    case "list":
    case "status": {
      const pkg = await readProfile();
      return listText(pkg);
    }
    case "install": {
      if (!req.package) return "Missing package name.";
      const out = await runDshPlugin(["add", req.package]);
      await ensureBundled(req.package);
      return "Installed " + req.package + ".\n" + out.split("\n").slice(-6).join("\n");
    }
    case "uninstall": {
      if (!req.package) return "Missing package name.";
      const out = await runDshPlugin(["remove", req.package]);
      await removeFromBundles(req.package);
      return "Uninstalled " + req.package + ".\n" + out.split("\n").slice(-6).join("\n");
    }
    case "update": {
      if (!req.package) return "Missing package name.";
      const out = await runDshPlugin(["update", req.package]);
      return "Updated " + req.package + ".\n" + out.split("\n").slice(-6).join("\n");
    }
    case "enable": {
      if (!req.package) return "Missing package name.";
      const state = await setEnabled(req.package, true);
      return req.package + " " + state + ".";
    }
    case "disable": {
      if (!req.package) return "Missing package name.";
      const state = await setEnabled(req.package, false);
      return req.package + " " + state + ".";
    }
    default:
      return "Unknown action: " + req.action;
  }
}

function apply(ctx) {
  installSettingsSection(ctx, NS, SCHEMA, { managed: [] }, {
    setSource: () => {},
    onChange: () => {},
  });

  const actionScope = ctx.settings.register(ACTION_NS, z.object({
    requestId: z.string(),
    request: z.string(),
    responseId: z.string(),
    response: z.string(),
  }), { base: {} });

  let lastRequestId = null;
  actionScope.watch(() => {
    const v = actionScope.get();
    if (!v || !v.requestId || v.requestId === lastRequestId) return;
    lastRequestId = v.requestId;
    let req;
    try { req = JSON.parse(v.request); } catch { return; }
    runAction(req).then(
      (result) => ctx.settings.replace(ACTION_NS, { ...v, responseId: v.requestId, response: JSON.stringify({ ok: true, result }) }),
      (error) => ctx.settings.replace(ACTION_NS, { ...v, responseId: v.requestId, response: JSON.stringify({ ok: false, error: String(error?.message ?? error) }) }),
    );
  });

  ctx.tools.register(defineTool({
    name: "dsh_plugin_manage",
    description:
      "Manage the custom DSH plugins in the web profile. Actions: 'list'/'status' (show installed user plugins), " +
      "'install' (add from npm), 'uninstall' (remove), 'update' (update a package), 'enable' (add to the active bundles), " +
      "'disable' (remove from the active bundles without uninstalling). Changes to the profile apply on the next DSH restart.",
    parameters: {
      action: {
        type: "string",
        enum: ["list", "status", "install", "uninstall", "update", "enable", "disable"],
        required: true,
        description: "What to do.",
      },
      package: {
        type: "string",
        description: "npm package name (for install/uninstall/update/enable/disable).",
      },
    },
    output: { schema: { type: "string" }, render: (_a, v) => [{ type: "text", text: v }] },
    async execute(args) {
      try {
        return await runAction({ action: args.action, package: args.package });
      } catch (error) {
        return `dsh_plugin_manage failed: ${error.message}`;
      }
    },
  }));
}

export { apply, inject, name };
