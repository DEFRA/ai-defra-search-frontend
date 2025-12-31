import { UAParser } from 'ua-parser-js'

const userAgentParser = {
  plugin: {
    name: 'userAgentParser',
    register: function (server) {
      server.ext('onRequest', (request, h) => {
        const parser = new UAParser(request.headers['user-agent'])

        request.plugins.userAgentParser = parser.getResult().browser

        return h.continue
      })
    }
  }
}

export {
  userAgentParser
}
