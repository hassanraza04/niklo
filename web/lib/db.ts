import { getCloudflareContext } from "@opennextjs/cloudflare";

// async form works both during requests and in generateStaticParams / build.
export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}
