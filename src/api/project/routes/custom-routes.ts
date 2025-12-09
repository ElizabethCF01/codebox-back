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
    {
      method: 'GET',
      path: '/projects/my-projects',
      handler: 'project.myProjects',
      config: {
        policies: [],
        middlewares: ['plugin::users-permissions.rateLimit'],
      },
    },
    {
      method: 'GET',
      path: '/projects/liked',
      handler: 'project.likedProjects',
      config: {
        policies: [],
        middlewares: ['plugin::users-permissions.rateLimit'],
      },
    },
    {
      method: 'GET',
      path: '/projects/challenge/:challengeId',
      handler: 'project.projectsByChallenge',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/projects/:id/vote',
      handler: 'project.vote',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
