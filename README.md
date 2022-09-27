# Cubby

Cubby is a pure filesharing app with some built-in viewers (text, code, pdf, images, ...).
It further supports an external collabora office installation.

The app is mainly developed by the [Cloudron](https://cloudron.io) team to provide an open source file sharing application.

## Issues and Feature requests

Report any issues or feature request at https://forum.cloudron.io/category/132/cubby

## Project development

A docker environment is required for the PostgreSQL database instance.

Install app dependencies
```
npm install
```

Build the static assets
```
npm run build
```
or keep watching and rebuilding them while editing the code:
```
npm run watch
```

The main application can be run using a helper script, which will create and initialize the datbase:
```
./develop.sh
```
