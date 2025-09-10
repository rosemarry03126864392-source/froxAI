import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Your existing config starts here
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // ADD THESE BLOCKS TO FIX THE DEPLOYMENT
      server: {
        host: true, // Allows Vite to be accessible from the network
        port: 10000, // The port Render expects
      },
      preview: {
        host: true, // Allows the preview server to be accessible
        port: 10000, // The port Render expects
        allowedHosts: ['froxai.onrender.com'], // THIS IS THE FIX
      }
    };
});
