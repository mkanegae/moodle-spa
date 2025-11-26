import React, { useState, useEffect } from 'react';
import { bffAPI } from '../services/bffApi';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Textarea } from './ui/textarea';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Video,
  Download,
  MessageCircle,
  Send,
  Menu,
  ArrowLeft,
  Share
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import MarkdownRenderer from './MarkdownRenderer';

interface CourseContentPageProps {
  courseId: number;
  onBack: () => void;
}

interface Section {
  id: number;
  name: string;
  summary: string;
  modules: Module[];
}

interface Module {
  id: number;
  name: string;
  modname: string;
  contents?: ModuleContent[];
  description?: string;
}

interface ModuleContent {
  type: string;
  filename: string;
  fileurl: string;
  content?: string;
}

const CourseContentPage: React.FC<CourseContentPageProps> = ({ courseId, onBack }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [contentOpen, setContentOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [htmlContents, setHtmlContents] = useState<any[]>([]);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  useEffect(() => {
    loadCourseContent();
  }, [courseId]);

  useEffect(() => {
    const loadMarkdown = async () => {
      if (!selectedModule || !hasMarkdownContent(selectedModule)) {
        setMarkdownContent('');
        return;
      }

      setLoadingMarkdown(true);
      const mdFile = selectedModule.contents?.find(c => isMarkdownFile(c.filename));
      if (mdFile && mdFile.fileurl) {
        const content = await fetchMarkdownContent(mdFile.fileurl);
        setMarkdownContent(content);
      }
      setLoadingMarkdown(false);
    };

    loadMarkdown();
  }, [selectedModule]);

  const loadCourseContent = async () => {
    try {
      setLoading(true);
      setError(null);

      const content = await bffAPI.getCourseContent(courseId);

      if (Array.isArray(content)) {
        setSections(content);
        if (content.length > 0) {
          setExpandedSections([content[0].id]);
          if (content[0].modules && content[0].modules.length > 0) {
            setSelectedModule(content[0].modules[0]);
          }
        }
      }

      const courses = await bffAPI.getCourses();
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setCourseName(course.fullname);
      }

      // TODO: BFF APIにgetResourceHtmlContentsエンドポイントを追加する必要があります
      // const htmlData = await bffAPI.getResourceHtmlContents(courseId);
      // setHtmlContents(htmlData);
      setHtmlContents([]);
    } catch (error: any) {
      console.error('Failed to load course content:', error);
      setError(error.message || 'コースコンテンツの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleModuleSelect = (module: Module) => {
    setSelectedModule(module);
  };

  const isMarkdownFile = (filename: string): boolean => {
    return /\.(md|markdown)$/i.test(filename);
  };

  const isVideoFile = (filename: string): boolean => {
    return /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i.test(filename);
  };

  const isHtmlFile = (filename: string): boolean => {
    return /\.(html|htm|xhtml)$/i.test(filename);
  };

  type FileType = 'markdown' | 'video' | 'html' | 'other';

  const getFileType = (module: Module): FileType => {
    if (!module.contents || module.contents.length === 0) {
      if (module.modname === 'resource') {
        const htmlContent = htmlContents.find(h => h.cmid === module.id);
        if (htmlContent && htmlContent.content) {
          return 'html';
        }
      }
      if (module.description) {
        return 'other';
      }
      return 'other';
    }

    const hasMarkdown = module.contents.some(c => isMarkdownFile(c.filename));
    if (hasMarkdown) return 'markdown';

    const hasVideo = module.contents.some(c => isVideoFile(c.filename));
    if (hasVideo) return 'video';

    const hasHtml = module.contents.some(c => isHtmlFile(c.filename));
    if (hasHtml) return 'html';

    if (module.modname === 'resource') {
      const htmlContent = htmlContents.find(h => h.cmid === module.id);
      if (htmlContent && htmlContent.content) {
        return 'html';
      }
    }

    return 'other';
  };

  const hasMarkdownContent = (module: Module): boolean => {
    return getFileType(module) === 'markdown';
  };

  const fetchMarkdownContent = async (fileUrl: string): Promise<string> => {
    try {
      // TODO: BFF APIにfetchMarkdownFileエンドポイントを追加する必要があります
      // return await bffAPI.fetchMarkdownFile(fileUrl);
      return 'Markdownファイルの表示は現在準備中です。';
    } catch (error) {
      console.error('Error fetching markdown:', error);
      return 'Markdownファイルの読み込みに失敗しました。';
    }
  };

  const getVideoUrl = (module: Module): string | null => {
    if (!module.contents) return null;
    const videoFile = module.contents.find(c => isVideoFile(c.filename));
    if (!videoFile) return null;
    // TODO: BFF APIにaddTokenToFileUrlエンドポイントを追加する必要があります
    // return bffAPI.addTokenToFileUrl(videoFile.fileurl);
    return videoFile.fileurl;
  };

  const getModuleContent = (module: Module) => {
    if (!module) return '';

    const fileType = getFileType(module);

    switch (fileType) {
      case 'markdown':
      case 'video':
        return '';

      case 'html':
        const htmlContent = htmlContents.find(h => h.cmid === module.id);
        if (htmlContent && htmlContent.content) {
          return htmlContent.content;
        }
        if (module.description) {
          return module.description;
        }
        break;

      case 'other':
      default:
        if (module.description) {
          return module.description;
        }

        if (module.contents && module.contents.length > 0) {
          const textContent = module.contents.find(c => c.content);
          if (textContent && textContent.content) {
            return textContent.content;
          }
          return module.contents.map(c => c.filename).join(', ');
        }
        break;
    }

    return 'このモジュールにはコンテンツがありません。';
  };

  const handleAiQuestion = () => {
    if (!aiQuestion.trim()) return;

    setAiMessages(prev => [
      ...prev,
      { role: 'user', content: aiQuestion },
      { role: 'assistant', content: 'これは模擬応答です。実際の実装では、AIモデルに接続して質問に回答します。' }
    ]);
    setAiQuestion('');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'page':
      case 'resource':
        return <FileText className="w-4 h-4 text-gray-500" />;
      case 'url':
        return <Download className="w-4 h-4 text-gray-500" />;
      default:
        return <Video className="w-4 h-4 text-gray-500" />;
    }
  };

  const calculateProgress = () => {
    const totalModules = sections.reduce((sum, section) => sum + section.modules.length, 0);
    return totalModules > 0 ? 0 : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={onBack} className="mt-4">戻る</Button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white hover:bg-gray-800 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
              <span className="hidden sm:inline">戻る</span>
            </Button>
            <h1 className="text-white truncate text-sm sm:text-base lg:text-lg">{courseName}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full">
              <Progress value={progress} className="w-20 h-2" />
              <span className="text-gray-300 text-sm whitespace-nowrap">{progress}%</span>
            </div>
            <Button variant="outline" className="text-white border-white hover:bg-gray-800 hidden md:flex">
              <Share className="w-4 h-4 mr-2" />
              共有
            </Button>
            <Sheet open={contentOpen} onOpenChange={setContentOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="text-white border-white hover:bg-gray-800 lg:hidden" size="sm">
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>コースコンテンツ</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <CourseSidebar
                    sections={sections}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    getActivityIcon={getActivityIcon}
                    selectedModule={selectedModule}
                    onModuleSelect={handleModuleSelect}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {/* Mobile Progress Bar */}
        <div className="sm:hidden mt-2 flex items-center gap-2">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-gray-300 text-xs whitespace-nowrap">{progress}%</span>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Video/Content Display Area */}
          {selectedModule && (() => {
            const fileType = getFileType(selectedModule);
            const videoUrl = fileType === 'video' ? getVideoUrl(selectedModule) : null;

            return (
              <>
                {fileType === 'video' && videoUrl ? (
                  <Card className="bg-black mb-4 sm:mb-6 overflow-hidden shadow-xl">
                    <div className="aspect-video">
                      <video
                        controls
                        className="w-full h-full"
                      >
                        <source src={videoUrl} type="video/mp4" />
                        <source src={videoUrl} type="video/webm" />
                        <source src={videoUrl} type="video/ogg" />
                        お使いのブラウザは動画タグをサポートしていません。
                      </video>
                    </div>
                  </Card>
                ) : (
                  <Card className="bg-black mb-4 sm:mb-6 overflow-hidden shadow-xl">
                    <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                      <div className="text-center">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">コンテンツプレビュー</p>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            );
          })()}

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-white border-b border-gray-200 w-full justify-start rounded-none h-auto p-0">
              <TabsTrigger value="overview" className="text-sm sm:text-base">概要</TabsTrigger>
              <TabsTrigger value="resources" className="text-sm sm:text-base">リソース</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 sm:mt-6">
              <Card className="bg-white shadow-md">
                <CardContent className="p-4 sm:p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                    {selectedModule?.name || 'コンテンツを選択してください'}
                  </h2>
                  <div className="space-y-3 sm:space-y-4">
                    {selectedModule && (() => {
                      const fileType = getFileType(selectedModule);

                      if (fileType === 'markdown') {
                        return loadingMarkdown ? (
                          <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                          </div>
                        ) : markdownContent ? (
                          <div className="prose max-w-none">
                            <MarkdownRenderer content={markdownContent} />
                          </div>
                        ) : (
                          <p className="text-gray-500">Markdownファイルの読み込みに失敗しました。</p>
                        );
                      }

                      if (fileType === 'html' || fileType === 'other') {
                        const content = getModuleContent(selectedModule);
                        return (
                          <div
                            className="prose max-w-none text-gray-700 leading-relaxed text-sm sm:text-base"
                            dangerouslySetInnerHTML={{ __html: content }}
                          />
                        );
                      }

                      return (
                        <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                          上記のコンテンツをご覧ください。
                        </p>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources" className="mt-4 sm:mt-6">
              <Card className="bg-white shadow-md">
                <CardContent className="p-4 sm:p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 sm:mb-4">コースリソース</h2>
                  <div className="space-y-2 sm:space-y-3">
                    {selectedModule?.contents && selectedModule.contents.length > 0 ? (
                      selectedModule.contents.map((content, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <Download className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <span className="text-gray-900 text-sm sm:text-base">{content.filename}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">リソースはありません</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Desktop */}
        <div className="hidden lg:block w-80 xl:w-96 border-l border-gray-200 bg-white overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
          <div className="p-4 xl:p-6 sticky top-0 bg-white border-b border-gray-200 z-10">
            <h2 className="text-lg font-semibold text-gray-900">コースコンテンツ</h2>
            <p className="text-gray-500 mt-1 text-sm">
              {sections.length}セクション • {sections.reduce((sum, s) => sum + s.modules.length, 0)}項目
            </p>
          </div>
          <div className="p-4 xl:p-6">
            <CourseSidebar
              sections={sections}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              getActivityIcon={getActivityIcon}
              selectedModule={selectedModule}
              onModuleSelect={handleModuleSelect}
            />
          </div>
        </div>
      </div>

      {/* AI Assistant Floating Button */}
      <Sheet open={aiChatOpen} onOpenChange={setAiChatOpen}>
        <SheetTrigger asChild>
          <Button className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 shadow-lg z-50 rounded-full px-6 py-6 h-auto gap-2">
            <MessageCircle className="w-5 h-5 text-white" />
            <span className="text-white">AIに質問</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-96 flex flex-col">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <SheetTitle>AIアシスタント</SheetTitle>
                <p className="text-sm text-gray-500 mt-1">コース内容についてサポートします</p>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {aiMessages.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AIアシスタントへようこそ</h3>
                <p className="text-gray-500 mb-4">コースの内容について、わからないことがあれば何でも質問してください。</p>
                <div className="text-left bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-gray-700">例えば：</p>
                  <ul className="text-gray-600 space-y-1 list-disc list-inside text-sm">
                    <li>{selectedModule?.name || 'このセクション'}について教えて</li>
                    <li>重要なポイントは何ですか？</li>
                    <li>練習問題はありますか？</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {aiMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                        }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="質問を入力してください..."
                value={aiQuestion}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiQuestion(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAiQuestion();
                  }
                }}
                className="flex-1 resize-none"
                rows={3}
              />
              <Button
                onClick={handleAiQuestion}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!aiQuestion.trim()}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

function CourseSidebar({
  sections,
  expandedSections,
  toggleSection,
  getActivityIcon,
  selectedModule,
  onModuleSelect
}: {
  sections: Section[];
  expandedSections: number[];
  toggleSection: (id: number) => void;
  getActivityIcon: (type: string) => JSX.Element;
  selectedModule: Module | null;
  onModuleSelect: (module: Module) => void;
}) {
  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <Collapsible
          key={section.id}
          open={expandedSections.includes(section.id)}
          onOpenChange={() => toggleSection(section.id)}
        >
          <div className="flex items-start gap-3 p-3 sm:p-4 hover:bg-blue-50 rounded-lg border border-gray-200 transition-all hover:border-blue-300 hover:shadow-sm">
            <Checkbox
              className="mt-1 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
            <CollapsibleTrigger className="flex-1 text-left min-w-0 group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm sm:text-base leading-snug text-gray-900">
                  <span className="text-gray-500 mr-1">Section {index + 1}:</span>
                  {section.name}
                </p>
                {expandedSections.includes(section.id) ? (
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  0 / {section.modules.length}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  {section.modules.length * 3}min
                </span>
              </div>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="ml-8 sm:ml-10 mt-2 space-y-1.5 sm:space-y-2 border-l-2 border-gray-200 pl-4">
              {section.modules.map((module) => (
                <div
                  key={module.id}
                  onClick={() => onModuleSelect(module)}
                  className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded cursor-pointer transition-colors group ${selectedModule?.id === module.id
                    ? 'bg-blue-100 border border-blue-300'
                    : 'hover:bg-blue-50'
                    }`}
                >
                  <Checkbox
                    checked={false}
                    className="flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-shrink-0">{getActivityIcon(module.modname)}</div>
                  <span className={`flex-1 text-sm sm:text-base ${selectedModule?.id === module.id
                    ? 'text-blue-700 font-medium'
                    : 'text-gray-700 group-hover:text-blue-700'
                    }`}>
                    {module.name}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

export default CourseContentPage;
