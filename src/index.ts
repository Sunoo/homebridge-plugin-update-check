import {
  API,
  APIEvent,
  DynamicPlatformPlugin,
  HAP,
  Logging,
  PlatformAccessory,
  PlatformAccessoryEvent,
  PlatformConfig
} from 'homebridge';
import { spawn } from 'child_process';
import { hostname } from 'os';
import path from 'path';
import { PluginUpdatePlatformConfig } from './configTypes';

let hap: HAP;
let Accessory: typeof PlatformAccessory;

const PLUGIN_NAME = 'homebridge-plugin-update-check';
const PLATFORM_NAME = 'PluginUpdate';

class PluginUpdatePlatform implements DynamicPlatformPlugin {
  private readonly log: Logging;
  private readonly api: API;
  private readonly config: PluginUpdatePlatformConfig;
  private accessory?: PlatformAccessory;
  private timer?: NodeJS.Timeout;
  private checkFrequency: number;

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;
    this.config = config as PluginUpdatePlatformConfig;
    this.api = api;

    this.checkFrequency = this.config.checkFrequency ?? 60;

    api.on(APIEvent.DID_FINISH_LAUNCHING, this.addUpdateAccessory.bind(this));
    
    this.timer = setTimeout(this.fetchData.bind(this), this.checkFrequency * 60 * 1000);
  }

  fetchData(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    const ncu = new Promise<string>((resolve, reject) => {
      try {
        var command = spawn(process.argv0, [
          path.resolve(__dirname, '../node_modules/npm-check-updates/bin/cli.js'),
          '--global',
          '--jsonUpgraded',
          '--filter',
          '/^homebridge(-.*)?$/'
        ]);
        var stdout = '';
        command.stdout.on('data', (chunk: any) => {
          stdout += chunk.toString();
        });
        command.on('close', () => {
          resolve(stdout);
        });
      } catch (ex) {
        reject(ex);
      }
    })
      .then(results => {
        const motionService = this.accessory?.getService(hap.Service.MotionSensor);
        if (!motionService) {
          return;
        }

        const parse = JSON.parse(results);
        const length = Object.keys(parse).length;

        this.log.debug(length + ' outdated package(s): ' + JSON.stringify(parse));

        motionService.setCharacteristic(hap.Characteristic.MotionDetected, length > 0)
      })
      .finally(((): void => {
        this.timer = setTimeout(this.fetchData.bind(this), this.checkFrequency * 60 * 1000);
      }).bind(this));
  }

  configureAccessory(accessory: PlatformAccessory): void {
    accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
      this.log(accessory.displayName, 'identify requested!');
    });

    const accInfo = accessory.getService(hap.Service.AccessoryInformation);
    if (accInfo) {
      accInfo
        .setCharacteristic(hap.Characteristic.Manufacturer, 'Homebridge')
        .setCharacteristic(hap.Characteristic.Model, 'Plugin Update Check')
        .setCharacteristic(hap.Characteristic.SerialNumber, hostname());
    }

    this.accessory = accessory;
  }

  addUpdateAccessory(): void {
    if (!this.accessory) {
      const uuid = hap.uuid.generate(PLATFORM_NAME);
      const newAccessory = new Accessory('Plugin Update Check', uuid);

      newAccessory.addService(hap.Service.MotionSensor);

      this.configureAccessory(newAccessory);

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [newAccessory]);
    }
    
    this.fetchData();
  }
}

export = (api: API): void => {
  hap = api.hap;
  Accessory = api.platformAccessory;

  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, PluginUpdatePlatform);
};