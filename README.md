# Cisco Endpoint integraton for Kasa Lights

Webex Room Kit device integration for Kasa Light.

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
    KASAEMAIL=<kasa cloud account email address>
    KASAPASSWORD=<kasa light password>
    KASALIGHT=<Kasa light device ID to be controlled>
    
## License

Provided under Cisco Sample Code License, for details see [LICENSE](./LICENSE.md)

## Code of Conduct

Our code of conduct is available [here](./CODE_OF_CONDUCT.md)

## Contributing

See our contributing guidelines [here](./CONTRIBUTING.md)