import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

const readOnlyStaticAssetsCache = {
  name: staticAssetsIncrementalCache.name,
  get: staticAssetsIncrementalCache.get.bind(staticAssetsIncrementalCache),
  // Next can attempt cache writes for unknown 404 routes. Static assets are read-only.
  set: async () => {},
  delete: async () => {},
};

export default defineCloudflareConfig({
  incrementalCache: readOnlyStaticAssetsCache,
  enableCacheInterception: true,
});
