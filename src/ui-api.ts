import {
  HomebridgeConfig,
  PlatformIdentifier,
  PlatformName
} from 'homebridge';
import axios from 'axios';
import { readFileSync } from 'fs';
import https from 'https';
import jwt from 'jsonwebtoken';
import path from 'path';

export interface InstalledPlugin {
  name: string;
  installedVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

interface SecretsFile {
  secretKey: string;
}

interface UiConfig {
  platform: PlatformName | PlatformIdentifier;
  host?: string;
  port?: number;
  ssl?: {
    key?: string;
    pfx?: string;
  }
}

export class UiApi {
  private readonly secrets?: SecretsFile;
  private readonly ssl?: boolean;
  private readonly baseUrl?: string;
  private token?: string;

  constructor(hbStoragePath: string) {
    const configPath = path.resolve(hbStoragePath, 'config.json');
    const hbConfig = JSON.parse(readFileSync(configPath, 'utf8')) as HomebridgeConfig;
    const config = hbConfig.platforms.find((config: { platform: string }) =>
      config.platform === 'config' || config.platform === 'homebridge-config-ui-x.config') as UiConfig;

    if (config) {
      const secretPath = path.resolve(hbStoragePath, '.uix-secrets');
      this.secrets = JSON.parse(readFileSync(secretPath, 'utf8'));

      this.ssl = !!config.ssl?.key || !!config.ssl?.pfx;

      const protocol = this.ssl ? 'https://' : 'http://';
      const host = config.host ?? 'localhost';
      const port = config.port ?? 8581;

      this.baseUrl = protocol + host + ':' + port.toString();
    }
  }

  public isConfigured(): boolean {
    return this.secrets !== undefined;
  }

  public async getHomebridge(): Promise<InstalledPlugin> {
    if (this.isConfigured()) {
      return await this.makeCall('/api/status/homebridge-version') as InstalledPlugin;
    } else {
      return {
        name: '',
        installedVersion: '',
        latestVersion: '',
        updateAvailable: false
      };
    }
  }

  public async getPlugins(): Promise<Array<InstalledPlugin>> {
    if (this.isConfigured()) {
      return await this.makeCall('/api/plugins') as Array<InstalledPlugin>;
    } else {
      return [];
    }
  }

  private async makeCall(apiPath: string): Promise<unknown> {
    const response = await axios.get(this.baseUrl + apiPath, {
      headers: {
        Authorization: 'Bearer ' + this.getToken()
      },
      httpAgent: this.ssl ? new https.Agent({ rejectUnauthorized: false }) : undefined
    });

    return response.data;
  }

  private getToken(): string {
    if (this.token) {
      return this.token;
    }

    const user = { // fake user
      username: 'homebridge-plugin-update-check',
      name: 'homebridge-plugin-update-check',
      admin: true,
      instanceId: 'xxxxxxx'
    };

    this.token = jwt.sign(user, this.secrets!.secretKey, { expiresIn: '1m' });

    setTimeout(((): void => {
      this.token = undefined;
    }).bind(this), 30 * 1000);

    return this.token;
  }
}
