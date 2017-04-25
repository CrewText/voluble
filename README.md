# voluble
A plugin-oriented mass text communication system

## Implementation thoughts
| VERB      | URL                   | Usage
|-----------|-----------------------|---------
|           | **Groups**            |   
| GET       | /groups               | List of groups
| GET       | /groups/{id}          | List of contacts in group
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
| GET       | /messages/{id}        | Message info
| POST      | /messages             | Send new message
|           | **Blasts**            |   
| GET       | /blasts/{id}          | Blast info
| POST      | /blasts               | Send new blast
|           | **Services**          | 
| GET       | /services             | List of services
| GET       | /services/{id}        | Service info
|           |                       | *Note: `POST`/`PUT` requests for services are not supported; service availability is defined by which plugins the server has installed*
|           | **Servicechains**     | 
| GET       | /servicechains        | List of servicechains
| GET       | /servicechaisns{id}

### Terminology
* `blast` is collection of `message`s
* A `service` is a way of sending a message. Examples: `esendex`, `twilio`, `telegram`
* A `servicechain` is a failure-chain of `services` that Voluble should use to try and send a message (eg. Telegram -> SMS -> Email). If the first sending-attempt fails, then Voluble will use the next `service` in the chain to attempt to send the message, and so on.