ANIMATION SPECIFICATION
=======================

Global:
- use transform/opacity for UI motion
- ease-out for interactions
- avoid excessive bounce
- respect reduced-motion preference where possible

CLOUD_DRIFT
duration 40–70s
loop true
movement left→right
opacity subtle

TREE_IDLE
duration 2.5–4s
loop true
rotate ±1–2deg around trunk/base
very subtle

GRASS_IDLE
duration 2–3s
loop true
scale/rotate tiny amount

WINDMILL
continuous rotation
slow, steady
no visible jump at loop

WATER_RIPPLE
duration 2–4s
loop
use radial/opacity movement

FISH_SWIM
duration 3–7s
randomized paths inside pond
occasionally pause
occasional jump

CHICKEN_IDLE
2–4s
head/neck micro movement

CHICKEN_WALK
0.7–1.2s per step cycle
random short walks

CHICKEN_PECK
1–2s
head dip + recover

COW_IDLE
3–5s
breathing/head/tail micro motion

COW_WALK
1–1.5s per cycle

CROP_GROW
transition 400–800ms
scale from 0.8 → 1.0
small ease-out

HOE
250–450ms
tool movement + dirt particles

WATER
300–600ms
splash + soil color transition

PLANT
350–700ms
seed pop + tiny sparkle

HARVEST
500–900ms
crop pop + particles + item fly-to-inventory

REWARD_FLOAT
800–1200ms
move upward 40–70px
fade to 0

COIN_COUNTER
300–500ms
smooth numeric interpolation + icon pulse

XP_BAR
300–600ms
smooth fill

LEVEL_UP
1200–2000ms
badge scale + glow + particles

PANEL_OPEN
150–250ms
opacity 0→1 + scale .96→1

PANEL_CLOSE
120–200ms
opacity 1→0 + scale 1→.98
