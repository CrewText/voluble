# Voluble
A plugin-oriented mass text communication system

## REST API Implementation thoughts
| VERB      | URL                   | Usage
|-----------|-----------------------|---------
|           | **Groups**            |   
| GET       | /groups               | List of groups
| GET       | /groups/{id}          | List of contacts in group and default servicechain
| POST      | /groups               | Create new group
| PUT       | /groups/{id}          | Update group
| DELETE    | /groups/{id}          | Delete group
|           | **Contacts**          |   
| GET       | /contacts             | List of contacts
| GET       | /contacts/{id}        | Contact info
| POST      | /contacts             | Create new contact
| PUT       | /contacts/{id}        | Update contact
| DELETE    | /contacts/{id}        | Delete contact
|           | **Messages**          |   
| GET       | /messages             | List of messages sent
| GET       | /messages/{id}        | Message info
| POST      | /messages             | Send new message
|           | **Blasts**            |   
| GET       | /blasts               | List of blasts sent
| GET       | /blasts/{id}          | Blast info
| POST      | /blasts               | Send new blast
|           | **Services**          | 
| GET       | /services             | List of services
| GET       | /services/{id}        | Service info
|           |                       | *Note: `POST`/`PUT` requests for services are not supported; service availability is defined by which plugins the server has installed*
|           | **Servicechains**     | 
| GET       | /servicechains        | List of servicechains
| GET       | /servicechains/{id}   | Servicechain info
| POST      | /servicechains        | Create new servicechain with a given list of services
| PUT       | /servicechains/{id}   | Update a servicechain
| DELETE    | /servicechains/{id}   | Delete a servicechain

### Terminology
* `blast` is collection of `message`s, all sent as one go with the same message body
* A `service` is a way of sending a message. Examples: `esendex`, `twilio`, `telegram`
* A `servicechain` is a failure-chain of `services` that Voluble should use to try and send a message (eg. Telegram -> SMS -> Email). If the first sending-attempt fails, then Voluble will use the next `service` in the chain to attempt to send the message, and so on.

### Message States
| State                 | Meaning
|-----------------------|--------
| MSG_SENT              | Message has been sent by Voluble, but we cannot confirm that it has been delivered or read.
| MSG_DELIVERED_SERVICE | In the case of messages that use an intermediate delivery serice (e.g. Facebook Messenger, Telegram, etc.), the message has been confirmed as delivered to the intermediary, but the user has not necessarily recieved it. Does not apply in the case of SMS messages.
| MSG_DELIVERED_USER    | The message has been delivered to the user through a given service. Cannot confirm that the message has been read. Final state for SMS messages, unless they are replied to.
| MSG_READ              | The message has been confirmed as read by the user. Does not apply to SMS messages.
| MSG_REPLIED           | The user has sent a reply to the message through a given channel.