#!/bin/sh
cd "$(dirname "$0")" && cat 1_core.js 2_data.js 2b_gear.js 2c_tree.js 2d_backdrop.js 3_battle.js 3b_boss.js 4_ui.js 4b_admin.js 5_main.js > ../js/game.js && node --check ../js/game.js && echo built
