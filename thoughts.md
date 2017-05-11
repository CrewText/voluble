# Mechanism design thoughts

## Application Components

### Back End/Service Layer
* REST API
    * This is the primary way that Voluble Server instances interact with outside clients. All client-facing Voluble operations should be accessible through the REST API. This includes managing contacts, sending messages and defining how messages can be sent.

* Data Storage

    * All of the contacts and messages that are sent by Voluble are stored somewhere. This is the somewhere. There are a number of options to consider here:
        * What kind of database are we using? Relational or NoSQL? Flat-file based or engine-based?

        * How will the database be structured?
            * If using a relational database, how are the tables structured, especially in such a way that is extensible as plugin information is added?
            
            * If using a NoSQL or document database, how is the information arranged into a vaguely predictable, but extensible way?
* Plugins
    * I'm of the belief that sending of messages isn't something that should be part of the Voluble core. Instead, this behaviour should be delegated to plugins, each of which represents a system of sending messages (SMS, Telegram, etc.), and Voluble should be able to interact with every plugin in a predictable way, withough having to think about how it actually sends the messages.
    
    * How should a plugin work? If Voluble needs to work with it in a predictable way, then it needs to expose a certain set of interfaces/methods and not break when it's used. How can we ensure this? How do we define what the plugin needs to make available for Voluble to be able to use it?

* Client Authentication
    * As with all API-based systems, we need a way of making sure that only the right people have access to the right information. There are a number of ways to accomplish this, and several mechanisms for each.
    
    * OAuth?
        * Bearer token?
    
    * User/Password
        * How to store? More importantly, how to transmit?

### Front End/Website