import { db } from '@/lib/db';

/** Default profile user id when auth is not implemented (single-user app). */
export const DEFAULT_USER_ID = 'default-profile-user';

export async function getDefaultUser() {
  let user = await db.user.findUnique({ where: { id: DEFAULT_USER_ID } });
  if (!user) {
    user = await db.user.create({
      data: {
        id: DEFAULT_USER_ID,
        name: 'Admin',
        email: 'admin@parkpilot.local',
      },
    });
  }
  return user;
}
