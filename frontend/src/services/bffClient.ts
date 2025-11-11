import axios, { AxiosInstance } from 'axios';

/**
 * BFF Client for CloudFront + ALB/API Gateway architecture
 *
 * Architecture:
 * Browser → CloudFront → /api/* → BFF (ALB/Lambda) → Moodle/AI APIs
 *                      → /* → S3 (SPA)
 */

// BFFのベースURL（CloudFront経由）
const BFF_BASE_URL = process.env.REACT_APP_BFF_URL || '/api';

interface LoginRequest {
  username: string;
  password: string;
  service?: string;
}

interface LoginResponse {
  success: boolean;
  userId?: number;
  error?: string;
}

class BFFClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BFF_BASE_URL,
      timeout: 30000,
      withCredentials: true, // HTTPOnly Cookieを送信
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // レスポンスインターセプター
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // 認証エラー時はログイン画面にリダイレクト
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * ログイン
   * トークンはBFF側でHTTPOnly Cookieとして保存される
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.api.post('/login', credentials);
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.error || 'ログインに失敗しました');
    }
  }

  /**
   * ログアウト
   */
  async logout(): Promise<void> {
    try {
      await this.api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * ユーザー情報取得
   */
  async getUserInfo(): Promise<any> {
    const response = await this.api.get('/user/info');
    return response.data;
  }

  /**
   * コース一覧取得
   */
  async getCourses(): Promise<any[]> {
    try {
      const response = await this.api.get('/moodle/courses');
      return response.data;
    } catch (error) {
      console.error('Get courses error:', error);
      return [];
    }
  }

  /**
   * コース検索
   */
  async searchCourses(query: string): Promise<any[]> {
    const response = await this.api.get('/moodle/courses/search', {
      params: { q: query }
    });
    return response.data;
  }

  /**
   * カテゴリ一覧取得
   */
  async getCategories(): Promise<any[]> {
    const response = await this.api.get('/moodle/categories');
    return response.data;
  }

  /**
   * コース作成
   */
  async createCourse(courseData: any): Promise<any> {
    const response = await this.api.post('/moodle/courses', courseData);
    return response.data;
  }

  /**
   * アクティビティ作成
   */
  async createActivity(courseid: number, modulename: string, activityData: any): Promise<any> {
    const response = await this.api.post(`/moodle/courses/${courseid}/activities`, {
      modulename,
      ...activityData
    });
    return response.data;
  }

  /**
   * コースコンテンツ取得
   */
  async getCourseContent(courseid: number): Promise<any> {
    const response = await this.api.get(`/moodle/courses/${courseid}/contents`);
    return response.data;
  }

  /**
   * ファイルアップロード
   */
  async uploadFile(file: File, courseid: number): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseid', courseid.toString());

    const response = await this.api.post('/moodle/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * AI要約生成
   */
  async summarizeContent(courseId: number, moduleName?: string, query?: string): Promise<any> {
    try {
      const response = await this.api.post('/ai/summarize', {
        courseId,
        moduleName,
        query,
        maxChunks: 5
      });
      return response.data;
    } catch (error: any) {
      console.error('AI summarization error:', error);
      throw new Error(error.response?.data?.error || 'AI要約の生成に失敗しました');
    }
  }

  /**
   * コースモジュール取得
   */
  async getCourseModules(courseId: number): Promise<any> {
    try {
      const response = await this.api.get(`/ai/courses/${courseId}/modules`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching course modules:', error);
      return { modules: [] };
    }
  }

  /**
   * Moodle API直接呼び出し（汎用）
   */
  async callMoodleAPI<T>(wsfunction: string, params: Record<string, any> = {}): Promise<T> {
    const response = await this.api.post('/moodle/api', {
      wsfunction,
      params
    });
    return response.data;
  }

  /**
   * ダッシュボードデータ取得（集約API）
   */
  async getDashboard(): Promise<any> {
    const response = await this.api.get('/dashboard');
    return response.data;
  }

  /**
   * ヘルスチェック
   */
  async health(): Promise<any> {
    const response = await this.api.get('/health');
    return response.data;
  }
}

export const bffClient = new BFFClient();
export default bffClient;
