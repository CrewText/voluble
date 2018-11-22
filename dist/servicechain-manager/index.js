"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require('winston');
const Promise = require("bluebird");
let errs = require('common-errors');
const db = require("../models");
const _1 = require("../contact-manager/");
var ServicechainManager;
(function (ServicechainManager) {
    ServicechainManager.EmptyServicechainError = errs.helpers.generateClass('EmptyServicechainError');
    function getServicesInServicechain(servicechain_id) {
        return db.models.ServicesInSC.findAll({
            where: {
                servicechain_id: servicechain_id
            },
            order: [['priority', 'ASC']],
        });
    }
    ServicechainManager.getServicesInServicechain = getServicesInServicechain;
    function getServicechainFromContactId(contact_id) {
        return _1.ContactManager.checkContactWithIDExists(contact_id)
            .then(function (cont_id) {
            return db.models.Servicechain.findOne({
                include: [{
                        model: db.models.Contact,
                        where: { id: db.sequelize.col('contact.ServicechainId') }
                    }]
            });
        });
    }
    ServicechainManager.getServicechainFromContactId = getServicechainFromContactId;
    function getAllServicechains() {
        return db.models.Servicechain.findAll();
    }
    ServicechainManager.getAllServicechains = getAllServicechains;
    function getServicechainById(id) {
        return db.models.Servicechain.findById(id);
    }
    ServicechainManager.getServicechainById = getServicechainById;
    function getServiceInServicechainByPriority(sc_id, priority) {
        return db.models.Servicechain.findById(sc_id, {
            include: [
                {
                    model: db.models.Service,
                    through: {
                        where: {
                            priority: priority
                        }
                    }
                }
            ]
        }).then(function (sc) {
            if (sc) {
                if (sc.Services.length) {
                    let sc_to_ret = sc.Services[0];
                    return Promise.resolve(sc_to_ret);
                }
                else {
                    return Promise.reject(new ServicechainManager.EmptyServicechainError(`Servicechain does not contain a service with priority ${priority}`));
                }
            }
            else {
                return Promise.reject(new errs.NotFoundError(`Servicechain with ID ${sc_id} does not exist`));
            }
        });
    }
    ServicechainManager.getServiceInServicechainByPriority = getServiceInServicechainByPriority;
    function getServiceCountInServicechain(sc_id) {
        return db.models.Servicechain.findById(sc_id)
            .then(function (sc) {
            if (sc) {
                return sc.getServices()
                    .then(function (svcs) {
                    if (svcs) {
                        return svcs.length;
                    }
                    else {
                        return Promise.reject(errs.NotFoundError(`No plugins found in servicechain ${sc_id}`));
                    }
                });
            }
            else {
                return Promise.reject(errs.NotFoundError(`No servicechain found with ID ${sc_id}`));
            }
        });
    }
    ServicechainManager.getServiceCountInServicechain = getServiceCountInServicechain;
    function createNewServicechain(name, services) {
        winston.debug("Creating new SC - " + name);
        return db.models.Servicechain.create({
            name: name
        })
            .then(function (sc) {
            winston.debug("Created new SC:");
            winston.debug(sc);
            return Promise.map(services, function (scp) {
                return ServicechainManager.addServiceToServicechain(sc.id, scp.service_id, scp.priority);
            })
                .then(function (svcs_in_scs) {
                return sc;
            });
        });
    }
    ServicechainManager.createNewServicechain = createNewServicechain;
    function addServiceToServicechain(sc_id, service_id, priority) {
        return db.models.ServicesInSC.create({
            servicechain_id: sc_id,
            service_id: service_id,
            priority: priority
        });
    }
    ServicechainManager.addServiceToServicechain = addServiceToServicechain;
    function deleteServicechain(id) {
        return db.models.Servicechain.destroy({ where: { id: id } })
            .then(function (destroyedRowsCount) {
            if (!destroyedRowsCount) {
                return Promise.reject(new errs.NotFoundError(`Cannot destroy SC with ID ${id} - SC with matching ID not found.`));
            }
            else {
                return Promise.resolve(destroyedRowsCount);
            }
        });
    }
    ServicechainManager.deleteServicechain = deleteServicechain;
})(ServicechainManager = exports.ServicechainManager || (exports.ServicechainManager = {}));
