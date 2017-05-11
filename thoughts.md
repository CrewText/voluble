# Mechanism design thoughts

## Application Components

### Back End/Service Layer
#### REST API
This is the primary way that Voluble Server instances interact with outside clients. All client-facing Voluble operations should be accessible through the REST API. This includes managing contacts, sending messages and defining how messages can be sent.

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
            state: "MSG_RECIEVED"
        }
    }

    metadata:
    {
        http_code: 200,
        unique_url: "https://<SERVER_URL>/messages/01234567890123456789"
        auth_token: "BEARER_TOKEN_RECIEVED"
    }
}
```

#### Data Storage
All of the contacts and messages that are sent by Voluble are stored somewhere. This is the somewhere. There are a number of options to consider here:
* What kind of database are we using? Relational or NoSQL? Flat-file based or engine-based?

* How will the database be structured?
    * If using a relational database, how are the tables structured, especially in such a way that is extensible as plugin information is added?
    
    * If using a NoSQL or document database, how is the information arranged into a vaguely predictable, but extensible way?

#### Plugins
 I'm of the belief that sending of messages isn't something that should be part of the Voluble core. Instead, this behaviour should be delegated to plugins, each of which represents a system of sending messages (SMS, Telegram, etc.), and Voluble should be able to interact with every plugin in a predictable way, withough having to think about how it actually sends the messages.
 
 This way, if Voluble needs to be able to support a new system for sending messages, then all that needs to happen is for a plugin (`service` in Voluble-speak) to be installed and added to a `servicechain` (a system for sending messages). Voluble itself doesn't need a new version-release or code update.
    
How should a plugin work? If Voluble needs to work with it in a predictable way, then it needs to expose a certain set of interfaces/methods and not break when it's used. How can we ensure this? How do we define what the plugin needs to make available for Voluble to be able to use it?

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

#### Design

#### Back-End Interaction