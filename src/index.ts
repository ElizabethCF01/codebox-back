import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // Suscribirse al evento de creación de usuarios para crear automáticamente el perfil
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      async afterCreate(event) {
        const { result } = event;

        try {
          // Crear el perfil asociado al usuario
          await strapi.documents('api::profile.profile').create({
            data: {
              user: result.documentId,
              totalXP: 0,
              challengesCompleted: 0,
            },
            status: 'published',
          });

          strapi.log.info(`[AUTO-PROFILE] Profile created for user: ${result.documentId}`);
        } catch (error: any) {
          strapi.log.error(`[AUTO-PROFILE] Error creating profile for user ${result.documentId}:`, error.message);
        }
      },
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/* { strapi }: { strapi: Core.Strapi } */) {},
};
