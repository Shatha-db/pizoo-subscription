import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import BottomNav from '../components/BottomNav';
import { Lock, Star, Zap } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LikesYou = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [receivedLikes, setReceivedLikes] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [likesRes, subRes] = await Promise.all([
        axios.get(`${API}/likes/received`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/premium/subscription`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setReceivedLikes(likesRes.data.profiles || []);
      setSubscription(subRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasGoldAccess = subscription?.features?.see_who_liked || false;
  const likesCount = receivedLikes.length;

  const handleProfileClick = (profile) => {
    if (!hasGoldAccess) {
      setShowPremiumModal(true);
    } else {
      // Navigate to profile detail
      navigate(`/profile/${profile.user_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">من أعجب بك 💕</h1>
          {!hasGoldAccess && (
            <div className="flex items-center gap-2 bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
              <Zap className="w-4 h-4" />
              Gold
            </div>
          )}
        </div>
        <p className="text-white/90 mt-2">
          {likesCount > 0 ? `${likesCount} شخص أعجب بك` : 'لا توجد إعجابات بعد'}
        </p>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* Upgrade Banner */}
        {!hasGoldAccess && likesCount > 0 && (
          <Card className="mb-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400">
            <div className="text-center">
              <div className="text-5xl mb-3">✨</div>
              <h2 className="text-2xl font-bold mb-2">شاهد من أعجب بك فوراً</h2>
              <p className="text-gray-700 mb-4">
                احصل على Pizoo Gold لترى الأشخاص الذين أبدوا إعجابهم بك بالفعل
              </p>
              <Button
                onClick={() => navigate('/premium')}
                className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold"
              >
                <Zap className="w-5 h-5 ml-2" />
                الترقية إلى Gold
              </Button>
            </div>
          </Card>
        )}

        {/* Profiles Grid */}
        {likesCount > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {receivedLikes.map((profile, index) => (
              <div
                key={index}
                className="relative cursor-pointer group"
                onClick={() => handleProfileClick(profile)}
              >
                <div className={`relative aspect-[3/4] rounded-xl overflow-hidden ${!hasGoldAccess ? 'blur-lg' : ''}`}>
                  {profile.photos && profile.photos.length > 0 ? (
                    <img
                      src={profile.photos[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center text-6xl">
                      ❤️
                    </div>
                  )}
                  
                  {/* Overlay for non-premium users */}
                  {!hasGoldAccess && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-center justify-center">
                      <div className="text-center text-white">
                        <Lock className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm font-bold">Pizoo Gold</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Name (visible only for premium) */}
                {hasGoldAccess && (
                  <div className="mt-2">
                    <p className="font-bold text-lg">{profile.display_name}</p>
                    {profile.location && (
                      <p className="text-sm text-gray-600">📍 {profile.location}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-8xl mb-4">💔</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">لا توجد إعجابات بعد</h2>
            <p className="text-gray-600 mb-6">استمر في التصفح لتحصل على مزيد من الإعجابات!</p>
            <Button
              onClick={() => navigate('/home')}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
            >
              ابدأ التصفح
            </Button>
          </div>
        )}
      </main>

      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPremiumModal(false)}>
          <Card className="max-w-md w-full p-6 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold mb-3">شاهد من أعجب بك</h2>
              <p className="text-gray-700 mb-6">
                قم بالترقية إلى Pizoo Gold لرؤية جميع الأشخاص الذين أعجبوا بملفك الشخصي
              </p>
              
              <div className="space-y-3 mb-6 text-right">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>إعجابات غير محدودة</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>شاهد من أبدى إعجابه بك</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>تراجعات غير محدودة</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>1 Boost مجاني شهرياً</span>
                </div>
              </div>

              <Button
                onClick={() => navigate('/premium')}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold text-lg py-6"
              >
                <Zap className="w-5 h-5 ml-2" />
                انظر من أبدى إعجابه بك
              </Button>
              
              <Button
                onClick={() => setShowPremiumModal(false)}
                variant="ghost"
                className="w-full mt-3"
              >
                ربما لاحقاً
              </Button>
            </div>
          </Card>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default LikesYou;
