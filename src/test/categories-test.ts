if (process.env.PATH.includes("/app/.heroku") || process.env.CIRRUS_CI) {
    console.info("Running on Heroku/CI, using local config vars")
} else {
    console.info("Importing .env config vars")
    const config = require('dotenv').config()
    if (config.error) {
        throw config.error
    }
}

process.env.NODE_ENV = "test"

import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as faker from 'faker'
import { Server } from 'http'
import { AddressInfo } from 'net'
import * as supertest from 'supertest'
import * as server from '../server/server-main'
import { getAccessToken, satisfiesJsonApiError, satisfiesJsonApiRelatedResource, satisfiesJsonApiResource, satisfiesJsonApiResourceRelationship } from './test-utils'

chai.should()
chai.use(chaiAsPromised)
let auth_token: string
let server_app: Server;
let address: string
let port: number

describe('/v1/orgs/<org-id>/categories', function () {

    // Setup auth_token
    this.beforeAll(async function () {
        console.log('Getting auth token')
        this.timeout(5000)

        return Promise.all([server.initServer(), getAccessToken()])
            .then(([server, token]) => {
                server_app = server

                let addr = server_app.address() as AddressInfo
                address = addr.address
                port = addr.port
                auth_token = token

                console.log(`URL: ${address}:${port}`)
                return true
            })
    })

    this.afterAll((done) => {
        server.shutdownServer().then(() => { done() })
    })

    let test_org_id: string
    let created_cat_id: string

    // Setup test_org_id
    this.beforeAll((done) => {
        // this.timeout()
        console.log('Setting up test Org')

        // return axios.default.post(`http://${address}:${port}/v1/orgs`,
        //     { name: "API Test Organization-CATS TEST", phone_number: faker.phone.phoneNumber("+4474########") },
        //     { headers: { 'Authorization': `Bearer ${auth_token}` } })
        //     .then((resp) => {
        //         chai.expect(resp.status == 201)
        //         test_org_id = resp.data.id
        //         return
        //     })


        supertest(server_app)
            .post("/v1/orgs")
            .auth(auth_token, { type: "bearer" })
            .send({ name: "API Test Organization-CATS TEST", phone_number: faker.phone.phoneNumber("+4474########") })
            .expect(201)
            .end((err, res) => {
                // console.log("DONE THE TEST THINGS")
                if (err) { console.log(err); return done(err) }
                test_org_id = res.body.data.id
                done()
            })
    })

    describe('POST /v1/orgs/<org-id>/categories', () => {
        it('should fail to create a new category if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/categories`)
                .send({})
                .expect(401)
                .end((err, res) => {
                    if (err) { console.error(err); console.log(res.error); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should fail to create a new category when `name` is not provided', function (done) {
            if (!test_org_id) { this.skip() }

            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/categories`)
                .auth(auth_token, { type: "bearer" })
                .send({})
                .expect(400)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should create a new category', function (done) {
            if (!test_org_id) { this.skip() }
            let cat_name = faker.name.jobArea()
            supertest(server_app)
                .post(`/v1/orgs/${test_org_id}/categories`)
                .auth(auth_token, { type: "bearer" })
                .send({ name: cat_name })
                .expect(201)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }

                    chai.expect(res.body).to.have.property('data')
                    chai.expect(res.body).not.to.have.property('errors')

                    let data: any = res.body.data
                    satisfiesJsonApiResource(data, 'category')
                    chai.expect(data.attributes).to.have.property('name')
                    satisfiesJsonApiResourceRelationship(data, { 'organization': { related: `/orgs/${test_org_id}` } })
                    satisfiesJsonApiRelatedResource(data, 'organization', 'organization', test_org_id)
                    created_cat_id = data.id
                    done()
                })
        })
    })

    describe('GET /v1/orgs/<org-id>/categories', () => {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/categories`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should retrieve a list of categories available', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/categories`)
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.error(err); console.log(res.error); return done(err) }

                    chai.expect(res.body).to.have.property('data')
                    chai.expect(res.body).not.to.have.property('errors')

                    let data: any = res.body.data
                    chai.expect(data).to.be.instanceOf(Array)
                    chai.expect(data).to.have.lengthOf(1)

                    data.forEach((cat: any) => {
                        satisfiesJsonApiResource(cat, 'category')
                        chai.expect(cat.attributes).to.have.property('name')

                        satisfiesJsonApiResourceRelationship(cat, { 'organization': { related: `/orgs/${test_org_id}` } })
                        satisfiesJsonApiRelatedResource(cat, 'organization', 'organization', test_org_id)
                    });

                    done();
                })
        })
    })

    describe('GET /v1/orgs/<org-id>/categories/<category-id>', () => {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should retrieve the category that we created', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }
            supertest(server_app)
                .get(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }

                    chai.expect(res.body).to.have.property('data')
                    chai.expect(res.body).not.to.have.property('errors')

                    let data: any = res.body.data

                    satisfiesJsonApiResource(data, 'category', created_cat_id)
                    chai.expect(data.attributes).to.have.property('name')
                    satisfiesJsonApiResourceRelationship(data, { 'organization': { related: `/orgs/${test_org_id}` } })
                    satisfiesJsonApiRelatedResource(data, 'organization', 'organization', test_org_id)

                    done()
                })
        })
    })

    describe('PUT /v1/orgs/<org-id>/categories/<category-id>', () => {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }
            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .send({})
                .expect(401)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should modify the name of the category that we created', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }

            supertest(server_app)
                .put(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .auth(auth_token, { type: "bearer" })
                .send({ name: "API Test Category Name" })
                .expect(200)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }

                    chai.expect(res.body).to.have.property('data')
                    chai.expect(res.body).not.to.have.property('errors')

                    let data: any = res.body.data
                    satisfiesJsonApiResource(data, 'category', created_cat_id)
                    satisfiesJsonApiResourceRelationship(data, { 'organization': { related: `/orgs/${test_org_id}` } })
                    satisfiesJsonApiRelatedResource(data, 'organization', 'organization', test_org_id)
                    done()
                })
        })
    })

    describe('DELETE /v1/orgs/<org-id>/categories/<category-id>', () => {
        it('should fail if we are not authenticated', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }
            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .expect(401)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    satisfiesJsonApiError(res.body)
                    done()
                })
        })

        it('should remove the category that we created', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }

            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(204)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.be.empty
                    done()
                })
        })

        it('should remove the same category again, to ensure idempotence', function (done) {
            if (!test_org_id || !created_cat_id) { this.skip() }

            supertest(server_app)
                .delete(`/v1/orgs/${test_org_id}/categories/${created_cat_id}`)
                .auth(auth_token, { type: "bearer" })
                .expect(404)
                .end((err, res) => {
                    if (err) { console.error(err); return done(err) }
                    chai.expect(res.body).to.be.empty
                    done()
                })
        })
    })

})