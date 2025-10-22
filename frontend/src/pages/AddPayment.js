import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CreditCard, AlertCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AddPayment = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    paymentType: 'card',
    cardNumber: '',
    cardHolderName: '',
    cardExpiry: '',
    cardCvv: '',
    paypalEmail: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentTypeChange = (value) => {
    setFormData(prev => ({ ...prev, paymentType: value }));
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.paymentType === 'card') {
      if (!formData.cardNumber || !formData.cardHolderName || !formData.cardExpiry || !formData.cardCvv) {
        setError('يرجى إدخال جميع معلومات البطاقة');
        return;
      }
    } else if (formData.paymentType === 'paypal') {
      if (!formData.paypalEmail) {
        setError('يرجى إدخال بريد PayPal الإلكتروني');
        return;
      }
    }

    setLoading(true);
    try {
      await axios.post(`${API}/payment/add`, {
        payment_type: formData.paymentType,
        card_number: formData.cardNumber.replace(/\s/g, ''),
        card_holder_name: formData.cardHolderName,
        card_expiry: formData.cardExpiry,
        card_cvv: formData.cardCvv,
        paypal_email: formData.paypalEmail
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.detail || 'حدث خطأ أثناء إضافة طريقة الدفع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-2xl" data-testid="add-payment-card">
        <CardHeader className="text-center border-b pb-6">
          <div className="mx-auto bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">أضف طريقة الدفع</CardTitle>
          <CardDescription className="text-lg mt-2">
            لمتابعة استخدام الخدمة بعد انتهاء الفترة التجريبية، يرجى إضافة طريقة دفع
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-900">
              💳 سيتم خصم 396 CHF تلقائياً عند انتهاء فترتك التجريبية
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" data-testid="error-alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={formData.paymentType} onValueChange={handlePaymentTypeChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="card">بطاقة بنكية</TabsTrigger>
                <TabsTrigger value="paypal">PayPal</TabsTrigger>
              </TabsList>
              
              <TabsContent value="card" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">رقم البطاقة</Label>
                  <Input
                    id="cardNumber"
                    name="cardNumber"
                    type="text"
                    maxLength="19"
                    value={formData.cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    data-testid="card-number-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardHolderName">اسم حامل البطاقة</Label>
                  <Input
                    id="cardHolderName"
                    name="cardHolderName"
                    type="text"
                    value={formData.cardHolderName}
                    onChange={handleChange}
                    placeholder="الاسم كما يظهر على البطاقة"
                    data-testid="card-holder-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardExpiry">تاريخ الانتهاء</Label>
                    <Input
                      id="cardExpiry"
                      name="cardExpiry"
                      type="text"
                      maxLength="5"
                      value={formData.cardExpiry}
                      onChange={handleChange}
                      placeholder="MM/YY"
                      data-testid="card-expiry-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardCvv">CVV</Label>
                    <Input
                      id="cardCvv"
                      name="cardCvv"
                      type="text"
                      maxLength="3"
                      value={formData.cardCvv}
                      onChange={handleChange}
                      placeholder="123"
                      data-testid="card-cvv-input"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="paypal" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="paypalEmail">بريد PayPal الإلكتروني</Label>
                  <Input
                    id="paypalEmail"
                    name="paypalEmail"
                    type="email"
                    value={formData.paypalEmail}
                    onChange={handleChange}
                    placeholder="paypal@email.com"
                    data-testid="paypal-email-input"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/dashboard')}
              >
                لاحقاً
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
                data-testid="submit-payment-button"
              >
                {loading ? 'جاري الحفظ...' : 'حفظ طريقة الدفع'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddPayment;
