import { Platform } from "./chess";

export interface UserPlatform {
  id: string;
  user_id: string;
  platform: Platform;
  platform_username: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}
