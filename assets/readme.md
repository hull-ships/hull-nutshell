Push Hull users as Nutshell Leads using [Nuthsell's POST Api](https://www.nutshell.com/api/http-post-api.html)

## Getting started

### API Credentials

Go to https://app.nutshell.com/setup/api-key and create a new API key with Permissions set to "Form submissions + Wufoo".

Paste it in the "Nutshell Form API url" field in your Ship's settings.

### Mapping: Contacts, Accounts and Custom fields

The mapping section allows you to define how traits on your Hull users will be mapped to Nutshell.

Traits can be mapped to account, contact or lead custom fields. 

**Examples**

- `User -> Name` to `contact.name`
- `User -> Email` to `contact.email`
- `Traits -> Company` to `account.name`
- `Traits ->  Custom` to `account.custom_field`

