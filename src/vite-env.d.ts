/// <reference types="vite/client" />

interface ImportMetaEnv {
  // C-05: VITE_SUPABASE_ANON_KEY removed — the frontend never talks to Supabase
  // directly; all data flows through the authenticated REST backend (apiClient).
  readonly VITE_SUPABASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'react-icons' {
  export interface IconBaseProps extends React.SVGAttributes<SVGElement> {
    children?: React.ReactNode;
    size?: string | number;
    color?: string;
    title?: string;
    className?: string;
    style?: React.CSSProperties;
  }
}
