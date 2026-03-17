# Erebus PWA

Progressive Web App that mirrors the Nyx Command Center desktop experience.

## Stack
- SvelteKit (SPA mode via adapter-static)
- Svelte 5 with runes ($state, $derived, $effect)
- Vite + @vite-pwa/sveltekit
- TypeScript
- Tailwind CSS v4 (dark theme)

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - TypeScript/Svelte checks

## Architecture
- `src/lib/api.ts` - Fetch wrapper with JWT auth, all API calls
- `src/lib/auth.ts` - Google OAuth via GSI, JWT management
- `src/lib/stores.ts` - Svelte stores (user, auth state)
- `src/lib/types.ts` - TypeScript interfaces matching Erebus API
- SPA mode: SSR disabled, adapter-static with fallback

## API
Connects to Erebus API at PUBLIC_API_URL (default http://localhost:8080/api).
Authentication: Google OAuth → JWT stored in localStorage.

## Theme
Dark theme: bg #0a0a0a, sidebar #111, cards #1a1a1a, accent #7c3aed, border #262626.
