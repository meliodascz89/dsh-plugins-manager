# dsh-plugins-manager

> **Language:** [English](README.md) · [Česky](README.cs.md)

DeepSeek Harness plugin that gives you a GUI and a model-callable tool to
control your custom DSH plugins — list, install, update, uninstall, enable and
disable them.

## Features

- **`dsh_plugin_manage` tool** — model-callable `list`/`status`, `install`,
  `uninstall`, `update`, `enable`, `disable`.
- **Settings section "Plugin Manager"** — type a package name and click
  Install / Update / Uninstall / Enable / Disable / Refresh.
- Operates on the `web` profile at `~/.dsh/profiles/web`.

## Install

```sh
dsh plugin --profile web add dsh-plugins-manager
```

Then add `dsh-plugins-manager` to `dsh.profile.bundles` and `dependencies` in
`~/.dsh/profiles/web/package.json`, and run `dsh plugin --profile web install`.

## Usage

Ask the agent:

- `dsh_plugin_manage action=list` — show installed user plugins.
- `dsh_plugin_manage action=install package=dsh-image-studio` — install from npm.
- `dsh_plugin_manage action=disable package=dsh-image-studio` — disable (keep installed).
- `dsh_plugin_manage action=uninstall package=dsh-image-studio` — remove.

> Profile changes take effect after the next DSH restart.

## How it works

- **Host** (`lib/index.js`) reads/writes `~/.dsh/profiles/web/package.json`
  (`dsh.profile.bundles` + `dependencies`) and shells out to
  `dsh plugin --profile web <add|remove|update>`.
- **Client** (`lib/client.js`) is a `settings.section` whose buttons write an
  action request into the `plugins-manager-action` settings namespace; the host
  watches that namespace and executes the action.

## License

MIT
