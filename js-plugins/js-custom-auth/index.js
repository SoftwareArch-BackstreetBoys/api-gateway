'use strict'

const { version: Version } = require('./package.json')

class CustomAuthPlugin {
  constructor(config) {
    this.config = config
  }

  async access(kong) {
    const request_token_header_name = this.config.request_token_header
    const user_id_header_name = this.config.user_id_header

    const jwt_token = await kong.request.get_header(request_token_header_name)
    if (!jwt_token) {
      await kong.response.exit(401, { message: 'Access token required.' })
      return
    }

    try {
      const arrayToken = jwt_token.split('.')

      const { exp, Id } = JSON.parse(atob(arrayToken[1]))

      if (!exp || !Id) {
        await kong.response.exit(401, { message: 'Invalid jwt token' })
      }

      if (new Date().getTime() >= exp*1000) {
        await kong.response.exit(401, { message: 'Access token expired.' })
        return
      }

      await kong.service.request.add_header(user_id_header_name, Id);
    } catch (error) {
      const status = error.response && error.response.status ? error.response.status : 500
      const body = error.response && error.response.data ? error.response.data : { message: 'Something went wrong. Please try again.' }
      await kong.response.exit(status, body)
    }
  }
}

module.exports = {
  Plugin: CustomAuthPlugin,
  Name: 'js-custom-auth',
  Schema: [
    {
      request_token_header: {
        type: 'string',
        required: true,
        description: 'Header key name which hold jwt access token as a value'
      }
    },
    {
      user_id_header: {
        type: 'string',
        required: true,
        description: 'Header key name you want the plugin to set user_id to'
      }
    },
  ],
  Version,
  Priority: 0,
}
