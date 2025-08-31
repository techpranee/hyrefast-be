/**
 * invitationsValidation.js
 * @description :: validate each post and put request as per invitations model
 */

const joi = require("joi");
const { options, isCountOnly, populate, select } = require('./commonFilterValidation');

/** validation keys and properties of invitations */
exports.schemaKeys = joi.object({
	company: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	email: joi.string().allow(null).allow(''),
	phone: joi.string().allow(null).allow(''),
	user: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean()
}).unknown(true);

/** validation keys and properties of invitations for updation */
exports.updateSchemaKeys = joi.object({
	company: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	email: joi.string().allow(null).allow(''),
	phone: joi.string().allow(null).allow(''),
	user: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	_id: joi.string().regex(/^[0-9a-fA-F]{24}$/)
}).unknown(true);

let keys = ['query', 'where'];
/** validation keys and properties of invitations for filter documents from collection */
exports.findFilterKeys = joi.object({
	options: options,
	...Object.fromEntries(
		keys.map(key => [key, joi.object({
	company: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	email: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	phone: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	user: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
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
