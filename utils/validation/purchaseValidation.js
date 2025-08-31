/**
 * purchaseValidation.js
 * @description :: validate each post and put request as per purchase model
 */

const joi = require("joi");
const { options, isCountOnly, populate, select } = require('./commonFilterValidation');

/** validation keys and properties of purchase */
exports.schemaKeys = joi.object({
	workspace: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	plan: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	payment: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	status: joi.string().allow(null).allow(''),
	promo_code: joi.string().allow(null).allow(''),
	is_affiliation: joi.boolean().default(false),
	is_first_time: joi.boolean().default(false),
	is_subscription: joi.boolean().default(false),
	invoice_number: joi.number().integer().allow(0),
	amount: joi.number().integer().allow(0),
	currency: joi.string().allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean()
}).unknown(true);

/** validation keys and properties of purchase for updation */
exports.updateSchemaKeys = joi.object({
	workspace: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	plan: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	payment: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	status: joi.string().allow(null).allow(''),
	promo_code: joi.string().allow(null).allow(''),
	is_affiliation: joi.boolean().default(false),
	is_first_time: joi.boolean().default(false),
	is_subscription: joi.boolean().default(false),
	invoice_number: joi.number().integer().allow(0),
	amount: joi.number().integer().allow(0),
	currency: joi.string().allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	_id: joi.string().regex(/^[0-9a-fA-F]{24}$/)
}).unknown(true);

let keys = ['query', 'where'];
/** validation keys and properties of purchase for filter documents from collection */
exports.findFilterKeys = joi.object({
	options: options,
	...Object.fromEntries(
		keys.map(key => [key, joi.object({
	workspace: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	plan: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	payment: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	status: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	promo_code: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	is_affiliation: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	is_first_time: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	is_subscription: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	invoice_number: joi.alternatives().try(joi.array().items(),joi.number().integer(),joi.object()),
	amount: joi.alternatives().try(joi.array().items(),joi.number().integer(),joi.object()),
	currency: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	isDeleted: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	isActive: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	id: joi.any(),
	_id: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object())
}).unknown(true),])
        ),
    isCountOnly: isCountOnly,
	populate: joi.array().items(populate),
    select: select
    
}).unknown(true);
