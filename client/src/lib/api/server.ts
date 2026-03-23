const DEFAULT_API_URL = "http://server:3001";
const DEFAULT_ORGANIZATION_ID = "10000000-0000-4000-8000-000000000001";
const DEFAULT_APPLICATION_ID = "20000000-0000-4000-8000-000000000001";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function getDefaultOrganizationId(): string {
  return process.env.NEXT_PUBLIC_ORGANIZATION_ID || DEFAULT_ORGANIZATION_ID;
}

export function getDefaultApplicationId(): string {
  return process.env.NEXT_PUBLIC_APPLICATION_ID || DEFAULT_APPLICATION_ID;
}
