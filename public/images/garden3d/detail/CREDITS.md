# Detail textures (3D garden)

Greyscale, 256 px, contrast-normalised versions of CC0 textures from Poly Haven
(https://polyhaven.com, license: CC0 1.0 — https://polyhaven.com/license). No attribution
is required; credited here anyway.

| File | Poly Haven asset | Used for |
| --- | --- | --- |
| fine-grained-wood.jpg | fine_grained_wood | boards, posts, beams |
| rock-face.jpg | rock_face | cliff rocks, well, flagstones |
| farm-soil.jpg | farm_soil | bed soil, earth band, pen floor |
| leafy-grass.jpg | leafy_grass | lawn |
| clay-plaster.jpg | clay_plaster | roof tiles, clay jars |
| pine-bark.jpg | pine_bark | tree trunks |
| forest-leaves-02.jpg | forest_leaves_02 | leaf mottling |
| rough-linen.jpg | rough_linen | awning, sacks, scarecrow shirt |

Regenerate: download the 1k diffuse JPGs next to `scripts/garden3d/pack-detail.html`,
serve that folder with `php -S 127.0.0.1:8111` (uses `save-detail.php` renamed to `save.php`),
open `pack-detail.html` and run `run()` in the console.
