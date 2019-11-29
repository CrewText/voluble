// if (!process.env.PATH || process.env.PATH.lastIndexOf("/app/.heroku") == -1) {
//     console.info("Importing .env config vars")
//     const config = require('dotenv').config()
//     if (config.error) {
//         throw config.error
//     }
// } else {
//     console.info("Running on Heroku, using local config vars")
// }

// process.env.NODE_ENV = "test"
// // console.log("Node Env: " + process.env.NODE_ENV)

// import * as BBPromise from 'bluebird'
// import * as chai from 'chai'
// import * as chaiAsPromised from 'chai-as-promised'
// import * as faker from 'faker'
// import * as request from 'request'
// import * as supertest from 'supertest'
// import * as db from '../models'
// import * as server from '../server/server-main'
// import { getAccessToken } from './test-utils'

// chai.should()
// chai.use(chaiAsPromised)
// let auth_token: string
// let server_app;

// describe('API', function () {
//     this.beforeAll(function (done) {
//         this.timeout(5000)

//         BBPromise.try(function () {
//             return server.initServer()
//         })
//             .then(function (svr) {
//                 //Wait until the DB is up and running before we can use it
//                 server_app = svr
//             })
//             .then(async () => {
//                 auth_token = await getAccessToken();
//                 done()
//             })
//     })

//     this.afterAll((done) => {
//         server_app.close(() => {
//             done();
//         })
//     })
//     // })
//     /**
//      * CATEGORIES
//      */



// })