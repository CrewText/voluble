const db = require('../../models')

var ServicechainManager = {
    /**
     * Returns a list of service IDs associated with a given servicechain, in the priority order that they were defined in.
     * @param servicechain_id {integer} The ID of the servicechain that we want to retrieve the services for.
     */
    getServicesInServicechain: function(servicechain_id){
        return db.sequelize.model('ServicesInSC').findAll({
            where: {
                servicechain_id: servicechain_id
            },
            order: [['priority', 'ASC']],
        })
    }
}

module.exports = ServicechainManager