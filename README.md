# Oricade

Browser-based, multi-level 3D arcade game. Static site, no backend. See [SPEC.md](./SPEC.md) for the full design (levels, controls, physics, multiplayer).

## Status

Pre-implementation. Work is tracked as GitHub issues, starting with foundations (#2–#6), then one issue per level (#7–#14), then polish (#15) and multiplayer (#16). Each issue lands a strictly more-playable state than the last — see the issue list for the build order.

## Getting started

Not scaffolded yet — issue #2 sets up the build tooling and a running Three.js scene. Once that lands:

```bash
npm install
npm run dev    # local dev server
npm run build  # static production bundle
npm test       # test suite
```
