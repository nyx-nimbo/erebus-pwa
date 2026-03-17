import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		port: 3001,
		proxy: {
			'/api': {
				target: 'https://api-erebus.nimbo.pro',
				changeOrigin: true,
				secure: true
			}
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: false,
			injectRegister: 'auto',
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/accounts\.google\.com/,
						handler: 'NetworkOnly'
					}
				]
			}
		})
	]
});
