/**
 * Lifecycle callbacks for the `challenge` model.
 */

export default {
  /**
   * After update hook - check if currentStatus changed to 'voting'
   * and auto-publish all submissions
   */
  async afterUpdate(event) {
    const { result, params } = event;

    // Check if currentStatus was changed to 'voting'
    if (params.data?.currentStatus === 'voting' && result) {
      const strapi = (global as any).strapi;

      try {
        // Get the challenge with all projects
        const challenge = await strapi.documents('api::challenge.challenge').findOne({
          documentId: result.documentId,
          populate: ['projects'],
        });

        if (challenge?.projects && challenge.projects.length > 0) {
          // Update all submissions to public
          for (const project of challenge.projects) {
            await strapi.documents('api::project.project').update({
              documentId: project.documentId,
              data: {
                isPublic: true,
              },
            });

            // Publish the project
            await strapi.documents('api::project.project').publish({
              documentId: project.documentId,
            });
          }

          strapi.log.info(
            `Auto-published ${challenge.projects.length} submissions for challenge: ${challenge.title}`
          );
        }
      } catch (error) {
        strapi.log.error('Error in challenge afterUpdate lifecycle:', error);
      }
    }
  },

  /**
   * Before update hook - validate date relationships
   */
  async beforeUpdate(event) {
    const { params } = event;

    // If voting end date is being set, validate it's after voting start date
    if (params.data?.votingEndDate && params.data?.votingStartDate) {
      const startDate = new Date(params.data.votingStartDate);
      const endDate = new Date(params.data.votingEndDate);

      if (endDate <= startDate) {
        throw new Error('Voting end date must be after voting start date');
      }
    }

    // If challenge start date is being set, validate voting starts after it
    if (params.data?.startDate && params.data?.votingStartDate) {
      const challengeStart = new Date(params.data.startDate);
      const votingStart = new Date(params.data.votingStartDate);

      if (votingStart <= challengeStart) {
        throw new Error('Voting start date must be after challenge start date');
      }
    }
  },
};
