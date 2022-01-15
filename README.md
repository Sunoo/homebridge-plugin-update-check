# homebridge-plugin-update-check

[![npm](https://img.shields.io/npm/v/homebridge-plugin-update-check) ![npm](https://img.shields.io/npm/dt/homebridge-plugin-update-check)](https://www.npmjs.com/package/homebridge-plugin-update-check) [![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

A [Homebridge](https://github.com/nfarina/homebridge) plugin for checking for updates to Homebridge and plugins.

This will use [homebridge-config-ui-x](https://www.npmjs.com/package/homebridge-config-ui-x) when available, but will fall back to using [npm-check-updates](https://www.npmjs.com/package/npm-check-updates) if it is not.

## Installation

1. Install Homebridge using the [official instructions](https://github.com/homebridge/homebridge/wiki).
2. Install this plugin using: `sudo npm install -g homebridge-plugin-update-check`.
3. Update your configuration file. See sample config.json snippet below.

### Configuration

Configuration sample:

```json
"platforms": [
    {
        "platform": "PluginUpdate",
        "sensorType": "motion",
        "forceNcu": false
    }
]
```

#### Fields

* "platform": Must always be "PluginUpdate" (required)
* "sensorType": What type of sensor will be exposed to HomeKit. Can be `motion`, `contact`, `occupancy`, `humidity`, `light`, `air`, `leak`, `smoke`, `dioxide`, or `monoxide` (Default: `motion`)
* "forceNcu": Force use of node-check-updates instead of homebridge-config-ui-x. (Default: `false`)
