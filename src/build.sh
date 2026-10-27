#!/bin/sh
cd "$(dirname "$0")" && cat 1_core.js 2_data.js 3_battle.js 3b_boss.js 4_ui.js 5_main.js > ../js/game.js && node --check ../js/game.js && echo built
