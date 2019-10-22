# Cisco Endpoint integraton for ServiceNow

Webex Room Kit device integration for ServiceNow.

### Cisco Products Technologies/ Services
The solution will levegerage the following technologies
* [Cisco Webex Room Devices](https://www.cisco.com/c/en/us/products/collaboration-endpoints/webex-room-series/index.html)
* [Cisco Webex Room API's](https://www.cisco.com/c/dam/en/us/td/docs/telepresence/endpoint/ce96/collaboration-endpoint-software-api-reference-guide-ce96.pdf)
* [Nodejs](https://nodejs.org/en/)

## Solution Components

This solution is based on Nodejs.

For documentation of tool usage clone the repo, perform a npm install to install all dependencies. and build the solution using
    
    git clone 
    npm install


## Installation

To download and install this project:

    git clone 
    npm install
    
Create a .env file with the following attributes

    TPADMIN=<telepresence Admin user>
    TPADMINPWD=<telepresence admin user password>
    IPADDRESS=<video endpoint IP address>
    SERVICENOW_USERNAMEPWD_BASE64=<username/password base64 combo>
    SERVICE_NOW_INSTANCE_URL=<yourInstance>.service-now.com
    
## License

Provided under Cisco Sample Code License, for details see [LICENSE](./LICENSE.md)

## Code of Conduct

Our code of conduct is available [here](./CODE_OF_CONDUCT.md)

## Contributing

See our contributing guidelines [here](./CONTRIBUTING.md)