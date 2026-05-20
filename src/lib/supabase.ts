type SupabaseRuntimeConfig = {
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
};

export function getSupabaseClientConfig(): Pick<SupabaseRuntimeConfig, "url" | "anonKey"> {
  return {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  };
}

export function getSupabaseServerConfig(): SupabaseRuntimeConfig {
  return {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

export function assertSupabaseStorageConfigured() {
  const config = getSupabaseServerConfig();
  if (!config.url || !config.serviceRoleKey) {
    throw new Error("Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
  }
  return config;
}
