import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';

export default function CardDashboard() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);
    
    // 新增狀態支援多重身份與在校認證上傳
    const [activeIdentity, setActiveIdentity] = useState('Student');
    const [proofFile, setProofFile] = useState(null);
    const [uploadYear, setUploadYear] = useState('114');
    const [uploadSemester, setUploadSemester] = useState('2');
    const [uploadLoading, setUploadLoading] = useState(false);

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
                const identities = response.data.identities || ['Student'];
                setActiveIdentity(identities[0]);
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

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setProofFile(e.target.files[0]);
        }
    };

    const handleUploadProof = async () => {
        if (!proofFile) return;
        setUploadLoading(true);
        const formData = new FormData();
        formData.append('file', proofFile);
        formData.append('academic_year', uploadYear);
        formData.append('semester', uploadSemester);
        
        try {
            await api.post('/card/upload-enrollment-proof', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert('🎉 在學證明已成功上傳送審，請等待管理員或活動幹部審核！');
            setProofFile(null);
            
            // 刷新資料
            const response = await api.get('/card/me');
            setProfile(response.data);
        } catch (error) {
            const msg = error.response?.data?.detail || '上傳失敗，請確認檔案大小與學期資訊！';
            alert(`❌ ${msg}`);
        } finally {
            setUploadLoading(false);
        }
    };

    if (!profile) return <div className="flex justify-center items-center h-screen bg-morandi-bg text-morandi-primary">載入中...</div>;

    // 檢查卡片是否失效 (方案 A 效期攔截或學籍暫停)
    const checkIsExpired = () => {
        if (profile.current_status === 'Suspended') return true;
        if (profile.identities && profile.identities.includes('Student')) {
            if (!profile.valid_until) return true;
            const validUntil = new Date(profile.valid_until);
            return new Date() > validUntil;
        }
        return false;
    };
    const isExpired = checkIsExpired();

    const getThemeColor = () => {
        switch (activeIdentity) {
            case 'Alumni': return 'bg-gradient-to-br from-morandi-secondary to-[#8b8077]';
            case 'Faculty': return 'bg-gradient-to-br from-morandi-accent to-[#72826e]';
            default: return 'bg-gradient-to-br from-shu-secondary to-[#8a1538]';
        }
    };

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col items-center py-6 px-4 sm:px-6 lg:px-12 font-sans">
            {/* Top Navigation Bar */}
            <header className="w-full max-w-5xl mb-10 flex flex-col justify-between py-4 px-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm">
                <div className='w-full max-w-5xl mb-4 flex justify-between items-center'>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => navigate('/home')}
                            className="px-4 py-2 border-2 border-morandi-primary/20 text-morandi-primary rounded-xl text-sm font-semibold hover:bg-morandi-primary/5 active:scale-95 transition-all flex items-center gap-1"
                        >
                            返回首頁
                        </button>
                        <span className="text-lg sm:text-xl font-bold text-morandi-primary tracking-wider">世新資傳數位系卡</span>
                        {role && (
                            <span className="text-xs bg-morandi-primary/10 text-morandi-primary px-2.5 py-1 rounded-full font-semibold">
                                {role === 'Admin' ? '系統管理員' : role === 'Manager' ? '活動管理員' : '一般會員'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 border-2 border-morandi-secondary/20 text-morandi-text rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-95 transition-all"
                        >
                            登出
                        </button>
                    </div>
                </div>
                {(role === 'Admin' || role === 'Manager') && (<div className='flex flex-row justify-start gap-1 border-t border-gray mt-2'>
                    <button
                        onClick={() => navigate('/scanner')}
                        className="px-2 py-2 text-morandi-primary text-sm font-semibold active:scale-95 transition-all flex items-center gap-1.5"
                    >
                        簽到掃描
                    </button>

                    <button
                        onClick={() => navigate('/admin')}
                        className="px-2 py-2 text-morandi-primary text-sm font-semibold active:scale-95 transition-all flex items-center gap-1.5"
                    >
                        身份權限管理
                    </button>
                </div>
                )}
            </header>

            <div className="mb-8 text-center">
                <h1 className="text-3xl lg:text-4xl font-bold text-morandi-primary">我的數位系卡</h1>
                <p className="text-morandi-secondary mt-2">點擊卡片可切換正反面，若有多重身分可在下方切換視覺</p>
            </div>

            {/* 多重身分切換控制區 */}
            {profile.identities && profile.identities.length > 1 && (
                <div className="flex justify-center gap-3 mb-8 w-full max-w-xs bg-white/50 p-1.5 rounded-2xl border border-white/20 shadow-sm backdrop-blur-md">
                    {profile.identities.map((identity) => (
                        <button
                            key={identity}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveIdentity(identity);
                            }}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                activeIdentity === identity
                                    ? 'bg-morandi-primary text-white shadow-sm'
                                    : 'text-morandi-secondary hover:text-morandi-primary hover:bg-white/40'
                            }`}
                        >
                            {identity === 'Student' ? '學生卡' : identity === 'Alumni' ? '系友卡' : '教職員卡'}
                        </button>
                    ))}
                </div>
            )}

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
                        {activeIdentity === 'Faculty' ? (
                            /* --- 教職員版本 Front --- */
                            <div className={`absolute inset-0 backface-hidden rounded-3xl shadow-2xl p-8 text-white flex flex-col justify-between overflow-hidden ${getThemeColor()}`}>
                                {/* 失效半透明磨砂浮水印 */}
                                {isExpired && (
                                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] rounded-3xl z-40 flex items-center justify-center pointer-events-none border-2 border-red-500/30">
                                        <div className="border-4 border-red-500 text-red-500 font-extrabold text-2xl lg:text-3xl px-6 py-2.5 rounded-2xl transform -rotate-12 tracking-widest animate-pulse shadow-lg bg-black/70">
                                            已失效 / EXPIRED
                                        </div>
                                    </div>
                                )}

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
                                {/* 失效半透明磨砂浮水印 */}
                                {isExpired && (
                                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] rounded-3xl z-40 flex items-center justify-center pointer-events-none border-2 border-red-500/30">
                                        <div className="border-4 border-red-500 text-red-500 font-extrabold text-2xl lg:text-3xl px-6 py-2.5 rounded-2xl transform -rotate-12 tracking-widest animate-pulse shadow-lg bg-black/70">
                                            已失效 / EXPIRED
                                        </div>
                                    </div>
                                )}

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
                                        {activeIdentity === 'Alumni' ? '系友 ALUMNI' : '學生 STUDENT'}
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
                        <div className="absolute inset-0 backface-hidden rounded-3xl shadow-xl p-6 bg-morandi-surface border-[3px] border-morandi-bg flex flex-col items-center justify-center rotate-y-180 overflow-hidden">
                            {/* 失效半透明磨砂浮水印 (背面同樣覆蓋) */}
                            {isExpired && (
                                <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] rounded-3xl z-40 flex items-center justify-center pointer-events-none border-2 border-red-500/30">
                                    <div className="border-4 border-red-500 text-red-500 font-extrabold text-2xl lg:text-3xl px-6 py-2.5 rounded-2xl transform -rotate-12 tracking-widest animate-pulse shadow-lg bg-black/70">
                                        已失效 / EXPIRED
                                    </div>
                                </div>
                            )}

                            <p className="text-morandi-secondary text-xs mb-4 font-bold tracking-widest uppercase">Activity Check-in / Cooperative Stores</p>
                            
                            {/* 特約商店防禦：失效時隱藏並鎖定 QR Code */}
                            {isExpired ? (
                                <div className="flex flex-col items-center justify-center py-6 text-center text-red-500">
                                    <span className="text-5xl mb-3">🔒</span>
                                    <p className="font-bold text-sm text-morandi-primary">卡片已失效，QR Code 簽到已鎖定</p>
                                    <p className="text-xs text-red-400 mt-1.5 max-w-[15rem] leading-relaxed">請完成當學期在校認證以重啟特約商店與簽到功能</p>
                                </div>
                            ) : (
                                <div className="bg-white p-3 rounded-2xl shadow-sm border border-morandi-bg">
                                    <QRCodeSVG value={profile.user_id} size={160} level="H" />
                                </div>
                            )}
                            <p className="mt-5 text-morandi-primary font-bold tracking-widest">活動簽到 / 特約商店</p>
                        </div>
                    </motion.div>
                </div>

                {/* 右側徽章與在校認證上傳區塊 */}
                <div className="w-full max-w-[22rem] lg:max-w-md lg:mt-0 flex-1 flex flex-col gap-6">
                    {/* 學生在校認證上傳送審區塊 */}
                    {profile.identities?.includes('Student') && (
                        <div className="glass rounded-3xl p-6 lg:p-8">
                            <h3 className="text-xl font-bold text-morandi-primary mb-4 flex items-center gap-1.5">
                                <span className="text-2xl">🎒</span>
                                在校認證與效期延展
                            </h3>
                            
                            <div className="flex flex-col gap-3.5 text-sm">
                                <div className="bg-morandi-bg/60 px-4 py-3 rounded-2xl flex justify-between items-center border border-white/40 shadow-sm">
                                    <span className="text-xs font-semibold text-morandi-secondary">認證狀態</span>
                                    <span className={`font-bold px-2.5 py-1 rounded-full text-xs shadow-sm ${
                                        profile.verification_status === 'Approved' && !isExpired
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                            : profile.verification_status === 'Pending'
                                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                            : 'bg-red-50 text-red-600 border border-red-200'
                                    }`}>
                                        {profile.verification_status === 'Approved' && !isExpired
                                            ? '已認證 (有效啟用)'
                                            : profile.verification_status === 'Pending'
                                            ? '審核中'
                                            : profile.verification_status === 'Rejected'
                                            ? '審核未通過 (退件)'
                                            : '卡片已過期'}
                                    </span>
                                </div>
                                
                                {profile.valid_until && (
                                    <div className="bg-morandi-bg/60 px-4 py-3 rounded-2xl flex justify-between items-center border border-white/40 shadow-sm">
                                        <span className="text-xs font-semibold text-morandi-secondary">當期效期至</span>
                                        <span className="font-mono font-bold text-morandi-primary">
                                            {new Date(profile.valid_until).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                                
                                {/* 僅在未認證、已過期、或被退件時顯示上傳區 */}
                                {(isExpired || profile.verification_status === 'Rejected' || !profile.valid_until) && (
                                    <div className="mt-2 border border-dashed border-morandi-primary/25 rounded-2xl p-4 bg-white/30 backdrop-blur-sm">
                                        <p className="text-[11px] text-morandi-secondary mb-3 leading-relaxed">
                                            請選取您的學年與學期，並上傳本學期世新大學在學證明 (支援格式: PDF, PNG, JPG, JPEG, HEIC)。
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-morandi-secondary mb-1">學年度 (民國)</label>
                                                <input
                                                    type="number"
                                                    value={uploadYear}
                                                    onChange={(e) => setUploadYear(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs bg-white/70 border border-morandi-secondary/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-morandi-accent shadow-sm"
                                                    placeholder="e.g. 111"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-morandi-secondary mb-1">學期</label>
                                                <select
                                                    value={uploadSemester}
                                                    onChange={(e) => setUploadSemester(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs bg-white/70 border border-morandi-secondary/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-morandi-accent shadow-sm font-semibold"
                                                >
                                                    <option value="1">上學期</option>
                                                    <option value="2">下學期</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <input
                                            type="file"
                                            id="enrollment-proof-input"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept=".pdf,.png,.jpg,.jpeg,.heic"
                                        />
                                        
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('enrollment-proof-input').click()}
                                            className="w-full px-4 py-2 border-2 border-morandi-accent/35 text-morandi-accent rounded-xl text-xs font-bold hover:bg-morandi-accent/5 active:scale-95 transition-all mb-2 shadow-sm bg-white/60"
                                        >
                                            {proofFile ? `📎 ${proofFile.name.substring(0, 18)}` : '📂 選擇在學證明檔案'}
                                        </button>
                                        
                                        {proofFile && (
                                            <button
                                                type="button"
                                                onClick={handleUploadProof}
                                                disabled={uploadLoading}
                                                className="w-full px-4 py-2.5 bg-morandi-accent text-white rounded-xl text-xs font-bold hover:bg-opacity-90 active:scale-95 transition-all shadow-md mt-1"
                                            >
                                                {uploadLoading ? '檔案上傳送審中...' : '🚀 送出在學證明審核'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 組織徽章區 */}
                    <div className="glass rounded-3xl p-6 lg:p-8">
                        <h3 className="text-xl font-bold text-morandi-primary mb-6">我的組織徽章</h3>
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