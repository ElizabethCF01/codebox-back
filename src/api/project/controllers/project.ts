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
      const start = (page - 1) * pageSize;

      // Query SQL optimizada para obtener los document_ids únicos de proyectos del usuario
      // En Strapi v5, cada document_id puede tener múltiples IDs físicos (draft y published)
      const myProjectIdsResult = await strapi.db.connection.raw(`
        SELECT DISTINCT p.document_id, MAX(p.created_at) as created_at
        FROM projects p
        INNER JOIN projects_author_lnk pa ON p.id = pa.project_id
        WHERE pa.user_id = ?
        AND p.published_at IS NOT NULL
        GROUP BY p.document_id
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, pageSize, start]);

      // Obtener total count para la paginación
      const totalResult = await strapi.db.connection.raw(`
        SELECT COUNT(DISTINCT p.document_id) as total
        FROM projects p
        INNER JOIN projects_author_lnk pa ON p.id = pa.project_id
        WHERE pa.user_id = ?
        AND p.published_at IS NOT NULL
      `, [userId]);

      // Extraer rows (compatible con SQLite y PostgreSQL)
      const rows = Array.isArray(myProjectIdsResult) ? myProjectIdsResult : myProjectIdsResult.rows || [];
      const totalRows = Array.isArray(totalResult) ? totalResult : totalResult.rows || [];
      const total = totalRows[0]?.total || 0;

      // Si no hay proyectos, devolver respuesta vacía
      if (rows.length === 0) {
        return {
          data: [],
          meta: {
            pagination: {
              page,
              pageSize,
              pageCount: 0,
              total: 0,
            },
          },
        };
      }

      // Obtener los document_ids de los proyectos
      const documentIds = rows.map((row: any) => row.document_id);

      // Buscar los proyectos completos con sus relaciones usando los document_ids únicos
      // En Strapi v5, usamos documents API para trabajar con documentId
      const projectsPromises = documentIds.map((documentId: string) =>
        strapi.documents('api::project.project').findOne({
          documentId,
          status: 'published',
          populate: ctx.query.populate || ['author', 'tag', 'likedBy', 'comments', 'challenge'],
        })
      );

      const projectsResults = await Promise.all(projectsPromises);
      const projects = projectsResults.filter((p) => p !== null);

      // Agregar campo hasLiked a cada proyecto
      const enrichedData = projects.map((project: any) => ({
        ...project,
        hasLiked: project.likedBy?.some((user: any) => user.id === userId) || false,
      }));

      return {
        data: enrichedData,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.ceil(total / pageSize),
            total,
          },
        },
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
      const start = (page - 1) * pageSize;

      // Query SQL optimizada para obtener los document_ids únicos de proyectos que le gustan al usuario
      // En Strapi v5, cada document_id puede tener múltiples IDs físicos (draft y published)
      const likedProjectIdsResult = await strapi.db.connection.raw(`
        SELECT DISTINCT p.document_id, MAX(p.created_at) as created_at
        FROM projects p
        INNER JOIN projects_liked_by_lnk l ON p.id = l.project_id
        WHERE l.user_id = ?
        AND p.published_at IS NOT NULL
        GROUP BY p.document_id
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, pageSize, start]);

      // Obtener total count para la paginación
      const totalResult = await strapi.db.connection.raw(`
        SELECT COUNT(DISTINCT p.document_id) as total
        FROM projects p
        INNER JOIN projects_liked_by_lnk l ON p.id = l.project_id
        WHERE l.user_id = ?
        AND p.published_at IS NOT NULL
      `, [userId]);

      // Extraer rows (compatible con SQLite y PostgreSQL)
      const rows = Array.isArray(likedProjectIdsResult) ? likedProjectIdsResult : likedProjectIdsResult.rows || [];
      const totalRows = Array.isArray(totalResult) ? totalResult : totalResult.rows || [];
      const total = totalRows[0]?.total || 0;

      // Si no hay proyectos liked, devolver respuesta vacía
      if (rows.length === 0) {
        return {
          data: [],
          meta: {
            pagination: {
              page,
              pageSize,
              pageCount: 0,
              total: 0,
            },
          },
        };
      }

      // Obtener los document_ids de los proyectos
      const documentIds = rows.map((row: any) => row.document_id);

      // Buscar los proyectos completos con sus relaciones usando los document_ids únicos
      // En Strapi v5, usamos findMany de documents API para trabajar con documentId
      const projectsPromises = documentIds.map((documentId: string) =>
        strapi.documents('api::project.project').findOne({
          documentId,
          status: 'published',
          populate: ctx.query.populate || ['author', 'tag', 'likedBy', 'comments'],
        })
      );

      const projectsResults = await Promise.all(projectsPromises);
      const projects = projectsResults.filter((p) => p !== null);

      // Agregar campo hasLiked (siempre true para esta ruta)
      const enrichedData = projects.map((project: any) => ({
        ...project,
        hasLiked: true,
      }));

      return {
        data: enrichedData,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.ceil(total / pageSize),
            total,
          },
        },
      };
    } catch (error) {
      strapi.log.error('Error in likedProjects:', error);
      return ctx.internalServerError('Error fetching liked projects');
    }
  },
}));
