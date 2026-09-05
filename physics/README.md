# Biosphere Blue physics kernels

Pure, unit-tested simulation kernels in SI units. Each file is a plain script
with a Node export guard, so the same bytes run under `node --test` and inline
in `BiosphereBlue.html`.

| file | what |
|---|---|
| `vec.js`  | 3-vector helpers |
| `mesh.js` | Goldberg polyhedron (subdivided icosahedron dual); `dualVerts` is the Voronoi ring used by the physics |
| `geom.js` | spherical finite-volume geometry: tile areas (m²), symmetric edge weights, conservative Laplacian |
| `ebm.js`  | energy-balance climate: true insolation with obliquity, Budyko OLR, Myhre forcing, two-stream albedo, snow feedback, Simpson-Nakajima runaway; Newton + preconditioned CG steady-state solver, explicit integrator for tests |

## Workflow

```
npm test              # node --test physics/test
npm run physics       # inline kernels into BiosphereBlue.html between the @@BEGIN/@@END markers
npm run physics:check # fail if the HTML regions are stale (use in pre-commit)
```

The kernel files are the source of truth for their regions in the HTML.
Everything outside the markers is hand-edited as before.

## Bridge constants (to be retired as tectonics moves to metres)

`ELEV_M_PER_UNIT = 5000`, `ICE_M_PER_UNIT = 4000` in `stepClimate` convert the
legacy unitless bedrock / ice fields into metres for the lapse rate.
