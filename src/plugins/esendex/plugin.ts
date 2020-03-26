import Axios, * as axios from 'axios';
import * as plugin_base from '../plugin_base';

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

class EsendexError extends Error {
  public statusCode: number
  constructor(statusCode: number, esendex_error_message: string) {
    super(esendex_error_message)
    this.statusCode = statusCode
  }
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

  async send_message(message: plugin_base.messageInstance, contact: plugin_base.contactInstance) {
    //this.populate_object_data_tables(message, contact)
    const esendex_message = {
      accountreference: this.account_ref,
      messages: [{
        to: contact.phone_number,
        body: message.body
      }]
    }

    // return new Promise((resolve, reject) => {
    // request.
    // })
    // return rp.post("https://api.esendex.com/v1.0/messagedispatcher", {
    return axios.default.post("https://api.esendex.com/v1.0/messagedispatcher", esendex_message,
      {
        auth: { username: this.username || "", password: this.password || "" },
        responseType: "json"
      })
      .then(function (response) {
        if (response.status >= 400) { throw new EsendexError(response.status, `${response.data.errors[0].code}: ${response.data.errors[0].description}`) }
        return true
      })
      .catch(err => {
        if (err instanceof EsendexError) {
          this.logger.error(`Error ${err.statusCode}: ${err.message}`)
        } else if (err.response) {
          this.logger.error(`${err.response.data.error[0].statusCode}: ${err.response.data.errors[0].code}: ${err.response.data.errors[0].description}`)
        } else {
          this.logger.error(err)
        }
        return false
      })
  }

  async handle_incoming_message(message_data: any) {
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

    // TODO: Actually find the contact out?
    let interpreted_message: plugin_base.InterpretedIncomingMessage = {
      phone_number: parsed_message.inboundmessage.from,
      message_body: parsed_message.inboundmessage.messagetext
    }

    return new Promise<plugin_base.InterpretedIncomingMessage>((resolve, reject) => {
      resolve(interpreted_message)
    })

  }
}

var createPlugin = function () {
  return new EsendexPlugin()
}

module.exports = createPlugin;
