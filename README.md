# Jarloo Avenue

A small WebXR farming game set in Nantwich, Cheshire, for Meta Quest 2.

## Running it

Host the folder with any static server (GitHub Pages works) and open the URL in the Quest browser, then press **Enter VR**.

Controls:
- Point at the ground and pull the trigger to teleport.
- Point at a plot and pull the trigger to till, plant, water and harvest.
- Point at the market stall and pull the trigger to sell your harvest.

## Town data

Real buildings, shops and pubs come from OpenStreetMap:

```
node scripts/fetch-osm.mjs
```

This writes `data/nantwich.json`. Without it, the game shows a few generic placeholder blocks.

Map data © OpenStreetMap contributors, licensed under the Open Database Licence (ODbL). The game displays this attribution on screen.

## Status

Early prototype. Placeholder art, placeholder economy, and no multiplayer yet.
