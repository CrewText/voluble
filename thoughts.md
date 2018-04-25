
<!-- @import "[TOC]" {cmd="toc" depthFrom=1 depthTo=6 orderedList=false} -->

<!-- code_chunk_output -->

* [Mechanism design thoughts](#mechanism-design-thoughts)
	* [Application Components](#application-components)
		* [Architecture](#architecture)
			* [Server](#server)
			* [Worker](#worker)
		* [Back End/Service Layer](#back-endservice-layer)
			* [REST API](#rest-api)
			* [Message Flow](#message-flow)
			* [Data Storage](#data-storage)
			* [Plugins](#plugins)
			* [Client/User creation](#clientuser-creation)
			* [Client Authentication](#client-authentication)
		* [Front End/Website](#front-endwebsite)
			* [Design](#design)
			* [Back-End Interaction](#back-end-interaction)
			* [User Login/Logout](#user-loginlogout)

<!-- /code_chunk_output -->

# Mechanism design thoughts

## Application Components

### Architecture
Voluble is implemented in a server/worker fashion whereby the 'server' component is responsible for all of the central organisation of the system that the workers may depend upon, and the workers simply handle the process of sending messages with a given service. The two communicate through a Redis-backed messaging system.

#### Server
The server has three primary roles: firstly to implement the REST API which allows websites and other user service layers to interact with the Voluble system; secondly to keep track of the messages that are being processed within the system; and thirdly to assert that any parts of the Voluble system that workers may depend upon but it would be inefficient to re-evaluate upon each usage (such as plugins) are working as expected.

The server does not handle the actual mechanism of message-sending, which is delegated to workers, but does co-ordinate the messages that flow through the system.

#### Worker
The worker has a simple function: to attempt to send a given message with a given service (or rather, using a given plugin) naively and report back whether or not the attempt was successful. The inherent naivity of the system is designed that any worker must be able to attempt to send any given message with any given plugin without having to concern itself with whether or not the plugin is functioning as it should. It is the responsibility of the server to validate the available plugins before messages are handed to workers and to choose to refuse to utilise a given plugin if it does not appear to be functioning or unable to be correctly instantiated, so as to save messaging attempts with plugins that do not work.

Once a worker has attempted to send a message with a given plugin, the worker should simply respond to the server (through the messaging interface) the success or failure state of the message-sending attempt.

### Back End/Service Layer
#### REST API
This is the primary way that Voluble server instances interact with outside clients. All client-facing Voluble operations should be accessible through the REST API. This includes managing contacts, sending messages and defining how messages can be sent.

The design and implementation of this section is arguably the largest part of the whole project. It forms the bulk of the work that needs to be done, since it is effectively the basis of the software - it does the heavy lifting.

Points to consider:
* The API design/URL scheme itself
    * Presumably, this will take the standard object-oriented-esque REST style
    * Think:
        * https://<SERVER_URL>/messages/<MESSAGE_ID>
        * https://<SERVER_URL>/contacts/<MESSAGE_ID>
        * https://<SERVER_URL>/blasts/<MESSAGE_ID>
        * etc.
* In what format and in what structure information will be transmitted between Voluble and a client
* The structure of and information that relates to each of the core concepts in Voluble (`message`s, `blast`s, `service`s, `servicechain`s, etc.) and how they relate to each other.
    * Perhaps, a `GET` request for a particular `message` (i.e. a request to the endpoint `https://<SERVER_URL>/messages/01234567890123456789`) might return the following:

```
{
    message:
    {
        id: 01234567890123456789,
        content: "Hi Steve, how's things?"
        contact_id: 987654321
        service_state:
        {
            service: "telegram",
            direction: "incoming", /* "incoming" | "outgoing"
            state: "MSG_RECIEVED",
            reply_to: None
        }
    }

    metadata:
    {
        http_code: 200,
        method: "GET",
        unique_url: "https://<SERVER_URL>/messages/01234567890123456789"
        auth_token: "BEARER_TOKEN_RECIEVED"
    }
}
```

though it may be important in the future that server-worker and server-client messages follow a scheme such as the JRESP standard.

#### Message Flow

A `message` once it has been created has one of the following states:
| State                 | Meaning
|-----------------------|--------
| MSG_PENDING           | Voluble has queued the message for sending.
| MSG_SENDING           | Voluble is in the process of sending the message via the relevant plugin.
| MSG_SENT              | Message has been sent by Voluble, but we cannot confirm that it has been delivered or read.
| MSG_DELIVERED_SERVICE | In the case of messages that use an intermediate delivery serice (e.g. Facebook Messenger, Telegram, etc.), the message has been confirmed as delivered to the intermediary, but the user has not necessarily recieved it. Does not apply in the case of SMS messages.
| MSG_DELIVERED_USER    | The message has been delivered to the user through a given service. Cannot confirm that the message has been read. Final state for SMS messages, unless they are replied to.
| MSG_READ              | The message has been confirmed as read by the user. Does not apply to SMS messages.
| MSG_REPLIED           | The user has sent a reply to the message through a given channel.
| MSG_FAILED            | Voluble could not send the message to the delivery provider.


How do we deal with replies? The most straightforward method might be to store the reply as a standard `message`, with a `reply_to` field. The downside of this is that by default, every message sent from a contact to an organization would be a reply to the previous message sent (assuming the contact had not already replied). Perhaps an implementation with a `direction` parameter stored in the message would be helpful, so we know whether or not the message was sent by a contact, and if so, whether it was a reply to a message sent out or an unsolicited message. Doing this would allow contacts to contact an organization without the organization sending a message to the contact first, and also allow Voluble to keep track of conversations, regardless of who initiated it.

The process of sending a message is as follows:

|Server|Worker|
|---|---|
| INIT | INIT |
| Init all plugins to validate that they work, blacklist any plugins that fail | |
| Join message queue | Join message queue |
| **ON POST /messages** | |
| Receive message | |
| Create message entry in database with `MSG_PENDING` state | |
| Send `send-message` message to queue with message details | |
| Update message database entry to `MSG_SENDING` state | |
| | **ON `send-message` MESSAGE** |
| | Recieve message from queue with message details |
| | Retrieve relevant plugin API details from Auth0 |
| | Attempt to init plugin with relevant API details for user |
| | If plugin fails, send `attempt-failed` message to message queue |
| | If plugin inits, attempt to send message with the given plugin |
| | If attempt is successful, send `message-sent` message to the message queue |
| | If attempt is unsuccessful, send `attempt-failed` message to the message queue |
| **ON `attempt-failed` MESSAGE** | |
| Iterate through the servicechain that the message was sent with to find the next plugin in the servicechain | |
| If there is a next plugin in the servicechain, send `send-message` message to the queue using the new plugin | |
| If this the last plugin in the servicechain, update the message database entry to the `MSG_FAILED` state | |
| **ON `message-sent` MESSAGE** | |
| Update the message database entry to the `MSG_SENT` state and set the message entry's `sent_time` to the current time. |


#### Data Storage

Questions:
* Given that all users on voluble must also exist on Auth0, why can we not simply use the same UIDs on Voluble as the ones generated on Auth0? This reduces lookups between Voluble and Auth0 users
All of the contacts and messages that are sent by Voluble are stored somewhere. This is the somewhere. 

Centrally, the 

#### Plugins
I'm of the belief that sending of messages isn't something that should be part of the Voluble core. Instead, this behaviour should be delegated to plugins, each of which represents a system of sending messages (SMS, Telegram, etc.), and Voluble should be able to interact with every plugin in a predictable way, withough having to think about how it actually sends the messages.

This way, if Voluble needs to be able to support a new system for sending messages, then all that needs to happen is for a plugin (`service` in Voluble-speak) to be installed and added to a `servicechain` (a system for sending messages). Voluble itself doesn't need a new version-release or code update.
    
How should a plugin work? If Voluble needs to work with it in a predictable way, then it needs to expose a certain set of interfaces/methods and not break when it's used. How can we ensure this? How do we define what the plugin needs to make available for Voluble to be able to use it?

#### Client/User creation
* User responsibility delegation
    * How do we decide how we structure users in Voluble?
        * Should Voluble be able to support multiple 'Organizations', each with it's own set of Users and Contacts, that are completely separate within Voluble?
            * This would be closest to replicating the current functionality of Info2Text and would avoid having multiple instances running for multiple clients
            * In this case, the responsibility structure might look like this:

                    voluble_instance:
                        sysadmin
                            organization
                            {
                                organization_admin
                                [...]
                                    organization_regular_user
                                    [...]
                            }
                            organization
                            {
                                organization_admin
                                [...]
                                    organization_regular_user
                                    [...]
                            }
                            etc...


        * Or, do we decide that a single Voluble instance represents a single Organization?
            * This would provide a neater way of splitting up instances of Voluble, but would require additional outlay per client, with greater setup time to roll-out

* For each level of client/user, Voluble will also need to be able to implement the following basic features:
    * User creation
    * Login/logout + cookie management
    * Password reset


#### Client Authentication
* As with all API-based systems, we need a way of making sure that only the right people have access to the right information. There are a number of ways to accomplish this, and several mechanisms for each.

Likely options:
* OAuth?
    * Widely supported, and well-known to be a secure infrastructure for user authentication.
    * Can be quite complicated to set up
    * There are a few mechanisms to authenticate users:
        * Bearer token?
            * Authenticate a given client when they supply a unique key that we have supplied
            * Provides a way of identifying a client without them having to provide their sensitive information every time they make a request
            * Means that we don't have to store user/password information, which could present a security vulnerability without expert secure implementation

* User/Password
    * Most obvious and straightforward system to set up
    * Requires us to store password information, which must be done in a very particular manner to prevent common security vulnerabilities
    * Requires the user to transmit their username and password hash every time they make a request, which could present security vulnerabilities

### Front End/Website
The website is effectively a pleasnt-looking wrapper around the API functions. While this sounds straightforward, it will still take a considerable amount of time to implement.

#### Design

#### Back-End Interaction

#### User Login/Logout