/**
 * comment controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::comment.comment', ({ strapi }) => ({
  /**
   * Get all comments for a project
   * GET /api/projects/:projectId/comments
   */
  async getProjectComments(ctx) {
    const { projectId } = ctx.params;

    try {
      // Verify project exists
      const project = await strapi.documents('api::project.project').findOne({
        documentId: projectId,
      });

      if (!project) {
        return ctx.notFound('Project not found');
      }

      // Get all comments for this project, ordered by newest first
      const comments = await strapi.documents('api::comment.comment').findMany({
        filters: {
          project: { documentId: projectId },
          parentComment: { id: { $null: true } }, // Only top-level comments
        },
        status: 'published',
        sort: 'createdAt:desc',
        populate: {
          author: {
            fields: ['username', 'email'],
            populate: {
              profile: true,
            },
          },
          replies: {
            sort: 'createdAt:asc',
            populate: {
              author: {
                fields: ['username', 'email'],
                populate: {
                  profile: true,
                },
              },
            },
          },
        },
      });

      return {
        data: comments,
        meta: {
          total: comments.length,
        },
      };
    } catch (error) {
      strapi.log.error('Error in getProjectComments:', error);
      ctx.throw(500, error);
    }
  },

  /**
   * Create a comment on a project
   * POST /api/projects/:projectId/comments
   * Body: { content: string, parentCommentId?: string }
   */
  async createComment(ctx) {
    const { projectId } = ctx.params;
    const { content, parentCommentId } = ctx.request.body;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in to comment');
    }

    const userId = user.id;

    try {
      // Validate content
      if (!content || content.trim().length === 0) {
        return ctx.badRequest('Comment content is required');
      }

      if (content.length > 1000) {
        return ctx.badRequest('Comment is too long (max 1000 characters)');
      }

      // Verify project exists
      const project = await strapi.documents('api::project.project').findOne({
        documentId: projectId,
      });

      if (!project) {
        return ctx.notFound('Project not found');
      }

      // If replying to a comment, verify parent exists
      let parentComment = null;
      if (parentCommentId) {
        parentComment = await strapi.documents('api::comment.comment').findOne({
          documentId: parentCommentId,
        });

        if (!parentComment) {
          return ctx.notFound('Parent comment not found');
        }
      }

      // Create comment
      const comment = await strapi.documents('api::comment.comment').create({
        data: {
          content: content.trim(),
          author: userId,
          project: project.id,
          parentComment: parentComment ? parentComment.id : null,
        },
        populate: {
          author: {
            fields: ['username', 'email'],
            populate: {
              profile: true,
            },
          },
        },
      });

      // Publish the comment
      await strapi.documents('api::comment.comment').publish({
        documentId: comment.documentId,
      });

      // Get the published version with all populate
      const publishedComment = await strapi.documents('api::comment.comment').findOne({
        documentId: comment.documentId,
        status: 'published',
        populate: {
          author: {
            fields: ['username', 'email'],
            populate: {
              profile: true,
            },
          },
        },
      });

      return {
        data: publishedComment,
        message: 'Comment created successfully',
      };
    } catch (error) {
      strapi.log.error('Error in createComment:', error);
      ctx.throw(500, error);
    }
  },

  /**
   * Delete a comment
   * DELETE /api/comments/:id
   */
  async deleteComment(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in to delete comments');
    }

    const userId = user.id;

    try {
      // Find comment
      const comment = await strapi.documents('api::comment.comment').findOne({
        documentId: id,
        populate: ['author'],
      });

      if (!comment) {
        return ctx.notFound('Comment not found');
      }

      // Check if user is the author
      if (comment.author.id !== userId) {
        return ctx.forbidden('You can only delete your own comments');
      }

      // Delete comment
      await strapi.documents('api::comment.comment').delete({
        documentId: id,
      });

      return {
        message: 'Comment deleted successfully',
      };
    } catch (error) {
      strapi.log.error('Error in deleteComment:', error);
      ctx.throw(500, error);
    }
  },
}));
