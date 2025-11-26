import axios, { AxiosInstance } from 'axios';

const BFF_URL = process.env.REACT_APP_BFF_URL || 'http://localhost:3001';

class BffAPI {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BFF_URL,
      timeout: 60000,
      withCredentials: true, // セッションCookieを送信
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // レスポンスインターセプター - エラーハンドリング
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error('Unauthorized - session expired');
          // セッション切れの場合は認証状態をクリア
          // authStoreをクリアすることで、ProtectedRouteが自動的にログイン画面にリダイレクトする
          if (typeof window !== 'undefined') {
            // authStoreをインポートせずに、直接localStorageをクリアする
            localStorage.removeItem('auth-storage');
            // ログイン画面にリダイレクト（React Routerを通さないため、完全なページリロード）
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ユーザー情報を取得
  async getUserInfo(): Promise<any> {
    const response = await this.api.get('/api/user/info');
    return response.data;
  }

  // コース一覧を取得
  async getCourses(): Promise<any[]> {
    const response = await this.api.get('/api/moodle/courses');
    return response.data;
  }

  // カテゴリ一覧を取得
  async getCategories(): Promise<any[]> {
    const response = await this.api.get('/api/moodle/categories');
    return response.data;
  }

  // カテゴリ作成
  async createCategories(categoriesData: any[]): Promise<any[]> {
    const response = await this.api.post('/api/moodle/categories', categoriesData);
    return response.data;
  }

  // 汎用 Moodle API コール
  async callMoodleAPI(wsfunction: string, params: Record<string, any> = {}): Promise<any> {
    const response = await this.api.post('/api/moodle/api', {
      wsfunction,
      params,
    });
    return response.data;
  }

  // コースコンテンツを取得
  async getCourseContent(courseid: number): Promise<any> {
    const response = await this.api.get(`/api/moodle/courses/${courseid}/contents`);
    return response.data;
  }

  // コース作成
  async createCourse(courseData: any): Promise<any> {
    const response = await this.api.post('/api/moodle/courses', courseData);
    return response.data;
  }

  // アクティビティ作成
  async createActivity(courseid: number, modulename: string, activityData: any): Promise<any> {
    const response = await this.api.post(`/api/moodle/courses/${courseid}/activities`, {
      modulename,
      ...activityData
    });
    return response.data;
  }

  // ファイルアップロード
  async uploadFile(file: File, courseid: number): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseid', courseid.toString());

    const response = await this.api.post('/api/moodle/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // AI要約
  async summarizeContent(courseId: number, moduleName?: string, query?: string): Promise<any> {
    const response = await this.api.post('/api/ai/summarize', {
      courseId,
      moduleName,
      query,
      maxChunks: 5
    });
    return response.data;
  }

  // コースモジュール取得
  async getCourseModules(courseId: number): Promise<any> {
    const response = await this.api.get(`/api/ai/courses/${courseId}/modules`);
    return response.data;
  }
}

export const bffAPI = new BffAPI();
