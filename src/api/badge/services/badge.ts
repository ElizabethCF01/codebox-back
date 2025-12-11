/**
 * badge service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::badge.badge', ({ strapi }) => ({
  /**
   * Check if a user's profile already has a specific badge
   * @param userId - The user's ID (not documentId)
   * @param badgeSlug - The badge slug to check
   * @returns boolean - true if user has badge, false otherwise
   */
  async userHasBadge(userId: number, badgeSlug: string): Promise<boolean> {
    try {
      // Find the user's profile
      const profiles = await strapi.documents('api::profile.profile').findMany({
        filters: {
          user: {
            id: userId,
          },
        },
        populate: ['badges'],
      });

      if (!profiles || profiles.length === 0) {
        strapi.log.warn(`[BADGE] No profile found for user ${userId}`);
        return false;
      }

      const profile = profiles[0];

      // Check if any of the profile's badges match the slug
      const hasBadge = profile.badges?.some((badge: any) => badge.slug === badgeSlug) || false;

      return hasBadge;
    } catch (error) {
      strapi.log.error(`[BADGE] Error checking if user ${userId} has badge ${badgeSlug}:`, error);
      return false;
    }
  },

  /**
   * Assign a badge to a user's profile
   * Handles duplicate prevention and logging
   * @param userId - The user's ID (not documentId)
   * @param badgeSlug - The badge slug to assign
   * @returns boolean - true if badge was assigned, false if already had it or error
   */
  async assignBadgeToProfile(userId: number, badgeSlug: string): Promise<boolean> {
    try {
      // First, check if user already has the badge
      const alreadyHasBadge = await this.userHasBadge(userId, badgeSlug);

      if (alreadyHasBadge) {
        strapi.log.debug(`[BADGE] User ${userId} already has badge: ${badgeSlug}`);
        return false;
      }

      // Find the badge by slug
      const badges = await strapi.documents('api::badge.badge').findMany({
        filters: {
          slug: badgeSlug,
        },
        status: 'published',
      });

      if (!badges || badges.length === 0) {
        strapi.log.error(`[BADGE] Badge not found with slug: ${badgeSlug}`);
        return false;
      }

      const badge = badges[0];

      // Find the user's profile
      const profiles = await strapi.documents('api::profile.profile').findMany({
        filters: {
          user: {
            id: userId,
          },
        },
      });

      if (!profiles || profiles.length === 0) {
        strapi.log.warn(`[BADGE] No profile found for user ${userId}, cannot assign badge`);
        return false;
      }

      const profile = profiles[0];

      // Connect the badge to the profile
      await strapi.documents('api::profile.profile').update({
        documentId: profile.documentId,
        data: {
          badges: {
            connect: [badge.id], // Use physical ID for connection
          } as any,
        },
      });

      // Publish the profile update
      await strapi.documents('api::profile.profile').publish({
        documentId: profile.documentId,
      });

      strapi.log.info(`[BADGE] ✓ Awarded "${badge.name}" badge to user ${userId}`);
      return true;
    } catch (error) {
      strapi.log.error(`[BADGE] Error assigning badge ${badgeSlug} to user ${userId}:`, error);
      return false;
    }
  },

  /**
   * Get count of projects created by a user
   * @param userId - The user's ID
   * @returns number - Count of projects
   */
  async getUserProjectCount(userId: number): Promise<number> {
    try {
      // Use raw SQL for performance
      const result = await strapi.db.connection.raw(`
        SELECT COUNT(DISTINCT p.document_id) as total
        FROM projects p
        INNER JOIN projects_author_lnk pa ON p.id = pa.project_id
        WHERE pa.user_id = ?
        AND p.published_at IS NOT NULL
      `, [userId]);

      const rows = Array.isArray(result) ? result : result.rows || [];
      return rows[0]?.total || 0;
    } catch (error) {
      strapi.log.error(`[BADGE] Error getting project count for user ${userId}:`, error);
      return 0;
    }
  },

  /**
   * Check if any of user's projects have reached the like threshold
   * @param userId - The user's ID
   * @param likeThreshold - Number of likes required
   * @returns boolean - true if any project has reached threshold
   */
  async userHasProjectWithLikes(userId: number, likeThreshold: number): Promise<boolean> {
    try {
      // Use raw SQL for performance
      const result = await strapi.db.connection.raw(`
        SELECT COUNT(*) as count
        FROM projects p
        INNER JOIN projects_author_lnk pa ON p.id = pa.project_id
        WHERE pa.user_id = ?
        AND p.published_at IS NOT NULL
        AND p.likes >= ?
        LIMIT 1
      `, [userId, likeThreshold]);

      const rows = Array.isArray(result) ? result : result.rows || [];
      return (rows[0]?.count || 0) > 0;
    } catch (error) {
      strapi.log.error(`[BADGE] Error checking project likes for user ${userId}:`, error);
      return false;
    }
  },
}));
