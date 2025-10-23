import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import BottomNav from '../components/BottomNav';
import { Shield, Flag, Settings as SettingsIcon } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChatList = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSafetyTools, setShowSafetyTools] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} دقيقة`;
    if (diffHours < 24) return `${diffHours} ساعة`;
    if (diffDays < 7) return `${diffDays} يوم`;
    return date.toLocaleDateString('ar');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">الرسائل 💬</h1>
          <button
            onClick={() => setShowSafetyTools(true)}
            className="text-gray-600 hover:text-gray-800"
          >
            <Shield className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {conversations.length > 0 ? (
          <div className="divide-y">
            {conversations.map((conv) => (
              <div
                key={conv.match_id}
                className="bg-white p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/chat/${conv.match_id}`)}
              >
                <div className="flex items-center gap-4">
                  {/* Profile Picture */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-pink-300 to-purple-300">
                      {conv.user.photo ? (
                        <img
                          src={conv.user.photo}
                          alt={conv.user.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          👤
                        </div>
                      )}
                    </div>
                    {conv.user.is_online && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  {/* Message Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-lg truncate">
                        {conv.user.display_name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatTime(conv.last_message.created_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">
                        {conv.last_message.content || 'ابدأ المحادثة...'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-4">
            <div className="text-8xl mb-4">💬</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              لا توجد محادثات بعد
            </h2>
            <p className="text-gray-600 mb-6">
              ابدأ بالإعجاب بالملفات الشخصية للحصول على تطابقات!
            </p>
            <Button
              onClick={() => navigate('/home')}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
            >
              ابدأ التصفح
            </Button>
          </div>
        )}
      </main>

      {/* Safety Tools Modal */}
      {showSafetyTools && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowSafetyTools(false)}>
          <Card className="w-full bg-white rounded-t-3xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">أدوات السلامة</h2>
            
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors text-right">
                <Flag className="w-6 h-6 text-red-500" />
                <div>
                  <div className="font-medium">إبلاغ</div>
                  <div className="text-sm text-gray-600">
                    أبلغ عن شخص أو محتوى غير لائق
                  </div>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors text-right">
                <SettingsIcon className="w-6 h-6 text-blue-500" />
                <div>
                  <div className="font-medium">تحديث إعدادات الرسائل</div>
                  <div className="text-sm text-gray-600">
                    حدد من يمكنه إرسال رسائل إليك
                  </div>
                </div>
              </button>

              <button 
                onClick={() => navigate('/safety-center')}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors text-right"
              >
                <Shield className="w-6 h-6 text-green-500" />
                <div>
                  <div className="font-medium">الاتصال بمركز السلامة</div>
                  <div className="text-sm text-gray-600">
                    موارد السلامة والأدوات
                  </div>
                </div>
              </button>
            </div>

            <Button
              onClick={() => setShowSafetyTools(false)}
              variant="ghost"
              className="w-full mt-4"
            >
              إغلاق
            </Button>
          </Card>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ChatList;
