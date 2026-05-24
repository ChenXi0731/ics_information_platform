import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const role = localStorage.getItem('icu_role');

    useEffect(() => {
        const token = localStorage.getItem('ics_token');
        if (!token) {
            navigate('/');
            return;
        }

        if (role !== 'Admin' && role !== 'Manager') {
            alert('🔒 存取錯誤：此功能僅限系統管理員或活動管理員使用！');
            navigate('/home');
        }
    }, [navigate, role]);

    const handleLogout = () => {
        localStorage.removeItem('ics_token');
        localStorage.removeItem('icu_role');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col items-center py-6 px-4 sm:px-6 lg:px-12 font-sans text-morandi-text">
            {/* Top Navigation Bar */}
            <header className="w-full max-w-5xl mb-12 flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm shrink-0">
                <div className="flex items-center space-x-3">
                    <span className="text-lg sm:text-xl font-bold text-morandi-primary tracking-wider">世新資傳系卡 - 後台管理</span>
                    {role && (
                        <span className="text-xs bg-morandi-primary/10 text-morandi-primary px-2.5 py-1 rounded-full font-semibold">
                            {role === 'Admin' ? '系統管理員' : role === 'Manager' ? '活動管理員' : '一般會員'}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/home')}
                        className="px-4 py-2 border-2 border-morandi-primary/20 text-morandi-primary rounded-xl text-sm font-semibold hover:bg-morandi-primary/5 active:scale-95 transition-all flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        返回首頁
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 border-2 border-morandi-secondary/20 text-morandi-text rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-95 transition-all"
                    >
                        登出
                    </button>
                </div>
            </header>

            {/* Welcome banner */}
            <div className="mb-10 text-center max-w-2xl">
                <h1 className="text-3xl lg:text-4xl font-extrabold text-morandi-primary tracking-wide">⚙️ 後台管理中心</h1>
                <p className="text-morandi-secondary mt-3 text-base">
                    歡迎使用平台管理後台！請選擇您想要進行維護與發布的功能板塊。所有的資料修改將即時同步至全體使用者的首頁。
                </p>
            </div>

            {/* Functions Grid */}
            <div className={`grid grid-cols-1 ${role === 'Admin' ? 'md:grid-cols-3 max-w-6xl' : 'md:grid-cols-2 max-w-4xl'} gap-8 w-full flex-1 items-center pb-12`}>
                {/* News Portal Card */}
                <div 
                    onClick={() => navigate('/admin/news')}
                    className="glass hover:shadow-xl transition-all duration-300 rounded-3xl p-8 sm:p-10 border border-white/40 cursor-pointer group hover:-translate-y-1.5 flex flex-col items-center text-center h-[22rem] justify-between"
                >
                    <span className="text-6xl bg-white p-5 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">📢</span>
                    <div>
                        <h2 className="text-2xl font-bold text-morandi-primary tracking-wide mt-4 mb-2 group-hover:text-morandi-accent transition-colors">
                            最新消息管理
                        </h2>
                        <p className="text-sm text-morandi-secondary leading-relaxed max-w-xs">
                            管理首頁的動態公告。發布、編輯與下架最新的系上宿營、選課通知及學術演講資訊。
                        </p>
                    </div>
                    <button className="mt-4 px-6 py-2.5 bg-morandi-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95 active:scale-95 transition-all flex items-center gap-1.5">
                        進入最新消息管理
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                </div>

                {/* Cooperative Stores Portal Card */}
                <div 
                    onClick={() => navigate('/admin/stores')}
                    className="glass hover:shadow-xl transition-all duration-300 rounded-3xl p-8 sm:p-10 border border-white/40 cursor-pointer group hover:-translate-y-1.5 flex flex-col items-center text-center h-[22rem] justify-between"
                >
                    <span className="text-6xl bg-white p-5 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">🤝</span>
                    <div>
                        <h2 className="text-2xl font-bold text-morandi-primary tracking-wide mt-4 mb-2 group-hover:text-morandi-accent transition-colors">
                            特約商店管理
                        </h2>
                        <p className="text-sm text-morandi-secondary leading-relaxed max-w-xs">
                            維護系上的特約合作商家。隨時更新周邊咖啡館、餐廳或文具店的優惠折扣及代表圖示。
                        </p>
                    </div>
                    <button className="mt-4 px-6 py-2.5 bg-morandi-accent text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95 active:scale-95 transition-all flex items-center gap-1.5">
                        進入特約商店管理
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                </div>

                {/* Users Permission Card (Admin-only) */}
                {role === 'Admin' && (
                    <div 
                        onClick={() => navigate('/admin/users')}
                        className="glass hover:shadow-xl transition-all duration-300 rounded-3xl p-8 sm:p-10 border border-white/40 cursor-pointer group hover:-translate-y-1.5 flex flex-col items-center text-center h-[22rem] justify-between"
                    >
                        <span className="text-6xl bg-white p-5 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">👥</span>
                        <div>
                            <h2 className="text-2xl font-bold text-morandi-primary tracking-wide mt-4 mb-2 group-hover:text-morandi-accent transition-colors">
                                使用者權限管理
                            </h2>
                            <p className="text-sm text-morandi-secondary leading-relaxed max-w-xs">
                                管理平台註冊用戶的系統權限。安全升級或降級系統管理員、活動管理員及一般學生權限組。
                            </p>
                        </div>
                        <button className="mt-4 px-6 py-2.5 bg-morandi-accent text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95 active:scale-95 transition-all flex items-center gap-1.5 bg-gradient-to-r from-morandi-primary to-morandi-accent">
                            進入權限管理
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
