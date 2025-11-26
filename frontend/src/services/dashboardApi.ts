import { bffAPI } from './bffApi';
import { DashboardData, ParentCategoryProgress, CategoryProgress, CourseProgress } from '../types/dashboard';
import { CourseCategory } from '../types/content';

class DashboardAPI {
  private userId: number | null = null;

  async getDashboardData(): Promise<DashboardData> {
    try {
      console.log('Starting dashboard data fetch via BFF...');

      // ユーザーIDを取得（エラーが発生しても続行）
      if (!this.userId) {
        try {
          const userInfo = await bffAPI.getUserInfo();
          this.userId = (userInfo as any).userid;
          console.log('User ID obtained:', this.userId);
        } catch (error) {
          console.warn('Failed to get user info, continuing without user ID:', error);
          this.userId = 2; // デフォルトユーザーID
        }
      }

      // BFF経由で必要なデータを取得（タイムアウト対策でシーケンシャルに変更）
      console.log('Fetching courses via BFF...');
      const courses = await bffAPI.getCourses();
      console.log(`Found ${courses.length} courses`);
      console.log('Course names:', courses.map(c => ({ id: c.id, name: c.fullname })));
      console.log('Course categoryid values:', courses.map(c => ({ id: c.id, categoryid: c.categoryid, categoryname: c.categoryname })));

      console.log('Fetching categories via BFF...');
      let categories: CourseCategory[];
      try {
        categories = await bffAPI.getCategories();
        console.log(`Found ${categories.length} categories`);
        console.log('Category names:', categories.map(c => ({ id: c.id, name: c.name })));
      } catch (error: any) {
        console.warn('Failed to fetch categories, using course categories instead:', error);
        // カテゴリ取得失敗時はコースから推定
        categories = courses.map(c => ({
          id: c.categoryid || 1,
          name: 'その他',
          parent: 0,
          description: '',
          sortorder: 0,
          coursecount: 0,
          visible: 1,
          timemodified: 0,
          depth: 1,
          path: `/${c.categoryid || 1}`
        }));
      }

      // 親カテゴリを取得（parent=0のカテゴリが親カテゴリ）
      const parentCategories = categories.filter(cat => cat.parent === 0);

      // 進捗データを取得（各コースの完了状況）- バッチ処理で負荷軽減
      console.log('Fetching course progress in batches...');
      const courseProgresses: CourseProgress[] = [];
      const batchSize = 2; // 一度に2コースずつ処理

      for (let i = 0; i < courses.length; i += batchSize) {
        const batch = courses.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(courses.length / batchSize)}`);

        const batchResults = await Promise.all(
          batch.map(async (course) => {
            try {
              const completion = await this.getCourseCompletion(course.id);
              const parentCategory = this.getParentCategoryName(course.categoryid, categories);
              const courseType = this.extractCourseType(course);

              return {
                id: course.id,
                fullname: course.fullname,
                shortname: course.shortname,
                categoryname: this.getCategoryName(course.categoryid, categories),
                parentCategory,
                type: courseType,
                progressPercentage: completion.progressPercentage,
                isCompleted: completion.isCompleted,
                summary: course.summary,
                startdate: course.startdate,
                enddate: course.enddate
              } as CourseProgress;
            } catch (error) {
              console.warn(`Failed to get progress for course ${course.id}:`, error);
              return {
                id: course.id,
                fullname: course.fullname,
                shortname: course.shortname,
                categoryname: this.getCategoryName(course.categoryid, categories),
                parentCategory: this.getParentCategoryName(course.categoryid, categories),
                type: this.extractCourseType(course),
                progressPercentage: 0,
                isCompleted: false,
                summary: course.summary,
                startdate: course.startdate,
                enddate: course.enddate
              } as CourseProgress;
            }
          })
        );

        courseProgresses.push(...batchResults);

        // バッチ間に小さな遅延を入れてサーバー負荷を軽減
        if (i + batchSize < courses.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 親カテゴリ別にデータを整理
      const parentCategoryProgresses = parentCategories.map(parentCat => {
        const parentCourses = courseProgresses.filter(course => course.parentCategory === parentCat.name);
        const categoriesMap = new Map<number, CategoryProgress>();

        parentCourses.forEach(course => {
          const categoryId = categories.find(cat => cat.name === course.categoryname)?.id || 0;
          if (!categoriesMap.has(categoryId)) {
            categoriesMap.set(categoryId, {
              id: categoryId,
              name: course.categoryname,
              courses: [],
              totalCourses: 0,
              completedCourses: 0,
              averageProgress: 0
            });
          }

          const category = categoriesMap.get(categoryId)!;
          category.courses.push(course);
          category.totalCourses++;
          if (course.isCompleted) {
            category.completedCourses++;
          }
        });

        // カテゴリの平均進捗率を計算
        categoriesMap.forEach(category => {
          if (category.courses.length > 0) {
            category.averageProgress = category.courses.reduce((sum, course) =>
              sum + course.progressPercentage, 0) / category.courses.length;
          }
        });

        const parentCategories = Array.from(categoriesMap.values());
        const totalCourses = parentCourses.length;
        const completedCourses = parentCourses.filter(c => c.isCompleted).length;
        const averageProgress = totalCourses > 0 ?
          parentCourses.reduce((sum, course) => sum + course.progressPercentage, 0) / totalCourses : 0;

        return {
          parentCategory: {
            id: parentCat.id,
            name: parentCat.name,
            description: parentCat.description
          },
          categories: parentCategories,
          totalCourses,
          completedCourses,
          averageProgress
        } as ParentCategoryProgress;
      });

      // 全体の統計を計算
      const totalCourses = courseProgresses.length;
      const completedCourses = courseProgresses.filter(c => c.isCompleted).length;
      const averageProgress = totalCourses > 0 ?
        courseProgresses.reduce((sum, course) => sum + course.progressPercentage, 0) / totalCourses : 0;

      return {
        parentCategories: parentCategoryProgresses,
        totalProgress: {
          totalCourses,
          completedCourses,
          averageProgress
        }
      };
    } catch (error: any) {
      console.error('Failed to get dashboard data:', error);

      // タイムアウトエラーの場合は部分的なデータを返す
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        console.warn('Dashboard data fetch timed out, returning fallback data');
        return this.getFallbackDashboardData();
      }

      // 認証エラーの場合は再スロー
      if (error.message?.includes('Authentication token') || error.message?.includes('Invalid token')) {
        throw error;
      }

      // その他のエラーの場合もフォールバックデータを返す
      console.warn('Dashboard data fetch failed, returning fallback data');
      return this.getFallbackDashboardData();
    }
  }

  private getFallbackDashboardData(): DashboardData {
    return {
      parentCategories: [
        {
          parentCategory: {
            id: 1,
            name: 'Miscellaneous',
            description: 'Default category (offline mode)'
          },
          categories: [
            {
              id: 1,
              name: 'Miscellaneous',
              courses: [],
              totalCourses: 0,
              completedCourses: 0,
              averageProgress: 0
            }
          ],
          totalCourses: 0,
          completedCourses: 0,
          averageProgress: 0
        }
      ],
      totalProgress: {
        totalCourses: 0,
        completedCourses: 0,
        averageProgress: 0
      }
    };
  }

  private async getCourseCompletion(courseId: number): Promise<{ progressPercentage: number; isCompleted: boolean }> {
    try {
      // ユーザーIDが必要
      if (!this.userId) {
        console.warn('User ID not available, returning default completion');
        return { progressPercentage: 0, isCompleted: false };
      }

      // BFF経由でMoodle completion APIを使用
      const completion = await bffAPI.callMoodleAPI('core_completion_get_course_completion_status', {
        courseid: courseId,
        userid: this.userId
      });

      if (completion && completion.completionstatus) {
        const status = completion.completionstatus;
        const isCompleted = status.completed === true || status.completed === 1;
        const progressPercentage = isCompleted ? 100 : (status.progress || 0);

        return { progressPercentage, isCompleted };
      }

      // フォールバック: コース内容から進捗を推定
      const courseContent = await bffAPI.getCourseContent(courseId);
      if (courseContent && Array.isArray(courseContent)) {
        const totalActivities = courseContent.reduce((total, section) =>
          total + (section.modules ? section.modules.length : 0), 0);

        if (totalActivities === 0) {
          return { progressPercentage: 100, isCompleted: true };
        }

        // 簡易的な進捗計算（実際のMoodle環境では完了データが必要）
        return { progressPercentage: 50, isCompleted: false };
      }

      return { progressPercentage: 0, isCompleted: false };
    } catch (error: any) {
      console.debug(`Could not determine completion for course ${courseId}, using default values:`, error.message);
      return { progressPercentage: 0, isCompleted: false };
    }
  }

  private getParentCategoryName(categoryId: number, categories: CourseCategory[]): string {
    // カテゴリIDから親カテゴリ名を取得
    const category = categories.find((cat: CourseCategory) => cat.id === categoryId);
    if (!category) {
      return 'その他';
    }

    // 親カテゴリ（parent=0）の場合はそのまま返す
    if (category.parent === 0) {
      return category.name;
    }

    // 親カテゴリを再帰的に探す
    const parentCategory = categories.find((cat: CourseCategory) => cat.id === category.parent);
    if (parentCategory) {
      if (parentCategory.parent === 0) {
        return parentCategory.name;
      } else {
        // さらに上の親を探す
        return this.getParentCategoryName(parentCategory.id, categories);
      }
    }

    return category.name;
  }

  private extractCourseType(course: any): 'required' | 'advanced' {
    // コースカスタムフィールドから種別を抽出
    if (course.customfields) {
      const typeField = course.customfields.find((field: any) =>
        field.shortname === 'course_type' || field.shortname === 'type');
      if (typeField) {
        return typeField.value === 'required' || typeField.value === '必修' ? 'required' : 'advanced';
      }
    }

    // コース名から推定
    if (course.fullname.includes('必修') || course.fullname.includes('Required')) {
      return 'required';
    }
    if (course.fullname.includes('発展') || course.fullname.includes('Advanced')) {
      return 'advanced';
    }

    // デフォルト
    return 'required';
  }

  private getCategoryName(categoryId: number, categories: any[]): string {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'その他';
  }
}

export const dashboardAPI = new DashboardAPI();