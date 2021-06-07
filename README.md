# hyperdrive-gateway
Gateway for loading [hyperdrive](https://hypercore-protocol.org/) websites.

## Repositories
 - [hyperdrive-gateway][hyperdrive-gateway] - The gateway server
 - [hyperdrive-gateway-ui][hyperdrive-gateway-ui] - Single-page application front-end
 - [hyperdrive-gateway-integration][hyperdrive-gateway-integration] - Local development orchestration, integration testing, CI/CD, docker releases
 - [hyperdrive-gateway-extension][hyperdrive-gateway-extension] - Browser extension (optional)

## Development

See [hyperdrive-gateway-integration][hyperdrive-gateway-integration] for development.

## Docker image

There's a [hyperdrive-gateway docker image][hyperdrive-gateway-docker-hub] on dockerhub.
The docker image is all that's needed to run an instance of hyperdrive-gateway.
It is built and published from [hyperdrive-gateway-integration][hyperdrive-gateway-integration]
and includes the front-end.

# Run

This server can be run in isolation, but it won't serve the front-end.

```
./dev-certs/generate
// Take necessary steps for self-signed certificate to be trusted by the system/browser.

export APP_NAME='My Hyperdrive Gateway'
export HYPERSPACE_STORAGE='./hyperspace_storage'
export NODE_ENV='development'
export PORT='443'      
export SSL_KEY='./dev-certs/local-computer.key'
export SSL_CERT='./dev-certs/local-computer.crt'

npm install
npm start
```

## Use

To view a hyperdrive website, use this URL pattern:

```
https://local.computer/hyper/PUBLIC_KEY/FILE_PATH
```

The server will redirect the request to a URL with a base32 encoding of the public key as a subdomain.

## How it works

The gateway supports serving static websites that are seeded on hyperswarm.  The sites can be single-page applications,
and sites can link to other hyperdrive sites or modules using the `hyper://` protocol.  To mock `hyper://` protocol functionalilty,
the gateway transforms all `.html`, `.js`, and `.css` files at the time of serving by replacing `hyper://` links with `https://`
links to the gateway.

### Base32 subdomains

Subdomains have a max length of 63 characters, so hyperdrive public keys don't fit.  Base64 is case sensitive, while subdomains are not.
Base32 encoding is not sensitive and the encoding of public keys into base32 is short enough to be used as a subdomain.

[hyperdrive-gateway]: https://github.com/rhythnic/hyperdrive-gateway
[hyperdrive-gateway-ui]: https://github.com/rhythnic/hyperdrive-gateway-ui
[hyperdrive-gateway-integration]: https://github.com/rhythnic/hyperdrive-gateway-integration
[hyperdrive-gateway-extension]: https://github.com/rhythnic/hyperdrive-gateway-extension
[hyperdrive-gateway-docker-hub]: https://hub.docker.com/repository/docker/rhythnic/hyperdrive-gateway