import { AxiosInstance } from 'axios';

export class CommunityTechClient {
  private baseUrl: string;
  private client: AxiosInstance;

  constructor(baseUrl: string, client: AxiosInstance) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.client = client;
  }

  private async request(method: 'get' | 'post', endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}/wp-json/communitytech/v1/${endpoint}`;

    try {
      const response = method === 'get'
        ? await this.client.get(url, { baseURL: '' })
        : await this.client.post(url, data, { baseURL: '' });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      if (status === 404) {
        throw new Error(
          `CommunityTech plugin endpoint not found (404). Is the plugin installed and activated? Endpoint: ${url}`
        );
      }
      if (status === 401 || status === 403) {
        throw new Error(
          `Permission denied on CommunityTech endpoint. User needs 'edit_posts' (reads) or 'manage_options' (writes). (${status}: ${message})`
        );
      }
      throw new Error(`CommunityTech API error: ${status} - ${message}`);
    }
  }

  async getKitSettings(): Promise<any> {
    return this.request('get', 'elementor/kit');
  }

  async getColors(): Promise<any> {
    return this.request('get', 'elementor/kit/colors');
  }

  async updateColors(data: { system_colors?: any[]; custom_colors?: any[] }): Promise<any> {
    return this.request('post', 'elementor/kit/colors', data);
  }

  async getFonts(): Promise<any> {
    return this.request('get', 'elementor/kit/typography');
  }

  async updateFonts(data: { system_typography?: any[]; custom_typography?: any[] }): Promise<any> {
    return this.request('post', 'elementor/kit/typography', data);
  }

  async getThemeStyle(): Promise<any> {
    return this.request('get', 'elementor/kit/theme-style');
  }

  async updateThemeStyle(settings: Record<string, any>): Promise<any> {
    return this.request('post', 'elementor/kit/theme-style', settings);
  }

  async getCssVariables(): Promise<any> {
    return this.request('get', 'elementor/kit/css-variables');
  }
}
