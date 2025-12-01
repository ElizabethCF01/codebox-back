/**
 * project controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::project.project', ({ strapi }) => ({
  async find(ctx) {
    const userId = ctx.state.user?.id;

    // Llamar al método find original
    const { data, meta } = await super.find(ctx);

    // Si el usuario está autenticado, agregar el campo hasLiked
    if (userId && data && data.length > 0) {
      // Obtener todos los documentIds de los proyectos
      const projectIds = data.map((project: any) => project.id);

      // Una sola query SQL para obtener todos los likes del usuario
      const likedProjects = await strapi.db.connection.raw(`
        SELECT project_id
        FROM projects_liked_by_lnk
        WHERE user_id = ?
        AND project_id IN (${projectIds.map(() => '?').join(',')})
      `, [userId, ...projectIds]);

      // Crear un Set para búsqueda rápida O(1)
      // SQLite devuelve directamente un array, PostgreSQL usa .rows
      const rows = Array.isArray(likedProjects) ? likedProjects : likedProjects.rows || [];
      const likedProjectIds = new Set(rows.map((row: any) => row.project_id));

      // Agregar hasLiked a cada proyecto
      const enrichedData = data.map((project: any) => ({
        ...project,
        hasLiked: likedProjectIds.has(project.id),
      }));

      return { data: enrichedData, meta };
    }

    return { data, meta };
  },

  async findOne(ctx) {
    const userId = ctx.state.user?.id;

    // Llamar al método findOne original
    const response = await super.findOne(ctx);

    // Si el usuario está autenticado, agregar el campo hasLiked
    if (userId && response.data) {
      const project = response.data;

      // Una sola query SQL para verificar si el usuario dio like
      const likedProjects = await strapi.db.connection.raw(`
        SELECT project_id
        FROM projects_liked_by_lnk
        WHERE user_id = ? AND project_id = ?
        LIMIT 1
      `, [userId, project.id]);

      // SQLite devuelve directamente un array, PostgreSQL usa .rows
      const rows = Array.isArray(likedProjects) ? likedProjects : likedProjects.rows || [];
      const hasLiked = rows.length > 0;

      return {
        data: {
          ...project,
          hasLiked,
        },
        meta: response.meta,
      };
    }

    return response;
  },

  async toggleLike(ctx) {
    const { id } = ctx.params;
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be authenticated to like');
    }

    try {
      // Obtener el proyecto con los usuarios que dieron like usando documentId
      const project: any = await strapi.documents('api::project.project').findOne({
        documentId: id,
        populate: ['likedBy'],
      });

      if (!project) {
        return ctx.notFound('Project not found');
      }

      // Verificar si el usuario ya dio like
      const hasLiked = project.likedBy?.some((user: any) => user.id === userId) || false;

      if (hasLiked) {
        // Unlike: remover el usuario de likedBy y decrementar likes
        const updatedProject: any = await strapi.documents('api::project.project').update({
          documentId: id,
          data: {
            likedBy: {
              disconnect: [userId],
            } as any,
            likes: Math.max(0, (project.likes || 0) - 1),
          },
        });

        // Publicar los cambios
        await strapi.documents('api::project.project').publish({
          documentId: id,
        });

        return ctx.send({
          liked: false,
          likes: updatedProject.likes,
          message: 'Like removed successfully'
        });
      } else {
        // Like: agregar el usuario a likedBy e incrementar likes
        const updatedProject: any = await strapi.documents('api::project.project').update({
          documentId: id,
          data: {
            likedBy: {
              connect: [userId],
            } as any,
            likes: (project.likes || 0) + 1,
          },
        });

        // Publicar los cambios
        await strapi.documents('api::project.project').publish({
          documentId: id,
        });

        return ctx.send({
          liked: true,
          likes: updatedProject.likes,
          message: 'Like added successfully'
        });
      }
    } catch (error) {
      strapi.log.error('Error in toggleLike:', error);
      return ctx.internalServerError('Error processing like');
    }
  },

  async myProjects(ctx) {
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be authenticated');
    }

    try {
      // Obtener parámetros de paginación
      const pagination: any = ctx.query.pagination || {};
      const page = Number(pagination.page || 1);
      const pageSize = Number(pagination.pageSize || 8);

      // Buscar proyectos del usuario
      const projects = await strapi.entityService.findPage('api::project.project', {
        filters: {
          author: userId,
        },
        populate: ctx.query.populate || ['author', 'tag', 'likedBy', 'comments'],
        sort: { createdAt: 'desc' },
        page,
        pageSize,
      });

      // Agregar campo hasLiked a cada proyecto
      const enrichedData = projects.results.map((project: any) => ({
        ...project,
        hasLiked: project.likedBy?.some((user: any) => user.id === userId) || false,
      }));

      return {
        data: enrichedData,
        meta: projects.pagination,
      };
    } catch (error) {
      strapi.log.error('Error in myProjects:', error);
      return ctx.internalServerError('Error fetching projects');
    }
  },

  async likedProjects(ctx) {
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be authenticated');
    }

    try {
      // Obtener parámetros de paginación
      const pagination: any = ctx.query.pagination || {};
      const page = Number(pagination.page || 1);
      const pageSize = Number(pagination.pageSize || 8);

      // Buscar proyectos que le gustan al usuario
      const projects = await strapi.entityService.findPage('api::project.project', {
        filters: {
          likedBy: {
            id: userId,
          },
        },
        populate: ctx.query.populate || ['author', 'tag', 'likedBy', 'comments'],
        sort: { createdAt: 'desc' },
        page,
        pageSize,
      });

      // Agregar campo hasLiked (siempre true para esta ruta)
      const enrichedData = projects.results.map((project: any) => ({
        ...project,
        hasLiked: true,
      }));

      return {
        data: enrichedData,
        meta: projects.pagination,
      };
    } catch (error) {
      strapi.log.error('Error in likedProjects:', error);
      return ctx.internalServerError('Error fetching liked projects');
    }
  },
}));
