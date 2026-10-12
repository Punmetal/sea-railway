# Official Three.js r170 transpiler sources

Source: `examples/jsm/transpiler/{AST,GLSLDecoder,TSLEncoder}.js` in the official `three@0.170.0` npm package. MIT license retained in `LICENSE`.

`AST.js` and `GLSLDecoder.js` are unmodified. `TSLEncoder.js` has two local changes:

- Its Three.js import points to the pinned local r170 WebGPU bundle so its export lookup includes TSL symbols.
- `isPrimitive` recognizes leading-decimal literals and whitespace after unary minus. The stock encoder otherwise emits invalid expressions such as `.7.add(...)` and `- 2.4.add(...)`.

No ShaderToy adapter or runtime source evaluation is used. The generator commits readable TSL output.
