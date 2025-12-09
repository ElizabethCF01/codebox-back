/**
 * Custom routes for challenge
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/challenges/:id/start-voting',
      handler: 'challenge.startVoting',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/challenges/:id/end-voting',
      handler: 'challenge.endVoting',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/challenges/:id/submit',
      handler: 'challenge.submitProject',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
