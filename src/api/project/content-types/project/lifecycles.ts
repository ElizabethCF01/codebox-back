/**
 * Lifecycle callbacks for the `project` model.
 * Handles automated badge assignment for project-related achievements.
 */

export default {
  /**
   * After create hook - Award "First Project" badge
   * Triggered when a project is created
   */
  async afterCreate(event) {
    const { result } = event;

    if (!result) return;

    const strapi = (global as any).strapi;

    // Run badge logic asynchronously without blocking the response
    setImmediate(async () => {
      try {
        // Get the author ID from the created project
        // In Strapi v5, the author relation might be a direct ID reference
        const project = await strapi.documents('api::project.project').findOne({
          documentId: result.documentId,
          populate: ['author'],
        });

        if (!project?.author?.id) {
          strapi.log.debug('[BADGE] No author found for new project, skipping badge check');
          return;
        }

        const userId = project.author.id;

        // Check if this is the user's first project
        const badgeService = strapi.service('api::badge.badge');
        const projectCount = await badgeService.getUserProjectCount(userId);

        if (projectCount === 1) {
          // This is their first project
          await badgeService.assignBadgeToProfile(userId, 'first-project');
        }
      } catch (error) {
        strapi.log.error('[BADGE] Error in project afterCreate lifecycle:', error);
      }
    });
  },

  /**
   * After update hook - Award "Junior Star" badge when project reaches 3 likes
   * Triggered when a project is updated (including like changes)
   */
  async afterUpdate(event) {
    const { result, params } = event;

    if (!result || !params?.data) return;

    const strapi = (global as any).strapi;

    // Check if likes were updated before proceeding
    if (params.data.likes === undefined) {
      // Likes weren't changed, skip badge check
      return;
    }

    // Run badge logic asynchronously without blocking the response
    setImmediate(async () => {
      try {
        // Get the updated project with author
        const project = await strapi.documents('api::project.project').findOne({
          documentId: result.documentId,
          populate: ['author'],
        });

        if (!project?.author?.id) {
          strapi.log.debug('[BADGE] No author found for updated project, skipping badge check');
          return;
        }

        const userId = project.author.id;
        const currentLikes = project.likes || 0;

        // Check if the project just reached or exceeded 3 likes
        if (currentLikes >= 3) {
          // Award "Junior Star" badge
          // The assignBadgeToProfile method handles duplicate prevention
          const badgeService = strapi.service('api::badge.badge');
          await badgeService.assignBadgeToProfile(userId, 'junior-star');
        }
      } catch (error) {
        strapi.log.error('[BADGE] Error in project afterUpdate lifecycle:', error);
      }
    });
  },
};
