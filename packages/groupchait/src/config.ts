import dotenv from 'dotenv';
dotenv.config();

export interface BridgeConfig {
  rocketchat: {
    url: string;
    adminUser: string;
    adminPassword: string;
  };
  paperclip: {
    apiUrl: string;
    apiKey: string;
    companyId: string;
  };
}

export function loadConfig(): BridgeConfig {
  const rc_url = process.env.ROCKETCHAT_URL;
  const rc_user = process.env.ROCKETCHAT_ADMIN_USER;
  const rc_pass = process.env.ROCKETCHAT_ADMIN_PASSWORD;
  const pc_url = process.env.PAPERCLIP_API_URL;
  const pc_key = process.env.PAPERCLIP_API_KEY;
  const pc_company = process.env.PAPERCLIP_COMPANY_ID;

  if (!rc_url || !rc_user || !rc_pass) {
    throw new Error('Missing ROCKETCHAT_URL, ROCKETCHAT_ADMIN_USER, or ROCKETCHAT_ADMIN_PASSWORD');
  }
  if (!pc_url || !pc_key || !pc_company) {
    throw new Error('Missing PAPERCLIP_API_URL, PAPERCLIP_API_KEY, or PAPERCLIP_COMPANY_ID');
  }

  return {
    rocketchat: { url: rc_url.replace(/\/$/, ''), adminUser: rc_user, adminPassword: rc_pass },
    paperclip: { apiUrl: pc_url.replace(/\/$/, ''), apiKey: pc_key, companyId: pc_company },
  };
}
