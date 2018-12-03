import * as plugin_base from '../plugin_base'
import * as rp from 'request-promise'
import * as Promise from 'bluebird'
import winston = require('winston');

interface IncomingEsendexMessage {
  inboundmessage: ReceivedEsendexMessageData
}

interface ReceivedEsendexMessageData {
  id: string,
  messageid: string,
  accountid: string,
  messagetext: string,
  from: string,
  to: string
}

class EsendexPlugin extends plugin_base.voluble_plugin {
  username: string | undefined
  password: string | undefined
  account_ref: string | undefined

  constructor() {
    super("Esendex", "Sends an SMS using Esendex")
    this.username = process.env.ESENDEX_USERNAME
    this.password = process.env.ESENDEX_PASSWORD
    this.account_ref = process.env.ESENDEX_ACCOUNT_REF
  }

  send_message(message: plugin_base.messageInstance, contact: plugin_base.contactInstance) {
    //this.populate_object_data_tables(message, contact)

    let esendex_message = {
      accountreference: this.account_ref,
      messages: [{
        to: contact.phone_number,
        body: message.body
      }]
    }


    return rp.post("https://api.esendex.com/v1.0/messagedispatcher", {
      auth: {
        username: this.username || "",
        password: this.password || ""
      },
      json: true,
      body: esendex_message
    })
      .then(function (response: any) {
        return true
      })
      .catch(function (reason) {
        let error_msg
        switch (reason.name) {
          case "StatusCodeError":
            switch (reason.statusCode) {
              case 400:
                error_msg = "400 Bad Request: Invalid/Malformed request body or more than 50,000 messages in request."
                break
              case 401:
                error_msg = "401 Not Authorised: No authentication header provided."
                break
              case 402:
                error_msg = "402 Payment Required: Not enough message credits."
                break
              case 403:
                error_msg = "403 Forbidden: Failed authentication or not authorised to access feature."
                break
              case 404:
                error_msg = "404 Not Found: The specified contact or contact group doesn't exist."
                break
              case 406:
                error_msg = "406 Not Acceptable: Empty message body provided."
                break
              case 415:
                error_msg = "415 Unsupported Media Type: Content type is not supported or unspecified."
                break
              default:
                error_msg = "Unknown error"
                break
            }
            break

          case "RequestError":
            error_msg = reason.message
            break
          default:
            error_msg = "Unknown error"
            break
        }

        console.info(`ESENDEX: Got error while sending message ${message.id}: ${error_msg}`)
        return false
      })
  }

  handle_incoming_message(message_data: any): plugin_base.InterpretedIncomingMessage {
    /* If all has gone well, we're expecting a message from Esendex of the form:
    <InboundMessage>
        <Id>{guid-of-push-notification}</Id>
        <MessageId>{guid-of-inbound-message}</MessageId>
        <AccountId>{guid-of-esendex-account-for-message}</AccountId>
        <MessageText>{Message text of inbound message}</MessageText>
        <From>{phone number of sender of the message}</From>
        <To>
            {phone number for the recipient of the inbound message 
            (the virtual number of the Esendex account in use)}
        </To>
    </InboundMessage>

    which converts to JSON from xmlParser as:
    { inboundmessage:
      { id: 'guid-of-push-notification',
      messageid: 'guid-of-inbound-message',
      accountid: 'guid-of-esendex-account-for-message',
      messagetext: 'This is the inbound message',
      from: '00447426437449',
      to: '00353879409420' } }
    */

    let parsed_message = <IncomingEsendexMessage>message_data
    console.log(parsed_message)

    // TODO: Actually find the contact out?
    let interpreted_message: plugin_base.InterpretedIncomingMessage = {
      phone_number: parsed_message.inboundmessage.from,
      message_body: parsed_message.inboundmessage.messagetext
    }

    return interpreted_message
  }
}

var createPlugin = function () {
  return new EsendexPlugin()
}

module.exports = createPlugin;
