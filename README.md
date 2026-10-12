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

This writes `data/nantwich.json`. If it is present, the game uses those real footprints.

## Map anchors

`data/nantwich-anchors.json` holds the layout the game is built on: the Square, the main streets, the River Weaver, the Shropshire Union Canal, the Brookfield allotments, and the pubs and landmarks. Each point has a `verified` flag. Items marked `false` are estimates (street widths, the Square's extent, river and canal centrelines, allotment position) and should be replaced with OSM geometry when available.

Without the OSM file, the game generates terraced houses along each street.

Map data © OpenStreetMap contributors, licensed under the Open Database Licence (ODbL). The game displays this attribution on screen.

## Status

Early prototype. Placeholder art, placeholder economy, and no multiplayer yet.
