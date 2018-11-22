"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const winston = require('winston');
const Promise = require("bluebird");
const errs = require('common-errors');
const db = require("../models");
const queue_manager_1 = require("../queue-manager");
const voluble_errors = require('../voluble-errors');
var PluginManager;
(function (PluginManager) {
    PluginManager.PluginImportFailedError = errs.helpers.generateClass('PluginImportFailedError');
    let __plugin_dir = path.resolve(path.join(__dirname, "../plugins"));
    function getPluginById(id) {
        return db.models.Service.findById(id)
            .then(function (service) {
            if (service) {
                try {
                    let plugin_directory = path.join(__plugin_dir, service.directory_name);
                    let plugin_fullpath = path.join(plugin_directory, "plugin.js");
                    winston.debug("Importing plugin from:" + plugin_fullpath);
                    let p = require(plugin_fullpath)();
                    p._plugin_dir = plugin_directory;
                    return Promise.resolve(p);
                }
                catch (e) {
                    errs.log(e, `Could not import plugin in directory '${service.directory_name}': ${e.message}`);
                    return Promise.reject(new PluginManager.PluginImportFailedError(`Failed to import plugin in directory ${service.directory_name}`));
                }
            }
            else {
                return Promise.reject(new errs.NotFoundError(`Plugin with ID ${id} cannot be found`));
            }
        });
    }
    PluginManager.getPluginById = getPluginById;
    function getServiceByDirName(id) {
        return db.models.Service.find({
            where: { directory_name: id }
        });
    }
    PluginManager.getServiceByDirName = getServiceByDirName;
    function initAllPlugins() {
        winston.debug("PM: Attempting to load plugins from " + __plugin_dir);
        winston.info("PM: Loading plugins from\n\t" + __plugin_dir);
        return discoverPlugins(__plugin_dir)
            .then(function (plugin_list) {
            return synchronizePluginDatabase(plugin_list);
        });
    }
    PluginManager.initAllPlugins = initAllPlugins;
    function discoverPlugins(directory) {
        let plugin_subdirs = fs.readdirSync(directory).filter(function (element) {
            let plugin_subdir_fullpath = path.join(directory, element);
            if (fs.statSync(plugin_subdir_fullpath).isDirectory() && fs.existsSync(path.join(plugin_subdir_fullpath, "plugin.js"))) {
                return true;
            }
            else {
                return false;
            }
        });
        winston.debug("PM: Found plugins at:\n\t" + plugin_subdirs);
        let plugin_list = [];
        plugin_subdirs.forEach(function (plugin_subdir_rel) {
            let plugin_file_abs = path.join(directory, plugin_subdir_rel, "plugin.js");
            try {
                let plug_obj = require(plugin_file_abs)();
                winston.info("PM: Loaded plugin: " + plug_obj.name);
                let p = { plugin: plug_obj, subdirectory: plugin_subdir_rel };
                plugin_list.push(p);
            }
            catch (e) {
                errs.log(e, `Could not load plugin in subdirectory ${plugin_subdir_rel}: ${e.message}`);
            }
        });
        return Promise.resolve(plugin_list);
    }
    function synchronizePluginDatabase(plugin_list) {
        return Promise.mapSeries(plugin_list, function (plugin_directory_map) {
            return db.models.Service.findOne({
                where: { 'directory_name': plugin_directory_map.subdirectory }
            }).then(function (service) {
                if (!service) {
                    return db.models.Service.create({
                        'name': plugin_directory_map.plugin.name,
                        'directory_name': plugin_directory_map.subdirectory,
                    });
                }
                else {
                    return service;
                }
            }).then(function (service) {
                plugin_directory_map.plugin._eventEmitter.on('message-state-update', function (msg, message_state) {
                    queue_manager_1.QueueManager.addMessageStateUpdateRequest(msg.id, message_state);
                });
            }).then(function () {
                return true;
            });
        }).then(function () {
            return Promise.resolve(plugin_list);
        });
    }
    function getAllServices() {
        return db.models.Service.findAll();
    }
    PluginManager.getAllServices = getAllServices;
    function getServiceById(id) {
        return db.models.Service.findById(id);
    }
    PluginManager.getServiceById = getServiceById;
})(PluginManager = exports.PluginManager || (exports.PluginManager = {}));
