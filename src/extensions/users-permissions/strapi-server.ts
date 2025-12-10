/**
 * Users-permissions plugin extension
 */

export default (plugin) => {
  // Añadir las rutas personalizadas
  plugin.routes['content-api'].routes.push(
    {
      method: 'PUT',
      path: '/user/me',
      handler: 'user.updateMe',
      config: {
        prefix: '',
        middlewares: ['plugin::users-permissions.rateLimit'],
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/creators',
      handler: 'user.getCreators',
      config: {
        prefix: '',
        auth: false, // Public endpoint
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/creators/:username',
      handler: 'user.getCreatorByUsername',
      config: {
        prefix: '',
        auth: false, // Public endpoint
        policies: [],
      },
    }
  );

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

  /**
   * Get all creators (users with at least one public project)
   * GET /api/creators
   * Query params:
   *   - sort: totalXP:desc | projects:desc | createdAt:desc (default: totalXP:desc)
   *   - pagination[page]: Page number (default: 1)
   *   - pagination[pageSize]: Items per page (default: 20, max: 100)
   *   - filters[username][$contains]: Search by username
   */
  plugin.controllers.user.getCreators = async (ctx) => {
    try {
      const { query } = ctx;

      // Parse pagination parameters
      const page = parseInt(query['pagination[page]']) || parseInt(query.pagination?.page) || 1;
      const pageSize = Math.min(
        parseInt(query['pagination[pageSize]']) || parseInt(query.pagination?.pageSize) || 20,
        100
      );
      const searchUsername =
        query['filters[username][$contains]'] ||
        query.filters?.username?.$contains ||
        query.filters?.username?.['$contains'] ||
        '';

      // Parse sort parameter
      let sortOrder = 'desc';
      let sortByProjects = false;
      if (query.sort) {
        const [field, order] = query.sort.split(':');
        sortOrder = order || 'desc';
        sortByProjects = field === 'projects';
      }

      // First, get all user IDs that have at least one public project
      const publicProjects = await strapi.db.query('api::project.project').findMany({
        where: {
          isPublic: true,
          publishedAt: {
            $notNull: true,
          },
        },
        populate: ['author'],
      });

      // Extract unique user IDs
      const userIdsWithPublicProjects = [...new Set(publicProjects.map((p) => p.author?.id).filter(Boolean))];

      if (userIdsWithPublicProjects.length === 0) {
        return {
          data: [],
          meta: {
            pagination: { page, pageSize, pageCount: 0, total: 0 },
          },
        };
      }

      // Build where clause for users
      const whereConditions: any[] = [{ id: { $in: userIdsWithPublicProjects } }];

      if (searchUsername) {
        whereConditions.push({ username: { $containsi: searchUsername } });
      }

      const where = whereConditions.length > 1 ? { $and: whereConditions } : whereConditions[0];

      // Get users with profiles
      const allUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
        where,
        populate: {
          profile: {
            populate: ['avatar'],
          },
        },
      });

      // Get all projects for these users in one query
      const allProjects = await strapi.db.query('api::project.project').findMany({
        where: {
          author: { id: { $in: allUsers.map((u) => u.id) } },
          publishedAt: {
            $notNull: true,
          },
        },
        populate: ['author'],
      });

      // Create a map of user ID to project counts
      const projectCountsMap = new Map();
      allProjects.forEach((project) => {
        const authorId = project.author?.id;
        if (!authorId) return;

        if (!projectCountsMap.has(authorId)) {
          projectCountsMap.set(authorId, { total: 0, public: 0 });
        }
        const counts = projectCountsMap.get(authorId);
        counts.total++;
        if (project.isPublic) counts.public++;
      });

      // Build result with counts
      const usersWithCounts = allUsers
        .map((user) => {
          const counts = projectCountsMap.get(user.id) || { total: 0, public: 0 };

          // Skip users without public projects
          if (counts.public === 0) return null;

          // Sanitize user data
          const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user;

          return {
            ...sanitizedUser,
            projectCount: counts.total,
            publicProjectCount: counts.public,
          };
        })
        .filter((u) => u !== null);

      // Apply sorting
      if (sortByProjects) {
        usersWithCounts.sort((a, b) => {
          return sortOrder === 'desc'
            ? b.publicProjectCount - a.publicProjectCount
            : a.publicProjectCount - b.publicProjectCount;
        });
      } else if (query.sort?.startsWith('totalXP:')) {
        usersWithCounts.sort((a, b) => {
          const aXP = a.profile?.totalXP || 0;
          const bXP = b.profile?.totalXP || 0;
          return sortOrder === 'desc' ? bXP - aXP : aXP - bXP;
        });
      } else if (query.sort?.startsWith('createdAt:')) {
        usersWithCounts.sort((a, b) => {
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
        });
      } else {
        // Default: sort by totalXP desc
        usersWithCounts.sort((a, b) => {
          const aXP = a.profile?.totalXP || 0;
          const bXP = b.profile?.totalXP || 0;
          return bXP - aXP;
        });
      }

      // Apply pagination
      const total = usersWithCounts.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedUsers = usersWithCounts.slice(startIndex, startIndex + pageSize);

      return {
        data: paginatedUsers,
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
      strapi.log.error('Error in getCreators:', error);
      ctx.throw(500, error);
    }
  };

  /**
   * Get creator profile by username with their public projects
   * GET /api/creators/:username
   * Query params:
   *   - includeProjects: boolean (default: true)
   *   - projectSort: createdAt:desc | likes:desc | votesReceived:desc (default: createdAt:desc)
   *   - projectPage: Project pagination page (default: 1)
   *   - projectPageSize: Projects per page (default: 12, max: 50)
   */
  plugin.controllers.user.getCreatorByUsername = async (ctx) => {
    try {
      const { username } = ctx.params;
      const { query } = ctx;

      const includeProjects = query.includeProjects !== 'false';
      const projectSort = query.projectSort || 'createdAt:desc';
      const projectPage = parseInt(query.projectPage) || 1;
      const projectPageSize = Math.min(parseInt(query.projectPageSize) || 12, 50);

      // Find user by username with profile
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { username },
        populate: {
          profile: {
            populate: ['avatar', 'coverImage', 'badges'],
          },
        },
      });

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Sanitize user data - remove sensitive fields
      const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user;

      let projects = null;
      const stats = {
        totalProjects: 0,
        publicProjects: 0,
        totalLikes: 0,
        totalViews: 0,
      };

      // Get public projects if requested
      if (includeProjects) {
        // Parse sort parameter
        const [sortField, sortOrder] = projectSort.split(':');
        const sortBy = { [sortField]: sortOrder || 'desc' };

        // Get paginated public projects
        const projectsData = await strapi.db.query('api::project.project').findMany({
          where: {
            author: user.id,
            isPublic: true,
            publishedAt: {
              $notNull: true,
            },
          },
          orderBy: sortBy,
          limit: projectPageSize,
          offset: (projectPage - 1) * projectPageSize,
          populate: {
            tags: true,
            challenge: {
              select: ['documentId', 'title', 'difficulty'],
            },
          },
        });

        // Count total public projects
        const totalPublic = await strapi.db.query('api::project.project').count({
          where: {
            author: user.id,
            isPublic: true,
            publishedAt: {
              $notNull: true,
            },
          },
        });

        projects = {
          data: projectsData,
          meta: {
            pagination: {
              page: projectPage,
              pageSize: projectPageSize,
              pageCount: Math.ceil(totalPublic / projectPageSize),
              total: totalPublic,
            },
          },
        };
      }

      // Calculate stats across all projects
      const allProjects = await strapi.db.query('api::project.project').findMany({
        where: { author: user.id },
        select: ['likes', 'views', 'isPublic'],
      });

      stats.totalProjects = allProjects.length;
      stats.publicProjects = allProjects.filter((p) => p.isPublic).length;
      stats.totalLikes = allProjects.reduce((sum, p) => sum + (p.likes || 0), 0);
      stats.totalViews = allProjects.reduce((sum, p) => sum + (p.views || 0), 0);

      return {
        data: {
          ...sanitizedUser,
          projects,
          stats,
        },
      };
    } catch (error) {
      strapi.log.error('Error in getCreatorByUsername:', error);
      ctx.throw(500, error);
    }
  };

  return plugin;
};
