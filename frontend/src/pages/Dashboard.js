import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Calendar, CreditCard, User, LogOut, Clock, CheckCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, logout, token } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await axios.get(`${API}/subscription/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSubscription(response.data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      trial: { label: 'فترة تجريبية', variant: 'default' },
      active: { label: 'نشط', variant: 'success' },
      cancelled: { label: 'ملغى', variant: 'destructive' },
      expired: { label: 'منتهي', variant: 'secondary' }
    };
    const statusInfo = statusMap[status] || statusMap.trial;
    return <Badge variant={statusInfo.variant} data-testid="subscription-status-badge">{statusInfo.label}</Badge>;
  };

  const trialProgress = subscription ? ((14 - subscription.days_remaining) / 14) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
              <p className="text-sm text-gray-600">مرحباً بك {user?.name}</p>
            </div>
            <Button
              variant="outline"
              onClick={logout}
              className="gap-2"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* User Info Card */}
          <Card data-testid="user-info-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                معلومات الحساب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">الاسم</p>
                <p className="font-medium" data-testid="user-name">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">البريد الإلكتروني</p>
                <p className="font-medium" data-testid="user-email">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">حالة الاشتراك</p>
                <div className="mt-1">{getStatusBadge(user?.subscription_status)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Trial Info Card */}
          {subscription && subscription.status === 'trial' && (
            <Card className="bg-blue-50 border-blue-200" data-testid="trial-info-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Clock className="w-5 h-5" />
                  الفترة التجريبية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">
                      الأيام المتبقية
                    </span>
                    <span className="text-2xl font-bold text-blue-600" data-testid="days-remaining">
                      {subscription.days_remaining}
                    </span>
                  </div>
                  <Progress value={trialProgress} className="h-2" />
                  <p className="text-xs text-gray-600 mt-2">
                    {14 - subscription.days_remaining} من 14 يوم مستخدمة
                  </p>
                </div>
                <div className="pt-2 border-t border-blue-200">
                  <p className="text-sm text-gray-700">
                    تنتهي في: {new Date(subscription.trial_end_date).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Info Card */}
          {subscription && (
            <Card data-testid="payment-info-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  معلومات الدفع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">قيمة الاشتراك السنوي</p>
                  <p className="text-2xl font-bold" data-testid="annual-amount">
                    {subscription.annual_amount} {subscription.currency}
                  </p>
                  <p className="text-xs text-gray-500">(يعادل 33 CHF شهرياً)</p>
                </div>
                {subscription.status === 'trial' && subscription.next_payment_date && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600">تاريخ الدفع القادم</p>
                    <p className="font-medium text-orange-600" data-testid="next-payment-date">
                      {new Date(subscription.next_payment_date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Important Notice */}
        {subscription && subscription.status === 'trial' && (
          <Card className="border-yellow-200 bg-yellow-50" data-testid="important-notice">
            <CardHeader>
              <CardTitle className="text-yellow-900">ملاحظة مهمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-gray-700">
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  بعد انتهاء فترتك التجريبية في <strong>{new Date(subscription.trial_end_date).toLocaleDateString('ar-SA')}</strong>، سيتم خصم مبلغ <strong>396 CHF</strong> تلقائياً من حساب PayPal الخاص بك.
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  يمكنك إلغاء الاشتراك في أي وقت قبل انتهاء الفترة التجريبية لتجنب الخصم.
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  لمعرفة المزيد عن شروط الاسترجاع والإلغاء، يرجى الاطلاع على{' '}
                  <Link to="/terms" className="text-blue-600 hover:underline" target="_blank">
                    الشروط والأحكام
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
