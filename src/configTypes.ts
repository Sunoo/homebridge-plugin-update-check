import { PlatformIdentifier, PlatformName } from 'homebridge';

export type PluginUpdatePlatformConfig = {
  platform: PlatformName | PlatformIdentifier;
  forceNcu?: boolean;
  sensorType?: string;
};
