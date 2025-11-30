export default (config: any, { strapi }: any) => {
  console.log('[AUTH-PROFILE] Middleware loaded!');

  return async (ctx: any, next: any) => {
    await next();

    console.log('[AUTH-PROFILE] Request:', ctx.request.url, 'Status:', ctx.response.status);

    // Solo interceptar rutas de autenticación exitosas
    if (
      (ctx.request.url === '/api/auth/local' ||
       ctx.request.url === '/api/auth/local/register') &&
      ctx.response.status === 200 &&
      ctx.response.body?.user
    ) {
      const userId = ctx.response.body.user.documentId;
      console.log('[AUTH-PROFILE] Auth detected for user:', userId);

      try {
        // En Strapi 5, para relaciones oneToOne necesitamos usar documentId en el filtro
        const profiles = await strapi.documents('api::profile.profile').findMany({
          filters: {
            user: {
              documentId: {
                $eq: userId,
              },
            },
          },
        });

        console.log('[AUTH-PROFILE] Found profiles:', profiles?.length);

        if (profiles && profiles.length > 0) {
          ctx.response.body.profile = {
            documentId: profiles[0].documentId,
            totalXP: profiles[0].totalXP,
            challengesCompleted: profiles[0].challengesCompleted,
          };
          console.log('[AUTH-PROFILE] Profile added:', ctx.response.body.profile);
          strapi.log.info(`[AUTH-PROFILE] Added profile to response for user: ${userId}`);
        }
      } catch (error: any) {
        console.error('[AUTH-PROFILE] Error:', error);
        strapi.log.error('[AUTH-PROFILE] Error fetching profile on auth:', error.message);
      }
    }
  };
};
