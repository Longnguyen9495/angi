GAMEPLAY SPECIFICATION
=====================

Core loop:
Observe farm → choose tool → interact → receive feedback → earn resources → expand/progress.

Farm tile states:
EMPTY
TILLED
PLANTED
WATERED
GROWING
MATURE
HARVESTABLE

Example crop definitions:
Carrot: 20s prototype growth, harvest 2–4, XP 5
Tomato: 25s, harvest 2–5, XP 7
Corn: 30s, harvest 2–4, XP 8
Wheat: 15s, harvest 2–3, XP 4
Pumpkin: 35s, harvest 1–3, XP 10

Tools:
Hoe
Watering Can
Seed Bag
Harvest Basket
Fishing Rod

Resources:
Coins
XP
Energy
Seeds
Crops
Fish
Materials
Animal Products

Animals:
Chicken produces eggs.
Cow produces milk.
Production can be simplified for prototype.

Fishing:
Dock/pond is clickable.
Cast → wait → bite → catch.
Random fish table can be used.

Save:
localStorage.
Persist all game state after important mutations.

Important:
Prototype timers are intentionally short (15–35s).
Do not create real-time multiplayer or backend dependency unless explicitly requested.
