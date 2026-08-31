# dsh-plugins-manager

> **Jazyk:** [Česky](README.cs.md) · [English](README.md)

Plugin pro DeepSeek Harness, který ti dává GUI a nástroj volaný z modelu pro
ovládání tvých custom DSH pluginů — výpis, instalace, aktualizace,
odinstalace, zapnutí a vypnutí.

## Funkce

- **Nástroj `dsh_plugin_manage`** — volá se z modelu: `list`/`status`,
  `install`, `uninstall`, `update`, `enable`, `disable`.
- **Sekce nastavení „Plugin Manager"** — zadej název balíčku a klikni na
  Install / Update / Uninstall / Enable / Disable / Refresh.
- Pracuje s profilem `web` v `~/.dsh/profiles/web`.

## Instalace

```sh
dsh plugin --profile web add dsh-plugins-manager
```

Poté přidej `dsh-plugins-manager` do `dsh.profile.bundles` a `dependencies` v
`~/.dsh/profiles/web/package.json` a spusť `dsh plugin --profile web install`.

## Použití

Zeptej se agenta:

- `dsh_plugin_manage action=list` — výpis nainstalovaných uživatelských pluginů.
- `dsh_plugin_manage action=install package=dsh-image-studio` — instalace z npm.
- `dsh_plugin_manage action=disable package=dsh-image-studio` — vypnutí (zůstává nainstalován).
- `dsh_plugin_manage action=uninstall package=dsh-image-studio` — odstranění.

> Změny v profilu se projeví až po příštím restartu DSH.

## Jak to funguje

- **Host** (`lib/index.js`) čte/zapisuje `~/.dsh/profiles/web/package.json`
  (`dsh.profile.bundles` + `dependencies`) a volá
  `dsh plugin --profile web <add|remove|update>`.
- **Client** (`lib/client.js`) je `settings.section`, jehož tlačítka zapisují
  požadavek do settings namespace `plugins-manager-action`; host tento
  namespace sleduje a akci vykoná.

## Licence

MIT
