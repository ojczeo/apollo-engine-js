const hapi = require('hapi');
const {graphqlHapi} = require('apollo-server-hapi');

const {assert} = require('chai');
const request = require('request-promise-native');
const {Engine} = require('../lib/index');
const {schema, rootValue, verifyEndpointSuccess, verifyEndpointFailure, verifyEndpointError} = require('./schema');
const {startWithDelay} = require('./test');

describe('hapi middleware', () => {
  let server;
  beforeEach(() => {
    server = new hapi.Server();
    server.connection({
      host: 'localhost',
      port: 0
    });

    server.route({
      method: 'OPTIONS',
      path: '/graphql',
      handler: (req, reply) => {
        return reply('ok');
      }
    });
    server.register({
      register: graphqlHapi,
      options: {
        path: '/graphql',
        graphqlOptions: {
          schema: schema,
          rootValue: rootValue,
          tracing: true
        }
      },
    });
  });

  describe('without engine', () => {
    let url;
    beforeEach(async () => {
      await server.start();
      url = `http://localhost:${server.info.port}/graphql`;
    });

    it('processes successful query', () => {
      return verifyEndpointSuccess(url, true);
    });
    it('processes invalid query', () => {
      return verifyEndpointFailure(url);
    });
    it('processes query that errors', () => {
      return verifyEndpointError(url);
    });
  });

  describe('with engine', () => {
    let url;
    beforeEach(async () => {
      await server.start();

      let port = server.info.port;
      url = `http://localhost:${port}/graphql`;

      // Then start engine:
      let engine = new Engine({
        engineConfig: {
          apiKey: 'faked'
        },
        graphqlPort: port
      });
      engine.instrumentHapiServer(server);
      await startWithDelay(engine);
    });

    it('processes successful query', () => {
      return verifyEndpointSuccess(url, false);
    });
    it('processes invalid query', () => {
      return verifyEndpointFailure(url);
    });
    it('processes query that errors', () => {
      return verifyEndpointError(url);
    });

    it('ignores options request', async () => {
      let response = await request({
        method: 'OPTIONS',
        url
      });
      assert.strictEqual('ok', response);
    });
  });
});
