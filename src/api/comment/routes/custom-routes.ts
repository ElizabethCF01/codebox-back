/**
 * Custom comment routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/projects/:projectId/comments',
      handler: 'comment.getProjectComments',
      config: {
        auth: false, // Public can view comments
      },
    },
    {
      method: 'POST',
      path: '/projects/:projectId/comments',
      handler: 'comment.createComment',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/comments/:id',
      handler: 'comment.deleteComment',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
