import adapter from '@sveltejs/adapter-auto';
// Alternative adapters if auto doesn't work:
// import adapter from '@sveltejs/adapter-static';  // For static sites
// import adapter from '@sveltejs/adapter-node';    // For Node.js servers
// import adapter from '@sveltejs/adapter-netlify'; // For Netlify
// import adapter from '@sveltejs/adapter-vercel';  // For Vercel

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// If using static adapter, uncomment this:
		// prerender: {
		// 	handleHttpError: 'warn'
		// }
	}
};

export default config;