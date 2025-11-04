import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // 任意、普段どおりでOK
    proxy: {
      // /api へのアクセスを 3005 に転送
      "/api": {
        target: "http://localhost:3005",
        changeOrigin: true,
        secure: false,
        // backendが /api を期待してるなら rewrite は不要
        // rewrite: (path) => path.replace(/^\/api/, ''), // ←不要
      },
    },
  },
});
