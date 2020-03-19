import { Model } from 'sequelize';
import { InvalidParameterValueError } from '../../voluble-errors';


export function checkExtendsModel<T extends typeof Model>(request_obj: any, model: T) {
    let allowed_params = model.rawAttributes
    let excluded_params = ['id', 'createdAt', 'updatedAt']
    Object.keys(request_obj).forEach(element => {
        if (element in excluded_params) {
            throw new InvalidParameterValueError(`Parameter '${element}' on model '${model.options.name.singular}' is readonly`)
        }

        if (!(Object.keys(allowed_params).includes(element))) {
            throw new InvalidParameterValueError(`Parameter '${element}' does not exist on object '${model.options.name.singular}'`)
        }

    });

    Object.keys(allowed_params).forEach(param => {
        if (!(excluded_params.includes(param)) && allowed_params[param].allowNull == false && !Object.keys(request_obj).includes(param)) {
            throw new InvalidParameterValueError(`Parameter ${param} must be supplied.`)
        }
    })

}