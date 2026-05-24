import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CardSetup() {
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('ics_token');
        if (!token) {
            navigate('/');
        }
    }, [navigate]);

    const [name, setName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [identityType, setIdentityType] = useState('Student');
    const [entryYear, setEntryYear] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogout = () => {
        localStorage.removeItem('ics_token');
        localStorage.removeItem('icu_role');
        navigate('/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            const payload = {
                name,
                student_or_staff_id: idNumber,
                identity_type: identityType,
                entry_year: parseInt(entryYear, 10)
            };

            await api.post('/card/setup', payload);
            navigate('/card');
        } catch (error) {
            const message = error.response?.data?.detail || '設定失敗，請確認資料格式或稍後再試';
            setErrorMsg(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col items-center py-6 px-4 sm:px-6 lg:px-12 font-sans">
            {/* Top Navigation Bar */}
            <header className="w-full max-w-5xl mb-10 flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm shrink-0">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/home')}
                        className="px-4 py-2 border-2 border-morandi-primary/20 text-morandi-primary rounded-xl text-sm font-semibold hover:bg-morandi-primary/5 active:scale-95 transition-all flex items-center gap-1"
                    >
                        返回首頁
                    </button>
                    <span className="text-lg sm:text-xl font-bold text-morandi-primary tracking-wider">世新資傳系卡</span>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 border-2 border-morandi-secondary/20 text-morandi-text rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-95 transition-all"
                    >
                        登出
                    </button>
                </div>
            </header>

            <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center flex-1">
                
                {/* Left Side: Instructions */}
                <div className="text-center lg:text-left space-y-6">
                    <h2 className="text-4xl lg:text-5xl font-bold text-morandi-primary tracking-tight">
                        領取數位系卡
                    </h2>
                    <p className="text-lg text-morandi-text opacity-90 max-w-md mx-auto lg:mx-0">
                        請填寫您的真實資料，以便系統核發專屬卡面。這張數位系卡將作為您未來參與系上活動與身分識別的重要憑證。
                    </p>
                    <div className="hidden lg:block w-20 h-1 bg-morandi-accent rounded-full mt-6"></div>
                </div>

                {/* Right Side: Setup Form */}
                <div className="glass rounded-3xl p-8 sm:p-10 shadow-xl w-full max-w-md mx-auto">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {errorMsg && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm text-center border border-red-100">
                                {errorMsg}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-morandi-text mb-2">真實姓名</label>
                            <input
                                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                className="block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-morandi-accent transition-all"
                                placeholder="例如 王大明"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-morandi-text mb-2">身分組</label>
                            <select
                                value={identityType} onChange={(e) => setIdentityType(e.target.value)}
                                className="block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-morandi-accent transition-all"
                            >
                                <option value="Student">在校學生 (Student)</option>
                                <option value="Alumni">畢業系友 (Alumni)</option>
                                <option value="Faculty">教職員 (Faculty)</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-morandi-text mb-2">
                                    {identityType === 'Faculty' ? '教職工號' : '學號'}
                                </label>
                                <input
                                    type="text" required value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-morandi-accent transition-all"
                                    placeholder={identityType === 'Faculty' ? "輸入工號" : "A112000001"}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-morandi-text mb-2">
                                    {identityType === 'Faculty' ? '到職年份(民國)' : '入學年份(民國)'}
                                </label>
                                <input
                                    type="number" required value={entryYear} onChange={(e) => setEntryYear(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-morandi-accent transition-all"
                                    placeholder="112"
                                />
                            </div>
                        </div>

                        <button
                            type="submit" disabled={isLoading}
                            className={`w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md text-base font-semibold text-white transition-all transform active:scale-95 mt-4 ${
                                isLoading ? 'bg-morandi-secondary cursor-not-allowed' : 'bg-morandi-accent hover:bg-opacity-90 hover:shadow-lg'
                            }`}
                        >
                            {isLoading ? '處理中...' : '確認送出並發卡'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}