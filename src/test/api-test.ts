process.env.NODE_ENV = "test"
console.log("Node Env: " + process.env.NODE_ENV)

require('dotenv').config() // THIS HAS TO STAY AT THE TOP
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as faker from 'faker';
import * as request from 'request';
import * as server from '../server/server-main';
import * as supertest from 'supertest'
import * as Promise from 'bluebird'

chai.use(chaiAsPromised)
let should = chai.should
let auth_token: string
let server_app;

describe('API', function () {
    this.beforeAll(function (done) {

        Promise.try(function () {
            return server.initServer()
        })
            .then(function (svr) {
                //Wait until the DB is up and running before we can use it
                server_app = svr
            })
            .then(function () {
                //@ts-ignore
                faker.locale = "en_GB"
                console.log(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
                // Get an access_token from Auth0 on behalf of the Voluble Test Application
                let auth0_req_body = {
                    audience: process.env.AUTH0_API_IDENT,
                    grant_type: "client_credentials",
                    client_id: process.env.AUTH0_TEST_CLIENT_ID,
                    client_secret: process.env.AUTH0_TEST_CLIENT_SECRET
                }

                request.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
                    json: auth0_req_body
                }, function (err, response, body) {
                    if (err) { throw new Error(err) }
                    if (!body.access_token) { throw new Error('No access token in Auth0 response') }
                    auth_token = body.access_token
                    done()
                })
            })
    })

    describe('/GET contact', function () {
        it('should GET all of the contacts that our User allows', function (done) {
            supertest(server_app).get("/contacts")
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    if (err) { return done(err) }
                    chai.expect(res.body).to.have.property('status', 'success')
                    done()
                })
        }).timeout(20000)
    })
})