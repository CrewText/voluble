const db = require('../../models')
const contactManager = require('../contact-manager/contact-manager')

var ServicechainManager = {
    /**
     * Returns a list of service IDs associated with a given servicechain, in the priority order that they were defined in.
     * @param servicechain_id {integer} The ID of the servicechain that we want to retrieve the services for.
     */
    getServicesInServicechain: function (servicechain_id) {
        return db.sequelize.model('ServicesInSC').findAll({
            where: {
                servicechain_id: servicechain_id
            },
            order: [['priority', 'ASC']],
        })
    },

    getServicechainFromContactId: function (contact_id) {
        return contactManager.checkContactWithIDExists(contact_id)
            .then(function (cont_id) {
                return db.sequelize.model('Contact').findOne({
                    where: { id: cont_id },
                    attributes: ['default_servicechain']
                })
            })
            .then(function (contact_svc) {
                return db.sequelize.model('Servicechain').findOne({
                    where: {
                        id: contact_svc.default_servicechain
                    }
                })
            })
    },

    getAllServicechains: function () {
        return db.sequelize.model('Servicechain').findAll()
    },

    getServicechainById: function (id) {
        return db.sequelize.model('Servicechain').findOne(
            { where: { id: id } } // TODO: Validate me!
        )
    },

    deleteServicechain: function (id) {
        return db.Servicechain.destroy({ where: { id: id } }) // TODO: Validate me!
    }
}

module.exports = ServicechainManager