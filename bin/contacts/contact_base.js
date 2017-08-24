var BaseContact = {
    first_name: null,
    last_name: null,
    email: null,
    phone_number: null,
}

var TelegramContact = {
    telegram_id: null
}

function makeTelegramContact(contact, telegram_id){
    let tc = Object.assign(contact, TelegramContact)
    tc.telegram_id = telegram_id
    return tc
}

function createContact(){
    let cont = Object.create(BaseContact)
    return cont
}