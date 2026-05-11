import https from "node:https";
import type { IncomingMessage } from "node:http";
import { createClient } from "@supabase/supabase-js";
import {
  GALLERY_STORAGE_BUCKET,
  type GalleryImageRecord,
} from "@/app/admin/gallery/_lib/gallery-constants";
import {
  formatSupabaseError,
  type SupabaseErrorDetails,
} from "@/app/lib/supabase-errors";

export type GalleryServiceConfig = {
  serviceKey: string;
  supabaseUrl: string;
};

type GalleryRequestResult<T> = {
  data: T | null;
  error: SupabaseErrorDetails | null;
};

const developmentHttpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === "production",
});

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SECRET_KEY
  );
}

function formatResponseError(
  status: number,
  fallbackMessage: string,
  body: string,
): SupabaseErrorDetails {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;

    return {
      ...formatSupabaseError(parsed),
      status,
      message:
        typeof parsed.message === "string" && parsed.message
          ? parsed.message
          : fallbackMessage,
    };
  } catch {
    return {
      status,
      message: fallbackMessage,
      details: body || null,
    };
  }
}

function normalizeRequestError(error: unknown): SupabaseErrorDetails {
  return formatSupabaseError(error);
}

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function createRestUrl(config: GalleryServiceConfig, table: string) {
  return new URL(`/rest/v1/${table}`, config.supabaseUrl);
}

function requestText(
  url: URL,
  init: {
    body?: Buffer | string;
    headers: Record<string, string>;
    method: "DELETE" | "GET" | "POST";
  },
) {
  return new Promise<{
    body: string;
    statusCode: number;
    statusMessage: string;
  }>((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: init.method,
        agent: developmentHttpsAgent,
        headers: {
          ...init.headers,
          ...(init.body
            ? { "Content-Length": Buffer.byteLength(init.body) }
            : {}),
        },
      },
      (response: IncomingMessage) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            statusCode: response.statusCode ?? 500,
            statusMessage: response.statusMessage ?? "Supabase request failed",
          });
        });
      },
    );

    request.on("error", reject);

    if (init.body) {
      request.write(init.body);
    }

    request.end();
  });
}

async function requestJson<T>(
  config: GalleryServiceConfig,
  url: URL,
  init: {
    body?: unknown;
    method?: "DELETE" | "GET" | "POST";
    prefer?: string;
  } = {},
): Promise<GalleryRequestResult<T>> {
  const body = init.body ? JSON.stringify(init.body) : undefined;

  try {
    const response = await requestText(url, {
      method: init.method ?? "GET",
      body,
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return {
        data: null,
        error: formatResponseError(
          response.statusCode,
          response.statusMessage,
          response.body,
        ),
      };
    }

    return {
      data: response.body ? (JSON.parse(response.body) as T) : null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: normalizeRequestError(error),
    };
  }
}

export function getGalleryServiceStatus() {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}

export function getGalleryServiceConfig(): GalleryServiceConfig | null {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return {
    serviceKey,
    supabaseUrl,
  };
}

export function getGalleryPublicImageUrl(
  config: GalleryServiceConfig,
  storagePath: string,
) {
  const supabase = createClient(config.supabaseUrl, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data } = supabase.storage
    .from(GALLERY_STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

export async function uploadGalleryStorageObject(
  config: GalleryServiceConfig,
  storagePath: string,
  fileBuffer: Buffer,
  contentType: string,
): Promise<GalleryRequestResult<unknown>> {
  const encodedPath = encodeStoragePath(storagePath);
  const url = new URL(
    `/storage/v1/object/${GALLERY_STORAGE_BUCKET}/${encodedPath}`,
    config.supabaseUrl,
  );

  try {
    const response = await requestText(url, {
      method: "POST",
      body: fileBuffer,
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Cache-Control": "31536000",
        "Content-Type": contentType,
        "x-upsert": "false",
      },
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return {
        data: null,
        error: formatResponseError(
          response.statusCode,
          response.statusMessage,
          response.body,
        ),
      };
    }

    return {
      data: response.body ? (JSON.parse(response.body) as unknown) : null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: normalizeRequestError(error),
    };
  }
}

export async function removeGalleryStorageObject(
  config: GalleryServiceConfig,
  storagePath: string,
) {
  const url = new URL(
    `/storage/v1/object/${GALLERY_STORAGE_BUCKET}`,
    config.supabaseUrl,
  );

  return requestJson<unknown>(config, url, {
    method: "DELETE",
    body: {
      prefixes: [storagePath],
    },
  });
}

export async function insertGalleryImageRecord(
  config: GalleryServiceConfig,
  payload: Pick<GalleryImageRecord, "alt_text" | "image_url" | "storage_path">,
) {
  const url = createRestUrl(config, "gallery_images");

  url.searchParams.set("select", "id");

  return requestJson<GalleryImageRecord[]>(config, url, {
    method: "POST",
    body: payload,
    prefer: "return=representation",
  });
}

export async function selectGalleryImageStoragePath(
  config: GalleryServiceConfig,
  id: string,
): Promise<
  GalleryRequestResult<Pick<GalleryImageRecord, "storage_path">>
> {
  const url = createRestUrl(config, "gallery_images");

  url.searchParams.set("select", "storage_path");
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("limit", "1");

  const result = await requestJson<
    Array<Pick<GalleryImageRecord, "storage_path">>
  >(config, url);

  if (result.error) {
    return {
      data: null,
      error: result.error,
    };
  }

  return {
    data: result.data?.[0] ?? null,
    error: null,
  };
}

export async function deleteGalleryImageRecord(
  config: GalleryServiceConfig,
  id: string,
) {
  const url = createRestUrl(config, "gallery_images");

  url.searchParams.set("id", `eq.${id}`);

  return requestJson<null>(config, url, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}
