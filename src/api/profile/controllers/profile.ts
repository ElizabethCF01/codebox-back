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
      const profiles = await strapi.documents('api::profile.profile').findMany({
        filters: {
          user: {
            documentId: {
              $eq: user.documentId,
            },
          },
        },
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

      if (!profiles || profiles.length === 0) {
        return ctx.notFound('Profile not found');
      }

      return profiles[0];
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
      const profiles = await strapi.documents('api::profile.profile').findMany({
        filters: {
          user: {
            documentId: {
              $eq: user.documentId,
            },
          },
        },
      });

      if (!profiles || profiles.length === 0) {
        return ctx.notFound('Profile not found');
      }

      const { bio, githubUser } = ctx.request.body;

      const updatedProfile = await strapi.documents('api::profile.profile').update({
        documentId: profiles[0].documentId,
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
      });

      return updatedProfile;
    } catch (error) {
      ctx.throw(500, error);
    }
  },
}));
