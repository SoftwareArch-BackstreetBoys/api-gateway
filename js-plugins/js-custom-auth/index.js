'use strict'

const axios = require('axios'); // If you're in a Node.js environment
const { version: Version } = require('./package.json')

class CustomAuthPlugin {
  constructor(config) {
    this.config = config
  }

  getCookieValue(cookieString, cookieName) {
    try {
      // Split the cookie string into individual cookies
      const cookies = cookieString.split('; ');

      // Loop through the cookies to find the one that matches the cookieName
      for (let cookie of cookies) {
        const [name, value] = cookie.split('=');
        if (name === cookieName) {
          return decodeURIComponent(value); // Return the cookie value
        }
      }

      return null; // Return null if the cookie is not found
    } catch (err) {
      return null;
    }
  }

  async getUserData(url, jwt_token) {
    try {
      const response = await axios.get(url, {
        headers: {
          'Cookie': `jwt=${jwt_token};`  // Manually setting the cookie
        }
      });

      if (response.status !== 200) {
        return null;
      }

      return response.data; // Axios automatically parses the response as JSON
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }


  async access(kong) {
    // const request_token_header_name = this.config.request_token_header
    const user_id_header_field = this.config.user_id_header_field
    const user_id_body_field = this.config.user_id_body_field
    const user_service_host = this.config.user_service_host

    const cookie_header = await kong.request.get_header('Cookie')

    const jwt_token = this.getCookieValue(cookie_header, 'jwt')
    if (!jwt_token) {
      await kong.response.exit(401, { message: 'Access token required.' })
      return
    }

    try {
      const userData = await this.getUserData(`${user_service_host}/auth/validate`, jwt_token)

      if (!userData) {
        await kong.response.exit(500, "user_data not present")
      }

      const userID = userData.id;
      if (!userID || userID == "") {
        await kong.response.exit(500, "user id not present")
      }

      if (user_id_header_field && user_id_header_field !== "") {
        await kong.service.request.add_header(user_id_header_field, userID);
      }
      if (user_id_body_field && user_id_body_field !== "") {
        let body = {}
        try {
          body = await kong.request.get_body();
          if (body === null || body === "") {
            body = {}
          }
        } catch (err) {
          body = {}
        }

        body[user_id_body_field] = userID

        await kong.service.request.set_raw_body(JSON.stringify(body))
      }
    } catch (error) {
      await kong.response.exit(500, { message: "Something went wrong" })
    }
  }
}

module.exports = {
  Plugin: CustomAuthPlugin,
  Name: 'js-custom-auth',
  Schema: [
    {
      user_service_host: {
        type: 'string',
        required: true,
      }
    },
    {
      user_id_header_field: {
        type: 'string',
        required: false,
        description: 'Header/Body key name you want the plugin to set user_id to'
      }
    },
    {
      user_id_body_field: {
        type: 'string',
        required: false,
      }
    }
  ],
  Version,
  Priority: 0,
}
