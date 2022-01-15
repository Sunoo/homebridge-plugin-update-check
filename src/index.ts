import {
  API,
  APIEvent,
  Characteristic,
  CharacteristicValue,
  DynamicPlatformPlugin,
  HAP,
  Logging,
  PlatformAccessory,
  PlatformAccessoryEvent,
  PlatformConfig,
  Service,
  WithUUID
} from 'homebridge';
import fs from 'fs';
import ncu from 'npm-check-updates';
import { Index, VersionSpec } from 'npm-check-updates/build/src/types';
import { hostname } from 'os';
import { PluginUpdatePlatformConfig } from './configTypes';
import { UiApi } from './ui-api';

let hap: HAP;
let Accessory: typeof PlatformAccessory;

const PLUGIN_NAME = 'homebridge-plugin-update-check';
const PLATFORM_NAME = 'PluginUpdate';

type SensorInfo = {
  serviceType: WithUUID<typeof Service>;
  characteristicType: WithUUID<new () => Characteristic>;
  trippedValue: CharacteristicValue;
  untrippedValue: CharacteristicValue;
};

class PluginUpdatePlatform implements DynamicPlatformPlugin {
  private readonly log: Logging;
  private readonly api: API;
  private readonly config: PluginUpdatePlatformConfig;
  private readonly uiApi: UiApi;
  private readonly useNcu: boolean;
  private readonly isDocker: boolean;
  private readonly sensorInfo: SensorInfo;
  private service?: Service;
  private timer?: NodeJS.Timeout;

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;
    this.config = config as PluginUpdatePlatformConfig;
    this.api = api;

    this.uiApi = new UiApi(this.api.user.storagePath());
    this.useNcu = this.config.forceNcu || !this.uiApi.isConfigured();
    this.isDocker = fs.existsSync('/homebridge/package.json');
    this.sensorInfo = this.getSensorInfo(this.config.sensorType);

    api.on(APIEvent.DID_FINISH_LAUNCHING, this.addUpdateAccessory.bind(this));
  }

  async checkNcu(): Promise<number> {
    const ncuFilter = '/^(@.*\\/)?homebridge(-.*)?$/';

    let results = await ncu({ global: true, filter: ncuFilter }) as Index<VersionSpec>;

    if (this.isDocker) {
      const dockerResults = await ncu({ packageFile: '/homebridge/package.json', filter: ncuFilter }) as Index<VersionSpec>;
      results = { ...results, ...dockerResults };
    }

    const updates = Object.keys(results).length;
    this.log.debug('node-check-updates reports ' + updates +
      ' outdated package(s): ' + JSON.stringify(results));

    return updates;
  }

  async checkUi(): Promise<number> {
    const plugins = await this.uiApi.getPlugins();
    const homebridge = await this.uiApi.getHomebridge();
    plugins.push(homebridge);

    const results = plugins.filter(plugin => plugin.updateAvailable);
    this.log.debug('homebridge-config-ui-x reports ' + results.length +
      ' outdated package(s): ' + JSON.stringify(results));

    return results.length;
  }

  doCheck(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    const check = this.useNcu ? this.checkNcu() : this.checkUi();

    check
      .then(updates => {
        this.service?.setCharacteristic(this.sensorInfo.characteristicType,
          updates ? this.sensorInfo.trippedValue : this.sensorInfo.untrippedValue);
      })
      .catch(ex => {
        this.log.error(ex);
      })
      .finally(((): void => {
        this.timer = setTimeout(this.doCheck.bind(this), 8 * 60 * 60 * 1000);
      }).bind(this));
  }

  checkService(accessory: PlatformAccessory, serviceType: WithUUID<typeof Service>): boolean {
    const service = accessory.getService(serviceType);
    if (this.sensorInfo.serviceType == serviceType) {
      if (service) {
        this.service = service;
      } else {
        this.service = accessory.addService(serviceType);
      }
      return true;
    } else {
      if (service) {
        accessory.removeService(service);
      }
      return false;
    }
  }

  configureAccessory(accessory: PlatformAccessory): void {
    accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
      this.log(accessory.displayName + ' identify requested!');
    });

    const accInfo = accessory.getService(hap.Service.AccessoryInformation);
    if (accInfo) {
      accInfo
        .setCharacteristic(hap.Characteristic.Manufacturer, 'Homebridge')
        .setCharacteristic(hap.Characteristic.Model, 'Plugin Update Check')
        .setCharacteristic(hap.Characteristic.SerialNumber, hostname());
    }

    this.checkService(accessory, hap.Service.MotionSensor);
    this.checkService(accessory, hap.Service.ContactSensor);
    this.checkService(accessory, hap.Service.OccupancySensor);
    this.checkService(accessory, hap.Service.SmokeSensor);
    this.checkService(accessory, hap.Service.LeakSensor);
    this.checkService(accessory, hap.Service.LightSensor);
    this.checkService(accessory, hap.Service.HumiditySensor);
    this.checkService(accessory, hap.Service.CarbonMonoxideSensor);
    this.checkService(accessory, hap.Service.CarbonDioxideSensor);
    this.checkService(accessory, hap.Service.AirQualitySensor);

    /*const motionService = accessory.getService(hap.Service.MotionSensor);
    const contactService = accessory.getService(hap.Service.ContactSensor);
    const occupancyService = accessory.getService(hap.Service.OccupancySensor);
    const smokeService = accessory.getService(hap.Service.SmokeSensor);
    const leakService = accessory.getService(hap.Service.LeakSensor);
    const lightService = accessory.getService(hap.Service.LightSensor);
    const humidityService = accessory.getService(hap.Service.HumiditySensor);
    const monoxideService = accessory.getService(hap.Service.CarbonMonoxideSensor);
    const dioxideService = accessory.getService(hap.Service.CarbonDioxideSensor);
    const airService = accessory.getService(hap.Service.AirQualitySensor);

    if (this.sensorInfo.serviceType == hap.Service.MotionSensor) {
      this.service = motionService;
    } else if (motionService) {
      accessory.removeService(motionService);
    }
    if (this.sensorInfo.serviceType == hap.Service.ContactSensor) {
      this.service = contactService;
    } else if (contactService) {
      accessory.removeService(contactService);
    }
    if (this.sensorInfo.serviceType == hap.Service.OccupancySensor) {
      this.service = occupancyService;
    } else if (occupancyService) {
      accessory.removeService(occupancyService);
    }
    if (this.sensorInfo.serviceType == hap.Service.SmokeSensor) {
      this.service = smokeService;
    } else if (smokeService) {
      accessory.removeService(smokeService);
    }
    if (this.sensorInfo.serviceType == hap.Service.LeakSensor) {
      this.service = leakService;
    } else if (leakService) {
      accessory.removeService(leakService);
    }
    if (this.sensorInfo.serviceType == hap.Service.LightSensor) {
      this.service = lightService;
    } else if (lightService) {
      accessory.removeService(lightService);
    }
    if (this.sensorInfo.serviceType == hap.Service.HumiditySensor) {
      this.service = humidityService;
    } else if (humidityService) {
      accessory.removeService(humidityService);
    }
    if (this.sensorInfo.serviceType == hap.Service.CarbonMonoxideSensor) {
      this.service = monoxideService;
    } else if (monoxideService) {
      accessory.removeService(monoxideService);
    }
    if (this.sensorInfo.serviceType == hap.Service.CarbonDioxideSensor) {
      this.service = dioxideService;
    } else if (dioxideService) {
      accessory.removeService(dioxideService);
    }
    if (this.sensorInfo.serviceType == hap.Service.AirQualitySensor) {
      this.service = airService;
    } else if (airService) {
      accessory.removeService(airService);
    }*/

    this.service?.setCharacteristic(this.sensorInfo.characteristicType, this.sensorInfo.untrippedValue);
  }

  addUpdateAccessory(): void {
    if (!this.service) {
      const uuid = hap.uuid.generate(PLATFORM_NAME);
      const newAccessory = new Accessory('Plugin Update Check', uuid);

      newAccessory.addService(this.sensorInfo.serviceType);

      this.configureAccessory(newAccessory);

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [newAccessory]);
    }

    this.timer = setTimeout(this.doCheck.bind(this), 60 * 1000); // Oznu recommends waiting 60 seconds on start
  }

  getSensorInfo(sensorType?: string): SensorInfo {
    switch (sensorType?.toLowerCase()) {
      case 'contact':
        return {
          serviceType: hap.Service.ContactSensor,
          characteristicType: hap.Characteristic.ContactSensorState,
          untrippedValue: 0,
          trippedValue: 1
        };
      case 'occupancy':
        return {
          serviceType: hap.Service.OccupancySensor,
          characteristicType: hap.Characteristic.OccupancyDetected,
          untrippedValue: 0,
          trippedValue: 1
        };
      case 'smoke':
        return {
          serviceType: hap.Service.SmokeSensor,
          characteristicType: hap.Characteristic.SmokeDetected,
          untrippedValue: 0,
          trippedValue: 1
        };
      case 'leak':
        return {
          serviceType: hap.Service.LeakSensor,
          characteristicType: hap.Characteristic.LeakDetected,
          untrippedValue: 0,
          trippedValue: 1
        };
      case 'light':
        return {
          serviceType: hap.Service.LightSensor,
          characteristicType: hap.Characteristic.CurrentAmbientLightLevel,
          untrippedValue: 0.0001,
          trippedValue: 100000
        };
      case 'humidity':
        return {
          serviceType: hap.Service.HumiditySensor,
          characteristicType: hap.Characteristic.CurrentRelativeHumidity,
          untrippedValue: 0,
          trippedValue: 100
        };
      case 'monoxide':
        return {
          serviceType: hap.Service.CarbonMonoxideSensor,
          characteristicType: hap.Characteristic.CarbonMonoxideDetected,
          untrippedValue: 0,
          trippedValue: 1
        };
      case 'dioxide':
        return {
          serviceType: hap.Service.CarbonDioxideSensor,
          characteristicType: hap.Characteristic.CarbonDioxideDetected,
          untrippedValue: 0,
          trippedValue: 1
        };
      case 'air':
        return {
          serviceType: hap.Service.AirQualitySensor,
          characteristicType: hap.Characteristic.AirQuality,
          untrippedValue: 1,
          trippedValue: 5
        };
      case 'motion':
      default:
        return {
          serviceType: hap.Service.MotionSensor,
          characteristicType: hap.Characteristic.MotionDetected,
          untrippedValue: false,
          trippedValue: true
        };
    }
  }
}

export = (api: API): void => {
  hap = api.hap;
  Accessory = api.platformAccessory;

  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, PluginUpdatePlatform);
};