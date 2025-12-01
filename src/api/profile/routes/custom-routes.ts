export default {
  routes: [
    {
      method: 'GET',
      path: '/profiles/me',
      handler: 'profile.me',
      config: {
        policies: [],
        middlewares: ['plugin::users-permissions.rateLimit'],
      },
    },
    {
      method: 'PUT',
      path: '/profiles/me',
      handler: 'profile.updateMe',
      config: {
        policies: [],
        middlewares: ['plugin::users-permissions.rateLimit'],
      },
    },
  ],
};
