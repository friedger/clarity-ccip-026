/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CCIP_DEPLOYER?: string;
  readonly VITE_FAST_POOL_ADDRESS?: string;
  readonly VITE_FAST_POOL_NAME?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
