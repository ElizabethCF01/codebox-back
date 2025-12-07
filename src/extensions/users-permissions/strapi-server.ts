/**
 * Users-permissions plugin extension
 */

export default (plugin) => {
  // Añadir la ruta personalizada
  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/user/me',
    handler: 'user.updateMe',
    config: {
      prefix: '',
      middlewares: ['plugin::users-permissions.rateLimit'],
      policies: [],
    },
  });

  // Añadir el controlador personalizado
  plugin.controllers.user.updateMe = async (ctx) => {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    try {
      const { email, username } = ctx.request.body || {};

      // Validar que al menos uno de los campos esté presente
      if (!email && !username) {
        return ctx.badRequest('You must provide at least email or username');
      }

      // Verificar si el email ya existe (si se está actualizando)
      if (email && email !== user.email) {
        const existingUser = await strapi.query('plugin::users-permissions.user').findOne({
          where: { email },
        });

        if (existingUser) {
          return ctx.badRequest('Email already taken');
        }
      }

      // Verificar si el username ya existe (si se está actualizando)
      if (username && username !== user.username) {
        const existingUser = await strapi.query('plugin::users-permissions.user').findOne({
          where: { username },
        });

        if (existingUser) {
          return ctx.badRequest('Username already taken');
        }
      }

      // Actualizar el usuario
      const updatedUser = await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          email: email || user.email,
          username: username || user.username,
        },
      });

      // No devolver campos sensibles (password, resetPasswordToken, etc.)
      const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = updatedUser;

      return sanitizedUser;
    } catch (error) {
      strapi.log.error('Error in updateMe:', error);
      ctx.throw(500, error);
    }
  };

  return plugin;
};
