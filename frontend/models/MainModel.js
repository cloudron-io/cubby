import superagent from 'superagent';

export function createMainModel(origin) {
  return {
    name: 'MainModel',
    async getProfile() {
      let error, result;
      try {
        result = await superagent.get(`${origin}/api/v1/profile`).withCredentials();
      } catch (e) {
        error = e;
      }

      if (error || result.statusCode !== 200) throw new Error('Failed to get profile', { cause: error || result })

      return {
        username: result.body.username,
        email: result.body.email,
        displayName: result.body.displayName,
        diskusage: {
          used: result.body.diskusage.used || 0,
          size: result.body.diskusage.size || 0,
          available: result.body.diskusage.available || 0
        },
      };
    },
    async getConfig() {
      let error, result;
      try {
        result = await superagent.get(`${origin}/api/v1/config`).withCredentials();
      } catch (e) {
        error = e;
      }

      if (error || result.statusCode !== 200) throw new Error('Failed to get config', { cause: error || result })

      return {
        viewers: {
          collabora: result.body.viewers.collabora || {}
        }
      };
    },
    async getUsers() {
      let error, result;
      try {
        result = await superagent.get(`${origin}/api/v1/users`).withCredentials();
      } catch (e) {
        error = e;
      }

      if (error || result.statusCode !== 200) throw new Error('Failed to get users', { cause: error || result })

      return result.body.users;
    },
    async logout() {
      try {
        await superagent.get(`${origin}/api/v1/logout`).withCredentials();
      } catch (e) {
        console.error('Error logging out', e);
      }
    }
  };
}

export default {
  createMainModel
};
