import Joi from "joi";
require('dotenv').config();
const noReplyEmail = "no-reply@admin.com";
const readJsonFromEnv = function(key){
    let data;
    if(process.env[key]){ 
        try { 
            data = JSON.parse(process.env[key])           
        } catch(e){
            console.warn("Error while reading  json from env. Seems like a invalid json -- ",e);
        }        
    }
    return data;
}
const firebaseConfig = readJsonFromEnv("FIREBASE_CONFIG");
const firebaseAdminConfig = readJsonFromEnv("FIREBASE_ADMIN_CONFIG");
/**
 * Common configuration for each environment
 * @type {{}}
 */
module.exports = {
    host: process.env.BACKEND_URI || "http://localhost:8080",
    apiPrefix: "api",
    "admin" : {
        "name" : "Admin User",
        "email" : "admin@admin.com",
        "password" : "123456"
    },
    email: {
        adapter: "mailgun",
        from: {
            "noReply": noReplyEmail
        },
        types: {
            passwordReset: {
                expiry: 60
            }
        }
    },
    database: {
        config: firebaseConfig,
        admin: firebaseAdminConfig,
        url: firebaseConfig?firebaseConfig.databaseURL:null,
    },
    server: {
        port: 8080,
        bodyLimit: "100000kb",
        corsHeaders: ["Link"]
    },
    storage: {
        adapter: "aws"      
    },
    /**
     * For Search Indexer We have 2 options, either to use a search indexer or not
     * As of now 1 search indexers are supported
     * 1. Memory
     *
     * Different Parameters are supported
     * validateSchema - Schema to validate Request Parameters,
     * defaultIndexingConfig - The Default Indexing config that gets applied to index and is passed during search if no config is
     * defined on a path level
     * responseFilter - Filter Response from Search Indexer
     * getRequestConfig - Construct Request Config object to indexer consisting of additionalOptions, additionalQuery, additionalParams
     *
     * Sorting = For in memory we can sort easily on client side or may be on onAfter Hook
     * For ES or any query related indexer we can perhaps use in query sorting
     */
    searchIndexer: {
        adapter: 'memory', // Mandatory Field
        indexPrefix: "escrow-",
        validateSchema: { // Mandatory Field
            search: Joi.string(),
            searchField: Joi.string().optional(),
            from: Joi.number(),
            size: Joi.number(),
            sort: Joi.string(),
            sortType: Joi.string().valid("asc", "desc", "ASC", "DESC")
        },
        getRequestConfig: function (data) {
            const additionalOptions = {
                from: isNaN(data.from) ? 0 : parseInt(data.from),
                size: isNaN(data.from) ? 10 : parseInt(data.size),
                sort: data.sort || 'createdAt',
                sortType: data.sortType || 'asc'
            };
            if (data.all) {
                additionalOptions.all = true;
            }
            return {
                ...additionalOptions
            }
        },
        defaultIndexingConfig: {
            ref: 'key',
            fields: ['name', 'key'],
            saveDocument: true
        }
    }
};
