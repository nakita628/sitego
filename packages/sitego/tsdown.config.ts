import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    config: 'src/config/index.ts',
  },
  format: 'esm',
  dts: true,
  clean: true,
  fixedExtension: false,
})
