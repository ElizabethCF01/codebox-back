/**
 * Custom routes for project
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/projects/:id/like',
      handler: 'project.toggleLike',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
