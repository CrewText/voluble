import * as Sequelize from "sequelize"

export interface ContactAttributes {
    first_name: string,
    surname: string,
    email_address: string,
    phone_number: string,
    default_servicechain: number,
    id: string
}

export interface ContactInstance extends Sequelize.Instance<ContactAttributes>{
    id: string,
    createdAt: Date,
    updatedAt: Date,

    first_name: string,
    surname: string,
    email_address: string,
    phone_number: string,
    default_servicechain: number
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Contact = sequelize.define('Contact', {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            autoIncrement: true,
        },
        first_name: DataTypes.STRING,
        surname: DataTypes.STRING,
        email_address: DataTypes.STRING,
        phone_number: DataTypes.STRING,
        default_servicechain: DataTypes.INTEGER,
    })

    return Contact
}