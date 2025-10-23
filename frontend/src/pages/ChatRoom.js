import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowRight, MoreVertical, Video, Send, Smile, Mic } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChatRoom = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSafetyConsent, setShowSafetyConsent] = useState(false);
  const [hasAgreedToSafety, setHasAgreedToSafety] = useState(false);
  const [showReadReceipts, setShowReadReceipts] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    // Check if user has agreed to safety before
    const agreed = localStorage.getItem(`safety_consent_${user?.id}`);
    setHasAgreedToSafety(agreed === 'true');
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/conversations/${matchId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages || []);
      
      // Get other user info from first message
      if (response.data.messages && response.data.messages.length > 0) {
        const firstMsg = response.data.messages[0];
        const otherId = firstMsg.sender_id === user?.id ? firstMsg.receiver_id : firstMsg.sender_id;
        // Fetch other user profile
        // For now, just set basic info
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    // Check safety consent
    if (!hasAgreedToSafety) {
      setShowSafetyConsent(true);
      return;
    }

    try {
      await axios.post(
        `${API}/conversations/${matchId}/messages?content=${encodeURIComponent(newMessage)}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAgreeSafety = () => {
    localStorage.setItem(`safety_consent_${user?.id}`, 'true');
    setHasAgreedToSafety(true);
    setShowSafetyConsent(false);
    handleSendMessage();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowRight className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
              👤
            </div>
            <div>
              <h2 className="font-bold">المستخدم</h2>
              <span className="text-xs text-gray-500">نشط الآن</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Video className="w-5 h-5 text-blue-500" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Match Notification */}
        <div className="text-center py-4">
          <div className="text-4xl mb-2">💕</div>
          <p className="text-sm text-gray-600">تبادلت الإعجاب قبل 6 ساعات</p>
        </div>

        {/* Read Receipts Toggle */}
        {!showReadReceipts && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm mb-2">اعرف متى قرأ المستخدم رسالتك.</p>
            <Button
              onClick={() => setShowReadReceipts(true)}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              ✓ استقبل إيصالات القراءة
            </Button>
          </Card>
        )}

        {/* Messages List */}
        {messages.map((msg, index) => {
          const isSent = msg.sender_id === user?.id;
          
          return (
            <div
              key={msg.id || index}
              className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isSent
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                    : 'bg-white text-gray-800'
                }`}
              >
                <p>{msg.content}</p>
                {isSent && (
                  <div className="text-xs mt-1 opacity-75">
                    {msg.status === 'read' ? '✓✓ تم القراءة' : '✓ تم الإرسال'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="bg-white border-t p-4">
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Smile className="w-5 h-5 text-gray-600" />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="اكتب رسالة..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500"
          />

          <button
            onClick={handleSendMessage}
            className="p-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full hover:shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Safety Consent Modal */}
      {showSafetyConsent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6 bg-white">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">سلامة أعضائنا هي أولوية رئيسية</h2>
              <p className="text-gray-600 text-sm mb-4">
                نستخدم أنظمة آلية ويدوية لمراقبة الدردشات ومقاطع الفيديو للكشف عن النشاط غير القانوني.
              </p>
              <p className="text-sm text-gray-700 mb-6">
                للحفاظ على Pizoo آمناً، فإنك توافق على المواعدة بأمان واستخدامنا لأدوات معالجة الرسائل.
              </p>
            </div>

            <Button
              onClick={handleAgreeSafety}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white mb-3"
            >
              أوافق
            </Button>

            <Button
              onClick={() => setShowSafetyConsent(false)}
              variant="ghost"
              className="w-full"
            >
              لا ترسل الرسالة
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
