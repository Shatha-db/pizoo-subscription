import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle2, Calendar, CreditCard, ArrowRight } from 'lucide-react';

const Welcome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const trialEndDate = new Date(user.trial_end_date);
  const formattedDate = trialEndDate.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-2xl" data-testid="welcome-card">
        <CardHeader className="text-center">
          <div className="mx-auto bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-3xl">مرحباً بك {user.name}! 🎉</CardTitle>
          <CardDescription className="text-lg mt-2">
            تم إنشاء حسابك بنجاح
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6" data-testid="trial-info">
            <h3 className="text-xl font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              فترتك التجريبية المجانية
            </h3>
            <div className="space-y-3">
              <p className="text-gray-700">
                • تبدأ فترتك التجريبية الآن وتستمر لمدة <strong>14 يوماً</strong>
              </p>
              <p className="text-gray-700">
                • تنتهي في: <strong className="text-blue-600">{formattedDate}</strong>
              </p>
              <p className="text-gray-700">
                • استمتع بجميع المميزات مجاناً خلال هذه الفترة
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6" data-testid="payment-info">
            <h3 className="text-xl font-semibold text-yellow-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              معلومات الدفع
            </h3>
            <div className="space-y-3">
              <p className="text-gray-700">
                • بعد انتهاء الفترة التجريبية، سيتم خصم <strong className="text-yellow-700">396 CHF</strong> تلقائياً
              </p>
              <p className="text-gray-700">
                • يمكنك إلغاء الاشتراك في أي وقت قبل انتهاء الفترة التجريبية
              </p>
              <p className="text-gray-700">
                • لن يتم خصم أي مبلغ خلال فترة التجربة
              </p>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3">ماذا بعد؟</h3>
            <p className="text-gray-700">
              اذهب إلى لوحة التحكم لمتابعة اشتراكك والأيام المتبقية من فترتك التجريبية
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/profile/setup')}
            className="gap-2"
            data-testid="go-to-profile-setup-button"
          >
            أكمل ملفك الشخصي الآن
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Welcome;
