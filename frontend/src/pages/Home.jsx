import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Home() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [hasCard, setHasCard] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newsList, setNewsList] = useState([]);
    const [storeList, setStoreList] = useState([]);
    
    const role = localStorage.getItem('icu_role');
    console.log("[DEBUG] Home page rendered. LocalStorage icu_role:", role);

    useEffect(() => {
        const token = localStorage.getItem('ics_token');
        if (!token) {
            navigate('/');
            return;
        }

        const fetchProfile = async () => {
            try {
                const response = await api.get('/card/me');
                console.log("[DEBUG] Fetch profile success:", response.data);
                setProfile(response.data);
                setHasCard(true);
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log("[DEBUG] Fetch profile 404 - No card setup yet.");
                    setHasCard(false);
                } else {
                    console.error("讀取個人資料失敗", error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        const fetchContent = async () => {
            try {
                const res = await api.get('/content');
                console.log("[DEBUG] Fetch dynamic content success:", res.data);
                setNewsList(res.data.news || []);
                setStoreList(res.data.stores || []);
            } catch (error) {
                console.error("讀取最新消息與特約商店失敗", error);
            }
        };

        fetchProfile();
        fetchContent();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('ics_token');
        localStorage.removeItem('icu_role');
        navigate('/');
    };

    const handleProfileClick = () => {
        if (hasCard) {
            navigate('/card');
        } else {
            navigate('/setup');
        }
    };

    const handleScannerClick = () => {
        if (role === 'Admin' || role === 'Manager') {
            navigate('/scanner');
        } else {
            alert('🔒 此功能僅限系統管理員或活動管理員使用！');
        }
    };

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col font-sans text-morandi-text">
            {/* Top Navigation Bar */}
            <header className="w-full max-w-7xl mx-auto mt-6 mb-8 px-4 sm:px-6">
                <div className="flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <span className="text-xl font-bold text-morandi-primary tracking-wider">世新資傳數位平台</span>
                        {role && (
                            <span className="text-xs bg-morandi-primary/10 text-morandi-primary px-2.5 py-1 rounded-full font-semibold">
                                {role === 'Admin' ? '系統管理員' : role === 'Manager' ? '活動管理員' : '一般會員'}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        {/* Admin Backend Entry */}
                        {(role === 'Admin' || role === 'Manager') && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="w-10 h-10 rounded-full bg-morandi-primary/10 text-morandi-primary hover:bg-morandi-primary/20 active:scale-95 transition-all flex items-center justify-center border border-morandi-primary/20 relative group"
                                title="進入後台管理"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.99l1.005.831a1.125 1.125 0 01.26 1.43l-1.297 2.247a1.125 1.125 0 01-1.37.491l-1.216-.456c-.356-.133-.751-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.83c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.831a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                <span className="absolute bottom-[-2.5rem] right-0 bg-morandi-primary text-white text-xs px-2.5 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                    進入後台管理
                                </span>
                            </button>
                        )}

                        {/* User Icon Button */}
                        <button
                            onClick={handleProfileClick}
                            className="w-10 h-10 rounded-full bg-morandi-primary text-white hover:bg-opacity-90 active:scale-95 transition-all flex items-center justify-center shadow-md relative group border border-white/20"
                            title={hasCard ? "查看我的系卡" : "設定我的系卡"}
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            {/* Hover tooltip */}
                            <span className="absolute bottom-[-2.5rem] right-0 bg-morandi-primary text-white text-xs px-2.5 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                {hasCard ? "查看我的系卡" : "設定我的系卡"}
                            </span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 border-2 border-morandi-secondary/20 text-morandi-text rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-95 transition-all"
                        >
                            登出
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Body */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-12">
                {/* Welcome Card & Prompts */}
                {isLoading ? (
                    <div className="glass rounded-3xl p-8 mb-8 text-center text-morandi-primary">載入中...</div>
                ) : (
                    <div className="glass rounded-3xl p-8 sm:p-10 mb-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-morandi-primary">
                                {hasCard ? `歡迎回來，${profile.name}！` : '歡迎來到世新資傳數位平台'}
                            </h1>
                            <p className="text-morandi-secondary mt-2 text-base max-w-xl">
                                {hasCard 
                                    ? `身分組別：${profile.identity_type} | 學號/工號：${profile.student_or_staff_id}。您已成功開通數位系卡，出示系卡即可享有特約商店優惠。`
                                    : '您目前尚未領取專屬數位系卡。領取系卡後可以進行活動簽到、取得專屬徽章及享有特約商店優惠！'}
                            </p>
                        </div>
                        <div className="shrink-0 flex flex-wrap gap-4 w-full md:w-auto">
                            {!hasCard ? (
                                <button
                                    onClick={() => navigate('/setup')}
                                    className="px-6 py-3.5 bg-morandi-accent text-white rounded-xl font-bold shadow-md hover:bg-opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 flex-1 md:flex-initial animate-pulse"
                                >
                                    ✨ 立即領取數位系卡
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/card')}
                                    className="px-6 py-3.5 bg-morandi-primary text-white rounded-xl font-bold shadow-md hover:bg-opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 flex-1 md:flex-initial"
                                >
                                    🪪 查看數位系卡
                                </button>
                            )}

                            {(role === 'Admin' || role === 'Manager') && (
                                <>
                                    <button
                                        onClick={() => navigate('/admin')}
                                        className="px-6 py-3.5 bg-white border-2 border-morandi-accent text-morandi-accent rounded-xl font-bold shadow-sm hover:bg-morandi-bg active:scale-95 transition-all flex items-center justify-center gap-2 flex-1 md:flex-initial"
                                    >
                                        ⚙️ 後台管理
                                    </button>
                                    <button
                                        onClick={handleScannerClick}
                                        className="px-6 py-3.5 bg-white border-2 border-morandi-primary text-morandi-primary rounded-xl font-bold shadow-sm hover:bg-morandi-bg active:scale-95 transition-all flex items-center justify-center gap-2 flex-1 md:flex-initial"
                                    >
                                        🔍 簽到掃描器
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Info Sections: News & Cooperative Stores */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: News (Takes 2 cols on large screen) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-bold text-morandi-primary">📢 最新消息</h2>
                        </div>
                        
                        <div className="space-y-4">
                            {newsList.map((news) => (
                                <div key={news.id} className="glass hover:shadow-md transition-all duration-300 rounded-2xl p-6 border border-white/30">
                                    <div className="flex justify-between items-start gap-4 mb-2">
                                        <span className="text-xs font-semibold bg-morandi-secondary/20 text-morandi-primary px-2.5 py-1 rounded-full">
                                            {news.category}
                                        </span>
                                        <span className="text-xs text-morandi-secondary">{news.date}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-morandi-primary mb-2 hover:text-morandi-accent cursor-pointer transition-colors">
                                        {news.title}
                                    </h3>
                                    <p className="text-sm text-morandi-secondary leading-relaxed">
                                        {news.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Stores (Takes 1 col on large screen) */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-bold text-morandi-primary">🤝 特約合作商店</h2>
                        </div>

                        <div className="glass rounded-3xl p-6 space-y-5">
                            {storeList.map((store, idx) => (
                                <div key={idx} className="bg-white/40 p-4 rounded-xl flex items-center space-x-4 border border-morandi-secondary/10 hover:bg-white/60 transition-colors">
                                    <span className="text-3xl bg-white p-2.5 rounded-xl shadow-sm">{store.icon}</span>
                                    <div>
                                        <h4 className="text-sm font-bold text-morandi-primary">{store.name}</h4>
                                        <p className="text-xs text-morandi-secondary mt-1 font-semibold">{store.discount}</p>
                                    </div>
                                </div>
                            ))}
                            <div className="text-center pt-3 border-t border-morandi-secondary/10">
                                <p className="text-xs text-morandi-secondary">特約商店持續洽談中，敬請期待！</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
