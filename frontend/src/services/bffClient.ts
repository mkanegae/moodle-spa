import axios, { AxiosInstance } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  UserInfo,
  Category,
  CreateActivityRequest,
  Badge,
  UserBadge,
  Profile,
  ProfileUpdate,
  ResumeCourse,
  UpdateResumeCourseRequest,
  Roadmap,
  RoadmapQueryParams,
  AIRequest,
  AIResponse,
  UpdateDBRequest,
  UpdateDBResponse,
  HealthResponse,
} from '../types/api';

/**
 * BFF Client - 統合APIクライアント
 * swagger.yamlに準拠
 */

// BFFのベースURL
const BFF_BASE_URL = process.env.REACT_APP_BFF_URL
  ? `${process.env.REACT_APP_BFF_URL}/api`
  : '/api';

class BFFClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BFF_BASE_URL,
      timeout: 60000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== Health ====================

  /**
   * ヘルスチェック
   * GET /health
   */
  async health(): Promise<HealthResponse> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // ==================== 認証 ====================

  /**
   * ログイン
   * POST /api/login
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.api.post('/login', credentials);
    return response.data;
  }

  /**
   * ログアウト
   * POST /api/logout
   */
  async logout(): Promise<{ success: boolean }> {
    const response = await this.api.post('/logout');
    return response.data;
  }

  /**
   * 現在のユーザー情報を取得
   * GET /api/user/info
   */
  async getUserInfo(): Promise<UserInfo> {
    const response = await this.api.get('/user/info');
    return response.data;
  }

  // ==================== Moodle コース ====================

  /**
   * 全コース取得
   * GET /api/moodle/courses
   * @returns Moodleのコース配列（APIは定義以上のフィールドを返す場合がある）
   */
  async getCourses(): Promise<any[]> {
    const response = await this.api.get('/moodle/courses');
    return response.data;
  }

  /**
   * ユーザーの受講コース取得
   * GET /api/moodle/courses/{userid}
   * @returns Moodleのコース配列
   */
  async getUserCourses(userId: number): Promise<any[]> {
    const response = await this.api.get(`/moodle/courses/${userId}`);
    return response.data;
  }

  /**
   * コース検索
   * GET /api/moodle/courses/search
   * @returns Moodleのコース配列
   */
  async searchCourses(query: string): Promise<any[]> {
    const response = await this.api.get('/moodle/courses/search', {
      params: { q: query }
    });
    return response.data;
  }

  /**
   * カテゴリ一覧取得
   * GET /api/moodle/categories
   */
  async getCategories(): Promise<Category[]> {
    const response = await this.api.get('/moodle/categories');
    return response.data;
  }

  /**
   * コースコンテンツ取得
   * GET /api/moodle/courses/{courseid}/contents
   * @returns コースコンテンツ配列（APIは定義以上のフィールドを返す場合がある）
   */
  async getCourseContent(courseid: number): Promise<any[]> {
    const response = await this.api.get(`/moodle/courses/${courseid}/contents`);
    return response.data;
  }

  /**
   * アクティビティ作成
   * POST /api/moodle/courses/{courseid}/activities
   */
  async createActivity(
    courseid: number,
    activityData: CreateActivityRequest
  ): Promise<any> {
    const response = await this.api.post(
      `/moodle/courses/${courseid}/activities`,
      activityData
    );
    return response.data;
  }

  /**
   * フィールドでコース取得
   * GET /api/moodle/getcoursebyfield
   */
  async getCourseByField(field: string, value: string): Promise<any> {
    const response = await this.api.get('/moodle/getcoursebyfield', {
      params: { field, value }
    });
    return response.data;
  }

  /**
   * ファイルアップロード
   * POST /api/moodle/files/upload
   */
  async uploadFile(file: File, courseid: number): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseid', courseid.toString());

    const response = await this.api.post('/moodle/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /**
   * 汎用Moodle API呼び出し
   * POST /api/moodle/api
   */
  async callMoodleAPI<T>(
    wsfunction: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    const response = await this.api.post('/moodle/api', { wsfunction, params });
    return response.data;
  }

  // ==================== Moodle バッジ ====================

  /**
   * バッジ一覧取得
   * GET /api/moodle/badges
   */
  async getBadges(): Promise<Badge[]> {
    const response = await this.api.get('/moodle/badges');
    return response.data;
  }

  /**
   * ユーザーバッジ取得
   * GET /api/moodle/user-badges/{userid}
   */
  async getUserBadges(userId: number): Promise<UserBadge[]> {
    const response = await this.api.get(`/moodle/user-badges/${userId}`);
    return response.data;
  }

  // ==================== WebCoach ====================

  /**
   * ユーザープロフィール取得
   * GET /api/webcoach/profile/{userid}
   */
  async getUserProfile(userId: number): Promise<Profile> {
    const response = await this.api.get(`/webcoach/profile/${userId}`);
    return response.data;
  }

  /**
   * ユーザープロフィール更新
   * POST /api/webcoach/profile/{userid}
   */
  async updateUserProfile(
    userId: number,
    profileData: ProfileUpdate
  ): Promise<Profile> {
    const response = await this.api.post(
      `/webcoach/profile/${userId}`,
      profileData
    );
    return response.data;
  }

  /**
   * 再開コース取得
   * GET /api/webcoach/resumecourse/{userid}
   */
  async getResumeCourses(userId: number, limit: number = 5): Promise<ResumeCourse[]> {
    const response = await this.api.get(`/webcoach/resumecourse/${userId}`, {
      params: { limit }
    });
    return response.data;
  }

  /**
   * 再開コース更新
   * POST /api/webcoach/resumecourse/{userid}
   */
  async updateResumeCourse(
    userId: number,
    data: UpdateResumeCourseRequest
  ): Promise<ResumeCourse> {
    const response = await this.api.post(
      `/webcoach/resumecourse/${userId}`,
      data
    );
    return response.data;
  }

  /**
   * おすすめバッジ取得
   * GET /api/webcoach/recomendbadge/{userid}
   */
  async getRecommendedBadges(userId: number): Promise<Badge[]> {
    const response = await this.api.get(`/webcoach/recomendbadge/${userId}`);
    return response.data;
  }

  /**
   * ロードマップ一覧取得
   * GET /api/webcoach/roadmaps
   */
  async getRoadmaps(params?: RoadmapQueryParams): Promise<Roadmap[]> {
    const response = await this.api.get('/webcoach/roadmaps', { params });
    return response.data;
  }

  /**
   * ロードマップ詳細取得
   * GET /api/webcoach/roadmap/{roadmapid}
   */
  async getRoadmapDetail(roadmapId: number): Promise<Roadmap> {
    const response = await this.api.get(`/webcoach/roadmap/${roadmapId}`);
    return response.data;
  }

  /**
   * AIチャット
   * POST /api/webcoach/ai
   */
  async sendAIMessage(request: AIRequest): Promise<AIResponse> {
    const response = await this.api.post('/webcoach/ai', request);
    return response.data;
  }

  /**
   * データベース更新
   * POST /api/webcoach/updatedb
   */
  async updateDatabase(request: UpdateDBRequest): Promise<UpdateDBResponse> {
    const response = await this.api.post('/webcoach/updatedb', request);
    return response.data;
  }

  /**
   * コース画像取得（Base64）
   * GET /api/moodle/course-image?path={relativePath}
   * @param imageUrl - Moodleの画像URL（フルURLまたは相対パス）
   * @returns Base64エンコードされた画像データ（文字列またはオブジェクト）
   */
  async getCourseImage(imageUrl: string): Promise<any> {
    // フルURLから相対パスを抽出してデコード
    // 例: https://example.com/pluginfile.php/23/course/overviewfiles/%E3%82%B9%E3%82%AF...
    //   → /pluginfile.php/23/course/overviewfiles/スクリーンショット...
    let relativePath = imageUrl;
    try {
      const url = new URL(imageUrl);
      // pathnameをデコード（%E3%82%B9... → スクリーンショット...）
      relativePath = decodeURIComponent(url.pathname) + url.search;
    } catch {
      // 既に相対パスの場合はデコードを試みる
      try {
        relativePath = decodeURIComponent(imageUrl);
      } catch {
        // デコード失敗時はそのまま使用
      }
      if (!relativePath.startsWith('/')) {
        relativePath = '/' + relativePath;
      }
    }

    const response = await this.api.get('/moodle/course-image', {
      params: { path: relativePath }
    });
    return response.data;
  }
}

export const bffClient = new BFFClient();
export default bffClient;
