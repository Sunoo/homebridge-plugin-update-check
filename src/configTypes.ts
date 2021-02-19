import { PlatformIdentifier, PlatformName } from 'homebridge';

export type PluginUpdatePlatformConfig = {
  platform: PlatformName | PlatformIdentifier;
  checkFrequency: number;
};