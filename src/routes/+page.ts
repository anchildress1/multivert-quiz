// The quiz lives entirely in the browser: answers are held in $state +
// localStorage, with no server-side personalisation to render. Disabling SSR
// avoids hydration mismatches and removes any risk of state leaking across
// requests in a Cloudflare Worker (where module-scoped reactive state would
// otherwise be shared between concurrent renders).
//
// Prerendering produces a static HTML shell at build time so first-paint
// stays fast on Cloudflare Pages without paying for SSR per request.
export const ssr = false;
export const prerender = true;
