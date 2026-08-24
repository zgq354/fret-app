import { defineConfig } from 'vite'
import { localEdge } from './fwa.config.ts'

export default defineConfig(localEdge.loaderConfig())
