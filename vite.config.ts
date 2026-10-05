import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
// base './' = relative asset paths: works on Vercel, Netlify and GitHub Pages sub-paths.
export default defineConfig({base:'./',plugins:[react()],server:{host:true}});
