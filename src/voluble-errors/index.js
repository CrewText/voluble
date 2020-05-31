export class MessageAlreadySentError extends Error { }
export class MessageFailedError extends Error { }
export class PluginDoesNotExistError extends Error { }
export class PluginInitFailedError extends Error { }
export class PluginFailedToSendError extends Error { }
export class UserNotInOrgError extends Error { }
export class UserAlreadyInOrgError extends Error { }
export class ResourceNotFoundError extends Error { }
export class InvalidParameterValueError extends Error { }
export class NotImplementedError extends Error { }
export class AuthorizationFailedError extends Error { }
export class ResourceOutOfUserScopeError extends Error { }
export class NotEnoughCreditsError extends Error { }
export class InternalError extends Error { }


// let Errors = {
//     MessageAlreadySentError,
//     MessageFailedError,
//     PluginDoesNotExistError,
//     PluginInitFailedError,
//     PluginFailedToSendError,
//     ResourceNotFoundError,
//     InvalidParameterValueError,
//     UserNotInOrgError,
//     UserAlreadyInOrgError,
//     NotImplementedError
// }

// module.exports = Errors