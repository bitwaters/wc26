import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // eslint-config-next 16.x preview 引入了两条过于激进的实验性规则：
    // - react-hooks/purity: 禁止在 render 中调用 Date.now() 等"不纯"函数
    // - react-hooks/set-state-in-effect: 禁止在 useEffect 中同步 setState
    // 这两种写法在 React 社区均属合法模式，规则本身尚未稳定，暂时关闭。
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);

export default eslintConfig;
