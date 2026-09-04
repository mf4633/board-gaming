# SKYSTACK headless checks

Playwright drives `Tower.html` in headless Chromium (no build step). Playwright lives in `../hc-refactored/node_modules`:

    NODE_PATH=../hc-refactored/node_modules node tests/elevator_harness.js all 3     # transport: trips, waits, stuck riders, stalled cars
    NODE_PATH=../hc-refactored/node_modules node tests/weather_check.js 120 out/    # weather generator + sun/moon per city, screenshots
    NODE_PATH=../hc-refactored/node_modules node tests/econ_check.js 400 out/       # UI new-game flow, 400-day economy, save/load v2+v3
    NODE_PATH=../hc-refactored/node_modules node tests/shots.js out/                # sky/weather screenshots at several times and dates

A healthy elevator run shows `stuck=0 stalls=0`; stress scenarios are expected to show long waits (that is the "build more elevators" pressure), never stuck riders.
