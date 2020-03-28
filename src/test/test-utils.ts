import axios = require('axios')
import * as chai from 'chai'

export async function getAccessToken(): Promise<string> {
    // Get an access_token from Auth0 on behalf of the Voluble Test Application
    let auth0_req_body = {
        audience: process.env.AUTH0_API_ID,
        grant_type: "client_credentials",
        client_id: process.env.AUTH0_TEST_CLIENT_ID,
        client_secret: process.env.AUTH0_TEST_CLIENT_SECRET
    }

    return axios.default.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`,
        auth0_req_body, { responseType: "json" })
        .then((resp) => {
            if (!resp.data.access_token) { throw new Error('No access token in Auth0 response') }
            return resp.data.access_token
        })
        .catch((err) => {
            if (err.toJSON) { console.error(err.toJSON()) }
            throw err
        })
}

export function satisfiesJsonApiResource(data: any, type_name: string, id?: string) {
    chai.expect(data).to.have.property('type', type_name)
    id ? chai.expect(data).to.have.property('id', id) : chai.expect(data).to.have.property('id')
    chai.expect(data).to.have.property('attributes')

    chai.expect(data).to.have.property('links')
    chai.expect(data.links).to.have.property('self')
}

export function satisfiesJsonApiResourceRelationship(data: any, relationship: { [key: string]: { 'related': string } }) {
    chai.expect(data).to.have.property('relationships')
    chai.expect(data.relationships).to.be.instanceOf(Object)

    for (const rel in relationship) {
        chai.expect(data.relationships).to.have.property(rel)
        chai.expect(data.relationships[rel]).to.have.property('links')
        chai.expect(data.relationships[rel].links).to.have.property('related', relationship[rel].related)
    }
}

export function satisfiesJsonApiRelatedResource(data: any, relationship_name: string, resource_type: string, resource_id: any) {
    chai.expect(data.relationships[relationship_name]).to.have.property('data')
    if (resource_id != null) {
        chai.expect(data.relationships[relationship_name].data).to.have.property('type', resource_type)
        chai.expect(data.relationships[relationship_name].data).to.have.property('id', resource_id)
    }
    else {
        chai.expect(data.relationships[relationship_name].data).to.be.null
    }
}

export function satisfiesJsonApiError(data: any) {
    chai.expect(data).to.have.property('errors')
    chai.expect(data.errors).to.be.instanceOf(Array)
    for (const err of data.errors) {
        chai.expect(err).to.have.property('detail')
    }
}