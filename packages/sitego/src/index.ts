#!/usr/bin/env node
import { sitego } from './cli/index.ts'

sitego().then((result) => {
  if (result.ok) {
    console.log(result.value)
    process.exit(0)
  } else {
    console.log(result.error)
    process.exit(1)
  }
})
