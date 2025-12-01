/**
 * profile controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::profile.profile', ({ strapi }) => ({
  async me(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    try {
      const profile = await strapi.entityService.findMany('api::profile.profile', {
        filters: { user: user.id },
        populate: {
          user: {
            fields: ['id', 'username', 'email']
          },
          badges: true,
          completedChallenges: true,
          projects: {
            populate: {
              likedBy: true,
              comments: true,
              tag: true,
            }
          }
        },
      });

      if (!profile || profile.length === 0) {
        return ctx.notFound('Profile not found');
      }

      return profile[0];
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async updateMe(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    try {
      const profile = await strapi.entityService.findMany('api::profile.profile', {
        filters: { user: user.id },
      });

      if (!profile || profile.length === 0) {
        return ctx.notFound('Profile not found');
      }

      const { bio, githubUser } = ctx.request.body;

      const updatedProfile = await strapi.entityService.update(
        'api::profile.profile',
        profile[0].id,
        {
          data: {
            bio,
            githubUser,
          },
          populate: {
            user: {
              fields: ['id', 'username', 'email']
            },
            badges: true,
            completedChallenges: true,
            projects: true,
          },
        }
      );

      return updatedProfile;
    } catch (error) {
      ctx.throw(500, error);
    }
  },
}));
