import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    bin: 'src/bin.ts',
    config: 'src/config/index.ts',
    core: 'src/core/index.ts',
  },
  format: 'esm',
  dts: true,
  clean: true,
  fixedExtension: false,
})
