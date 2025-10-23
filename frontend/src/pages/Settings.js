import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowRight, ChevronLeft, Shield, HelpCircle, Users, Lock, FileText, LogOut } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await axios.put(
        `${API}/settings`,
        { [key]: value },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSettings({ ...settings, [key]: value });
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="ml-3">
          <ArrowRight className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">الإعدادات</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Visibility & Control */}
        <Card className="p-4">
          <h2 className="font-bold text-lg mb-4">التحكم في الظهور</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">وضع الظهور</label>
              <select
                value={settings?.visibility_mode || 'standard'}
                onChange={(e) => updateSetting('visibility_mode', e.target.value)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="standard">قياسي</option>
                <option value="incognito">Incognito Mode</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">تمكين خاصية الاختفاء</div>
                <div className="text-sm text-gray-600">إخفاء ملفك عن الآخرين</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.incognito_enabled || false}
                  onChange={(e) => updateSetting('incognito_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Messaging Controls */}
        <Card className="p-4">
          <h2 className="font-bold text-lg mb-4">التحكم في من يراسلك</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">دردشة مع الأعضاء المحققين فقط</div>
                <div className="text-sm text-gray-600">رسائل من الأعضاء المحققين فقط</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.verified_only_chat || false}
                  onChange={(e) => updateSetting('verified_only_chat', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">إيصالات القراءة</div>
                <div className="text-sm text-gray-600">إرسال إيصالات قراءة الرسائل</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.send_read_receipts !== false}
                  onChange={(e) => updateSetting('send_read_receipts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Data & Performance */}
        <Card className="p-4">
          <h2 className="font-bold text-lg mb-4">استهلاك البيانات</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">تشغيل الفيديوهات تلقائياً</div>
                <div className="text-sm text-gray-600">تشغيل الفيديو عند التمرير</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.auto_play_videos !== false}
                  onChange={(e) => updateSetting('auto_play_videos', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">حالة النشاط</div>
                <div className="text-sm text-gray-600">إظهار حالة النشاط للآخرين</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.show_activity_status !== false}
                  onChange={(e) => updateSetting('show_activity_status', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Theme */}
        <Card className="p-4">
          <h2 className="font-bold text-lg mb-4">الوضع الذكي</h2>
          
          <select
            value={settings?.theme || 'system'}
            onChange={(e) => updateSetting('theme', e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="system">استخدام إعدادات النظام</option>
            <option value="light">الوضع المضيء</option>
            <option value="dark">الوضع الداكن</option>
          </select>
        </Card>

        {/* Support & Community */}
        <Card className="p-4">
          <h2 className="font-bold text-lg mb-4">الدعم والمجتمع</h2>
          
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                <span>المساعدة والدعم</span>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>

            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-500" />
                <span>إرشادات التواصل الاجتماعي</span>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>

            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-500" />
                <span>مركز السلامة</span>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </Card>

        {/* Privacy & Legal */}
        <Card className="p-4">
          <h2 className="font-bold text-lg mb-4">الخصوصية والقانونية</h2>
          
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/terms')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <span>شروط الخدمة</span>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>

            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-gray-500" />
                <span>سياسة الخصوصية</span>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </Card>

        {/* Logout */}
        <Card className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 text-red-600 hover:bg-red-50 rounded-lg font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </Card>

        {/* Delete Account */}
        <button className="w-full text-center text-red-600 text-sm py-2">
          حذف الحساب
        </button>
      </main>
    </div>
  );
};

export default Settings;
