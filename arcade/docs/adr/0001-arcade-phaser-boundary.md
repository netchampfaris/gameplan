# Arcade uses Phaser in a root-level feature boundary

Arcade is implemented as a root-level `arcade/` frontend package imported by the Gameplan Vue app through `@arcade`, rather than as generic code under `frontend/src`. We chose Phaser over a custom Canvas engine because Arcade needs tilemaps, spritesheet animation, collisions, cameras, scenes, and future multiplayer interactions; Phaser lets the team focus on the social product layer instead of maintaining engine infrastructure.
