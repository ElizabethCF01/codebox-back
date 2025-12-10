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
      // Buscar el perfil publicado del usuario
      const profiles = await strapi.documents('api::profile.profile').findMany({
        filters: {
          user: {
            documentId: {
              $eq: user.documentId,
            },
          },
        },
        status: 'published', // Solo obtener la versión publicada
        populate: {
          user: {
            fields: ['id', 'username', 'email']
          },
          badges: true,
          completedChallenges: true,
          projects: {
            filters: {
              publishedAt: {
                $notNull: true,
              },
            },
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

      // Count liked projects
      const likedProjectsCount = await strapi.db.query('api::project.project').count({
        where: {
          likedBy: {
            documentId: user.documentId,
          },
        },
      });

      return {
        ...profiles[0],
        likedProjectsCount,
      };
    } catch (error) {
      strapi.log.error('Error in me:', error);
      ctx.throw(500, error);
    }
  },

  async updateMe(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    try {
      // Buscar el perfil del usuario (versión publicada)
      const profiles = await strapi.documents('api::profile.profile').findMany({
        filters: {
          user: {
            documentId: {
              $eq: user.documentId,
            },
          },
        },
        status: 'published',
      });

      if (!profiles || profiles.length === 0) {
        return ctx.notFound('Profile not found');
      }

      const { bio, githubUser } = ctx.request.body;

      // Actualizar el documento
      await strapi.documents('api::profile.profile').update({
        documentId: profiles[0].documentId,
        data: {
          bio,
          githubUser,
        },
      });

      await strapi.documents('api::profile.profile').publish({
        documentId: profiles[0].documentId,
      });

      // Obtener el perfil actualizado y publicado con populate
      const finalProfile = await strapi.documents('api::profile.profile').findOne({
        documentId: profiles[0].documentId,
        status: 'published',
        populate: {
          user: {
            fields: ['id', 'username', 'email']
          },
          badges: true,
          completedChallenges: true,
          projects: {
            filters: {
              publishedAt: {
                $notNull: true,
              },
            },
          },
        },
      });

      // Count liked projects
      const likedProjectsCount = await strapi.db.query('api::project.project').count({
        where: {
          likedBy: {
            documentId: user.documentId,
          },
        },
      });

      return {
        ...finalProfile,
        likedProjectsCount,
      };
    } catch (error) {
      strapi.log.error('Error in updateMe:', error);
      ctx.throw(500, error);
    }
  },
}));
