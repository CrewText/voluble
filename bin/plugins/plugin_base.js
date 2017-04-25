var plugin = {
    name: 'Your Plugin Name',
    description: 'Your Plugin Description',

    send_message = function(message_content,contact) {
        // This absolutely must be overridden by a plugin
    }
}

var TwilioPlugin = {
    name: "Twilio",
    description: "A plugin for Twilio",
    
    api_key = "",
    api_secret = ""
}

function createTwilioPlugin(api_key, api_secret){
    tp = Object.assign(Object.create(plugin), TwilioPlugin)

    tp.api_key = api_key
    tp.api_secret = api_secret

    return tp
}