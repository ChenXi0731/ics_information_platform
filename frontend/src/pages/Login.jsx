import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Login() {
    const navigate = useNavigate();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            if (isLoginMode) {
                const response = await api.post('/auth/login', { email, password });
                const { access_token, system_role } = response.data;
                localStorage.setItem('ics_token', access_token);
                localStorage.setItem('icu_role', system_role);

                navigate('/home');
            } else {
                await api.post('/auth/register', { email, password });
                setIsLoginMode(true);
                setPassword('');
                alert('註冊成功！請使用新帳號登入。');
            }
        } catch (error) {
            const message = error.response?.data?.detail || '發生未知的錯誤，請稍後再試';
            setErrorMsg(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col md:flex-row">
            {/* Desktop Left Side: Branding / Hero */}
            <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-morandi-primary text-morandi-surface p-12">
                <div className="max-w-lg text-center space-y-6">
                    <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-morandi-surface">世新資傳</h1>
                    <p className="text-lg lg:text-xl text-morandi-bg opacity-90">數位典藏與系卡整合平台</p>
                    <div className="w-24 h-1 bg-morandi-accent mx-auto rounded-full mt-8"></div>
                </div>
            </div>

            {/* Right Side / Mobile Full: Login Form */}
            <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-24">
                <div className="md:hidden text-center mb-10">
                    <h2 className="text-4xl font-bold text-morandi-primary">世新資傳</h2>
                    <p className="mt-2 text-morandi-text">數位典藏與系卡整合平台</p>
                </div>

                <div className="w-full max-w-md mx-auto">
                    <div className="glass rounded-3xl p-8 sm:p-10">
                        <h3 className="text-2xl font-semibold text-morandi-primary mb-8 text-center">
                            {isLoginMode ? '歡迎回來' : '建立新帳號'}
                        </h3>

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {errorMsg && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm text-center">
                                    {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-morandi-text mb-2">Email 信箱</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-morandi-accent focus:border-transparent transition-all"
                                    placeholder="your@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-morandi-text mb-2">密碼</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-morandi-accent focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md text-base font-semibold text-white transition-all transform active:scale-95 ${
                                    isLoading ? 'bg-morandi-secondary cursor-not-allowed' : 'bg-morandi-primary hover:bg-opacity-90 hover:shadow-lg'
                                }`}
                            >
                                {isLoading ? '處理中...' : isLoginMode ? '登入' : '註冊'}
                            </button>
                        </form>

                        <div className="mt-8">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-morandi-secondary/20" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-transparent text-morandi-secondary">
                                        {isLoginMode ? '第一次使用？' : '已經有帳號了？'}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLoginMode(!isLoginMode);
                                        setErrorMsg('');
                                    }}
                                    className="w-full flex justify-center py-3 px-4 border-2 border-morandi-primary/20 rounded-xl shadow-sm text-sm font-semibold text-morandi-primary hover:bg-morandi-primary/5 transition-colors"
                                >
                                    {isLoginMode ? '建立新帳號' : '返回登入'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}