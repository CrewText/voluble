define({ "api": [
  {
    "type": "get",
    "url": "/orgs",
    "title": "Get list of Organizations",
    "name": "GetOrgs",
    "group": "Orgs",
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "json",
            "optional": false,
            "field": "data[]",
            "description": "<p>A list of Organizations that this User/Client has access to</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    data : [\n        {\n            id: d8ec4c40-c8f1-4807-af9a-3cc03ecdf3ce\n            name: Organization_Name\n        }\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/server/routes/organizations.ts",
    "groupTitle": "Orgs"
  },
  {
    "type": "put",
    "url": "/orgs/:org_id",
    "title": "Update an Organization's data",
    "name": "PutOrgsOrg",
    "group": "Orgs",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "org_id",
            "description": "<p>The ID of the Organization to update</p>"
          },
          {
            "group": "Parameter",
            "type": "Object",
            "optional": false,
            "field": "Organization",
            "description": "<p>An object representing the data to update</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "Organization.name",
            "description": "<p>The new name for the Organizaion</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n    Organization:\n        {\n            name: \"MyCorp Ltd.\"\n        }\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "json",
            "optional": false,
            "field": "Organization",
            "description": "<p>The updated Organization</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    data:\n        {\n                id: \"3c39574c-a4d3-464c-918a-d85713685f3b\",\n                name: \"MyCorp Ltd.\"\n        }\n}",
          "type": "type"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/server/routes/organizations.ts",
    "groupTitle": "Orgs"
  },
  {
    "type": "get",
    "url": "/orgs/:org_id/users",
    "title": "Get a list of Users in the Org",
    "name": "GetOrgsUsers",
    "group": "OrgsUsers",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "UUID",
            "optional": false,
            "field": "org_id",
            "description": "<p>The ID of the Organization to get the Users from</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "User[]",
            "optional": false,
            "field": "data",
            "description": "<p>Array of Users</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server/routes/organizations.ts",
    "groupTitle": "OrgsUsers"
  },
  {
    "type": "post",
    "url": "/orgs/:org_id/users",
    "title": "Create a new User for the Org",
    "name": "PostOrgsUsers",
    "group": "OrgsUsers",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "UUID",
            "optional": false,
            "field": "org_id",
            "description": "<p>The ID of the Organization to add the new User to</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "201 Created": [
          {
            "group": "201 Created",
            "type": "User",
            "optional": false,
            "field": "data",
            "description": "<p>The newly-created User</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server/routes/organizations.ts",
    "groupTitle": "OrgsUsers"
  },
  {
    "type": "put",
    "url": "/orgs/:org_id/users",
    "title": "Add user to Organization",
    "name": "PutOrgsUsers",
    "group": "OrgsUsers",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "org_id",
            "description": "<p>The ID of the Organization to add a user to</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "user_id",
            "description": "<p>The ID of the User to add to the Organization</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n    user_id : \"a0e77f72-2415-462b-9526-af87dbed2ee4\"\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "User",
            "optional": false,
            "field": "data",
            "description": "<p>The User, after being added to the Organization</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    id : \"a0e77f72-2415-462b-9526-af87dbed2ee4\",\n    OrganizationId: \"c26399b7-d6ad-481f-bb7c-16add635323d\",\n    auth0_id: \"6d66f919-f7e2-4485-a913-0f2c0d52e5bc\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/server/routes/organizations.ts",
    "groupTitle": "OrgsUsers"
  }
] });
