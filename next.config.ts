import type { NextConfig } from "next";

function getSupabaseGalleryRemotePatterns(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return [];
  }

  try {
    const parsedUrl = new URL(supabaseUrl);
    const protocol = parsedUrl.protocol.replace(":", "") as "http" | "https";

    return [
      {
        protocol,
        hostname: parsedUrl.hostname,
        pathname: "/storage/v1/object/public/gallery-images/**",
        search: "",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: getSupabaseGalleryRemotePatterns(),
  },
};

export default nextConfig;
