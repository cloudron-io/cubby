# cubby

cubby is a pure filesharing app with built-in viewers. It further supports an external collabora office installation.

The app is mainly developed by the [Cloudron](https://cloudron.io) team to provide a laser-focused open source file sharing application.

This is still a work-in-progress and only meant to run for development at the moment.

## Project development

A docker environment is required for the PostgreSQL database instance.

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
