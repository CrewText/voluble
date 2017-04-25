# voluble
A plugin-oriented mass text communication system

## Implementation thoughts
| VERB      | URL               | Usage
|-----------|-------------------|---------
|           | **Groups**        |   
| GET       | /groups           | List of groups
| GET       | /groups/{id}      | List of contacts in group
| POST      | /groups           | Create new group
| PUT       | /groups/{id}      | Update group
| DELETE    | /groups/{id}      | Delete group
|           | **Contacts**        |   
| GET       | /contacts         | List of contacts
| GET       | /contacts/{id}    | Contact info
| POST      | /contacts         | Create new contact
| PUT       | /contacts/{id}    | Update contact
| DELETE    | /contacts/{id}    | Delete contact
|           | **Messages**        |   
| GET       | /message/{id}     | Message info
| POST      | /message          | Send new message
|           | **Blasts**        |   
| GET       | /blast/{id}       | Blast info
| POST      | /blast            | Send new blast



`blast` is collection of `message`s