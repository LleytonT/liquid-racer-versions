# Liquid Racer versions

Every version of [Liquid Racer](https://liquid-racer.vercel.app) that players have built, one commit each.

Liquid Racer is a racing game its players rebuild as they play. A player races a version, describes a change, and a software factory (PM, Designer, Builder, QA) builds it. If it passes the bot races and the player approves their preview, it is published, and committed here.

## How to read this repo

- **Each branch under `versions/` is one version of the game.** Its tip is the commit that created it.
- **Each commit's parent is the version it was built from**, so the git history has the same shape as the graph on the site.
- **The diff of a commit is exactly what the factory changed** to turn the parent into this version.
- **The commit message** carries the player's request, who asked, and the bot-race results.
- **`version.json`** in each commit holds the same record as data, with the spec the PM wrote and the Designer's design.
- **`game/`** is the version's full source. It runs against a frozen kernel that lives in the [platform repo](https://github.com/LleytonT/liquid-racer).

`main` holds only this README. Nothing here is edited by hand; the factory writes it.
