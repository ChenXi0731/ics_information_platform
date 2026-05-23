import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';

export default function CardDashboard() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);

    const role = localStorage.getItem('icu_role');

    useEffect(() => {
        const token = localStorage.getItem('ics_token');
        if (!token) {
            navigate('/');
            return;
        }

        const fetchProfile = async () => {
            try {
                const response = await api.get('/card/me');
                setProfile(response.data);
            } catch (error) {
                if (error.response?.status === 404) {
                    navigate('/setup');
                } else {
                    console.error("讀取失敗", error);
                }
            }
        };
        fetchProfile();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('ics_token');
        localStorage.removeItem('icu_role');
        navigate('/');
    };

    if (!profile) return <div className="flex justify-center items-center h-screen bg-morandi-bg text-morandi-primary">載入中...</div>;

    const getThemeColor = () => {
        switch (profile.identity_type) {
            case 'Alumni': return 'bg-gradient-to-br from-morandi-secondary to-[#8b8077]';
            case 'Faculty': return 'bg-gradient-to-br from-morandi-accent to-[#72826e]';
            default: return 'bg-gradient-to-br from-morandi-primary to-[#5a6a7a]';
        }
    };

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col items-center py-6 px-4 sm:px-6 lg:px-12 font-sans">
            {/* Top Navigation Bar */}
            <header className="w-full max-w-5xl mb-10 flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm">
                <div className="flex items-center space-x-3">
                    <span className="text-lg sm:text-xl font-bold text-morandi-primary tracking-wider">世新資傳系卡</span>
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
                    {(role === 'Admin' || role === 'Manager') && (
                        <button
                            onClick={() => navigate('/scanner')}
                            className="px-4 py-2 bg-morandi-primary text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                            進入簽到掃描
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 border-2 border-morandi-secondary/20 text-morandi-text rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-95 transition-all"
                    >
                        登出
                    </button>
                </div>
            </header>

            <div className="mb-10 text-center">
                <h1 className="text-3xl lg:text-4xl font-bold text-morandi-primary">我的數位系卡</h1>
                <p className="text-morandi-secondary mt-2">點擊卡片可切換正反面</p>
            </div>

            <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 w-full max-w-5xl">
                {/* 可翻轉的系卡 */}
                <div className="relative w-full max-w-[22rem] lg:max-w-md aspect-[1.586/1] perspective" onClick={() => setIsFlipped(!isFlipped)}>
                    <motion.div
                        className="w-full h-full relative preserve-3d cursor-pointer"
                        initial={false}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                    >
                        {/* --- 卡片正面 --- */}
                        {profile.identity_type === 'Faculty' ? (
                            /* --- 教職員版本 Front --- */
                            <div className={`absolute inset-0 backface-hidden rounded-3xl shadow-2xl p-8 text-white flex flex-col justify-between overflow-hidden ${getThemeColor()}`}>
                                {/* Watermark School Logo Decor */}
                                <div className="absolute -right-6 -bottom-6 w-48 h-48 rounded-full bg-white/5 border border-white/10 pointer-events-none flex items-center justify-center">
                                    <span className="text-[6rem] opacity-10">🏫</span>
                                </div>

                                <div className="flex justify-between items-start z-10">
                                    <div>
                                        <h2 className="text-xl lg:text-2xl font-bold tracking-widest text-white">Shih Hsin University</h2>
                                        <p className="text-xs opacity-80 uppercase tracking-wider">Faculty & Staff | Info & Comm</p>
                                    </div>
                                    <div className="bg-white/20 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider backdrop-blur-md border border-white/10 shadow-sm">
                                        教職員 FACULTY
                                    </div>
                                </div>

                                <div className="mt-4 z-10">
                                    <p className="text-[10px] opacity-60 tracking-widest uppercase">Name / 姓名</p>
                                    <h3 className="text-3xl font-extrabold tracking-wide">{profile.name}</h3>
                                </div>

                                <div className="flex justify-between items-end z-10">
                                    <div>
                                        <p className="text-[10px] opacity-60 tracking-widest uppercase">Staff ID / 教職工號</p>
                                        <p className="font-mono text-lg tracking-wider font-semibold">{profile.student_or_staff_id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] opacity-60 tracking-widest uppercase">Service Since / 到職年份</p>
                                        <p className="font-bold text-lg">民國 {profile.entry_year} 年</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* --- 學生/系友版本 Front --- */
                            <div className={`absolute inset-0 backface-hidden rounded-3xl shadow-2xl p-8 text-white flex flex-col justify-between overflow-hidden ${getThemeColor()}`}>
                                {/* Watermark Graduation Cap Decor */}
                                <div className="absolute -right-6 -bottom-6 w-48 h-48 rounded-full bg-white/5 border border-white/10 pointer-events-none flex items-center justify-center">
                                    <span className="text-[6rem] opacity-10">🎓</span>
                                </div>

                                <div className="flex justify-between items-start z-10">
                                    <div>
                                        <h2 className="text-xl lg:text-2xl font-bold tracking-widest text-white">Shih Hsin University</h2>
                                        <p className="text-xs opacity-80 uppercase tracking-wide">Information & Communications</p>
                                    </div>
                                    <div className="bg-white/20 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider backdrop-blur-md border border-white/10 shadow-sm">
                                        {profile.identity_type === 'Alumni' ? '系友 ALUMNI' : '學生 STUDENT'}
                                    </div>
                                </div>

                                <div className="mt-4 z-10">
                                    <p className="text-[10px] opacity-60 tracking-widest uppercase">Name / 姓名</p>
                                    <h3 className="text-3xl font-extrabold tracking-wide text-white">{profile.name}</h3>
                                </div>

                                <div className="flex justify-between items-end z-10">
                                    <div>
                                        <p className="text-[10px] opacity-60 tracking-widest uppercase">Student ID / 學號</p>
                                        <p className="font-mono text-lg tracking-wider font-semibold">{profile.student_or_staff_id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] opacity-60 tracking-widest uppercase">Entry Year / 入學年份</p>
                                        <p className="font-bold text-lg">民國 {profile.entry_year} 年</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- 卡片背面 (QR Code 簽到) --- */}
                        <div className="absolute inset-0 backface-hidden rounded-3xl shadow-xl p-6 bg-morandi-surface border-[3px] border-morandi-bg flex flex-col items-center justify-center rotate-y-180">
                            <p className="text-morandi-secondary text-xs mb-4 font-bold tracking-widest uppercase">Activity Check-in / Cooperative Stores</p>
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-morandi-bg">
                                <QRCodeSVG value={profile.user_id} size={160} level="H" />
                            </div>
                            <p className="mt-5 text-morandi-primary font-bold tracking-widest">活動簽到 / 特約商店</p>
                        </div>
                    </motion.div>
                </div>

                {/* 底部徽章區 / 右側徽章區 */}
                <div className="w-full max-w-[22rem] lg:max-w-md lg:mt-0 flex-1">
                    <div className="glass rounded-3xl p-6 lg:p-8">
                        <h3 className="text-xl font-bold text-morandi-primary mb-6">我的動態徽章</h3>
                        <div className="flex flex-col gap-4">
                            {profile.badges?.length > 0 ? (
                                profile.badges.map((badge, idx) => (
                                    <div key={idx} className="bg-morandi-bg px-5 py-4 rounded-2xl flex items-center space-x-4">
                                        <span className="text-3xl bg-white p-2 rounded-xl shadow-sm">🎓</span>
                                        <div>
                                            <p className="text-sm font-bold text-morandi-text">{badge.org_name}</p>
                                            <p className="text-xs text-morandi-secondary mt-1">{badge.title}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-morandi-secondary text-sm italic">目前尚無組織徽章</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}