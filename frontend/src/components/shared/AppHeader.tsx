import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Bot, Send, X, User, Home, BookOpen } from 'lucide-react';
import { bffClient } from '../../services/bffClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    chunk_index: number;
    module_name: string;
    filename: string;
    section_name: string;
    similarity: number;
  }>;
}

interface AppHeaderProps {
  userName?: string;
  avatarUrl?: string;
}

export function AppHeader({ userName = 'User', avatarUrl }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // AI Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'こんにちは！WebCoach AI学習アシスタントです。学習に関する質問や、コースのおすすめ、キャリアパスについてなど、お気軽にご相談ください。',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const avatarSrc = avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=F0EAE6&color=CDC6C6`;

  const isMyPage = location.pathname === '/mypage' || location.pathname === '/';
  const isCoursesPage = location.pathname === '/courses' || location.pathname.startsWith('/courses/');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const result = await bffClient.sendAIMessage({
        message: currentInput,
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message || '回答を取得できませんでした',
        timestamp: new Date(),
        sources: (result.sources || []).map(s => ({
          chunk_index: s.chunk_index || 0,
          module_name: s.module_name || '',
          filename: s.filename || '',
          section_name: s.section_name || '',
          similarity: s.similarity || 0
        })),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI response error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `申し訳ございません。エラーが発生しました: ${error.message || '不明なエラー'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm" style={{ height: '77px' }}>
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Left: Logo and Navigation */}
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/mypage')}
            >
              <img
                src="/logo_WEBCOACH.png"
                alt="WEBCOACH"
                className="h-[45px] w-auto object-contain"
              />
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => navigate('/mypage')}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  isMyPage
                    ? 'text-white'
                    : 'text-[#7E6E68] hover:bg-gray-50'
                }`}
                style={isMyPage ? {
                  background: 'linear-gradient(135deg, #E86D78, #FA9262)',
                  fontFamily: 'Noto Sans JP, sans-serif',
                } : { fontFamily: 'Noto Sans JP, sans-serif' }}
              >
                <Home className="w-[18px] h-[18px]" />
                <span>マイページ</span>
              </button>
              <button
                onClick={() => navigate('/courses')}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  isCoursesPage
                    ? 'text-white'
                    : 'text-[#7E6E68] hover:bg-gray-50'
                }`}
                style={isCoursesPage ? {
                  background: 'linear-gradient(135deg, #E86D78, #FA9262)',
                  fontFamily: 'Noto Sans JP, sans-serif',
                } : { fontFamily: 'Noto Sans JP, sans-serif' }}
              >
                <BookOpen className="w-[18px] h-[18px]" />
                <span>学習する</span>
              </button>
            </nav>
          </div>

          {/* Right: AI Chat, Divider, Notifications, Avatar */}
          <div className="flex items-center gap-3">
            {/* AI Coach Button */}
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FAF8F4] hover:bg-[#F0EAE6] rounded-full text-xs text-[#7E6E68] border border-[#C2B9B3] transition-colors"
              style={{ fontFamily: 'Noto Sans JP, sans-serif', height: '34px' }}
            >
              <Bot className="w-[22px] h-[21px] text-[#7E6E68]" />
              <span className="hidden sm:inline">AIコーチに相談</span>
            </button>

            {/* Vertical Divider */}
            <div className="w-px h-6 bg-[#C2B9B3]" />

            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
              <Bell className="w-5 h-5 text-[#7E6E68]" />
              {/* Red notification badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#EF4444] rounded-full ring-2 ring-white" />
            </button>

            {/* Avatar with dropdown */}
            <div
              className="w-9 h-9 rounded-full overflow-hidden border border-[#CEC6C6] cursor-pointer"
              onClick={() => navigate('/profile')}
            >
              <img
                src={avatarSrc}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* AI Chat Drawer */}
      {chatOpen && (
        <>
          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white z-50 flex flex-col shadow-xl">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[#E86D78] to-[#FA9262] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-bold text-lg">AIコーチに相談</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 hover:bg-white/20 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' ? 'bg-blue-500' : 'bg-[#E86D78]'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="max-w-[75%] flex flex-col gap-1">
                    <div
                      className={`p-3 rounded-lg ${
                        message.role === 'user' ? 'bg-blue-100' : 'bg-white'
                      } shadow-sm`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {message.timestamp.toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* 参照元情報 */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="pl-1">
                        <p className="text-xs text-gray-500 font-bold mb-1">参照元</p>
                        <div className="space-y-1">
                          {message.sources.map((source, index) => (
                            <div
                              key={index}
                              className="p-2 bg-gray-100 border border-gray-200 rounded text-xs"
                            >
                              <p className="font-bold">
                                {source.module_name}
                                {source.filename && ` - ${source.filename}`}
                              </p>
                              <p className="text-gray-500">
                                {source.section_name} | 類似度: {(source.similarity * 100).toFixed(1)}%
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E86D78] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#E86D78] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-gray-500">考え中...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="質問を入力してください..."
                  disabled={loading}
                  rows={1}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#E86D78] focus:border-transparent disabled:bg-gray-100"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || loading}
                  className="p-2 bg-[#E86D78] text-white rounded-lg hover:bg-[#d45c6a] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AppHeader;
