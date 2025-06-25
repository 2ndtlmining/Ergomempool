import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	preview: {
		host: '0.0.0.0',
		port: 4173,
		allowedHosts: [
			'ergomempool.com',
			'www.ergomempool.com',
			'localhost',
			'127.0.0.1'
		]
	},
	server: {
		host: '0.0.0.0',
		port: 3000,
		allowedHosts: [
			'ergomempool.com',
			'www.ergomempool.com',
			'localhost',
			'127.0.0.1'
		],
		// FIXED: Use localhost for HMR to avoid 0.0.0.0:5173 errors
		hmr: {
			port: 3000,
			host: 'localhost'
		},
		// Increase timeout to prevent connection drops
		timeout: 60000
	},
	build: {
		// Simplified build options - remove problematic manual chunks
		minify: 'terser',
		sourcemap: process.env.NODE_ENV !== 'production'
	}
});