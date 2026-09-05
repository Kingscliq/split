import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const splitEnv = loadEnv(mode, "../../frontend", "NEXT_PUBLIC_");

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_SPLIT_CONTRACT_ID": JSON.stringify(
        splitEnv.NEXT_PUBLIC_SPLIT_CONTRACT_ID ?? "",
      ),
      "import.meta.env.VITE_XLM_TOKEN_CONTRACT": JSON.stringify(
        splitEnv.NEXT_PUBLIC_XLM_TOKEN_CONTRACT ?? "",
      ),
    },
  };
});
