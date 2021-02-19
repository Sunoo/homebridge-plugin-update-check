import path from 'path';
import * as https from 'https';
import fs from 'fs-extra';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

export interface InstalledPlugins {
  name: string;
  installedVersion: string;
  latestVersion: string;
  updateAvailable: string;
}

interface SecretsFileInterface {
  secretKey: string;
}

interface HomebridgeConfig {
  platforms: Array<{
    platform: string;
    host?: string;
    port?: number;
    ssl?: {
      key?: string;
      pfx?: string;
    }
  }>
}

export class UiApi {
  private readonly secretFilePath = path.resolve(this.homebridgeStoragePath, '.uix-secrets');
  private readonly configFilePath = path.resolve(this.homebridgeStoragePath, 'config.json');

  constructor(
    private readonly homebridgeStoragePath: string
  ) {}

  public async getPlugins(): Promise<Array<InstalledPlugins>> {
    const baseUrl = await this.getBaseUrl();

    const response = await axios.get(baseUrl + '/api/plugins', {
      headers: {
        Authorization: 'Bearer ' + await this.getToken()
      },
      httpAgent: baseUrl.startsWith('https://') ? new https.Agent({
        rejectUnauthorized: false
      }) : null
    });

    return response.data;
  }

  private async getBaseUrl(): Promise<string> {
    let protocol = 'http://';
    let hostname = 'localhost';
    let port = 8581;

    const config: HomebridgeConfig = await fs.readJson(this.configFilePath);

    if (typeof config === 'object' && Array.isArray(config.platforms)) {
      const uiConfig = config.platforms.find(x => x.platform === 'config' || x.platform === 'homebridge-config-ui-x.config');

      if (uiConfig?.host) {
        hostname = uiConfig.host;
      }

      if (uiConfig?.port) {
        port = uiConfig.port;
      }

      if (uiConfig?.ssl?.key || uiConfig?.ssl?.pfx) {
        protocol = 'https://';
      }
    }

    return protocol + hostname + ':' + port.toString();
  }

  private async getToken(): Promise<string> {
    // load secrets file
    const secrets: SecretsFileInterface = await fs.readJson(this.secretFilePath);

    // create fake user
    const user = {
      username: 'homebridge-plugin-update-check',
      name: 'homebridge-plugin-update-check',
      admin: true,
      instanceId: 'xxxxxxx'
    };

    // sign token
    const token = jwt.sign(user, secrets.secretKey, { expiresIn: '1m' });

    return token;
  }
}
