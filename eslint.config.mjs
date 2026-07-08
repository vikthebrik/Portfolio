import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: ['.next/**', '.velite/**', 'node_modules/**', 'next-env.d.ts'],
  },
  // The graph is deliberately imperative (see CLAUDE.md): one long-lived d3
  // simulation whose node objects are mutated in place, a ref-based bridge read
  // during render (no re-render storms), and hydration-time setState. The React
  // Compiler lint rules assume compiler-managed purity these components opt out of.
  {
    files: [
      'components/ForceGraph.tsx',
      'components/GraphBridge.tsx',
      'components/GraphExplorer.tsx',
      'components/Minimap.tsx',
    ],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]

export default eslintConfig
