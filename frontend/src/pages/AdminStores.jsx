import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function AdminStores() {
    const navigate = useNavigate();
    const role = localStorage.getItem('icu_role');

    const [storeList, setStoreList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState(null); // null when creating
    const [name, setName] = useState('');
    const [discount, setDiscount] = useState('');
    const [icon, setIcon] = useState('☕');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Predefined Emojis for Store Icons
    const emojiOptions = ['☕', '🍛', '🎨', '🍔', '🍰', '🍜', '🛍️', '📚', '🥪', '🍕', '🥤', '💈', '💻', '🎁'];

    const fetchStores = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/content');
            setStoreList(response.data.stores || []);
        } catch (error) {
            console.error("載入特約商店失敗", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('ics_token');
        if (!token) {
            navigate('/');
            return;
        }

        if (role !== 'Admin' && role !== 'Manager') {
            alert('🔒 存取錯誤：此功能僅限系統管理員或活動管理員使用！');
            navigate('/home');
            return;
        }

        fetchStores();
    }, [navigate, role]);

    const handleLogout = () => {
        localStorage.removeItem('ics_token');
        localStorage.removeItem('icu_role');
        navigate('/');
    };

    const openCreateModal = () => {
        setEditingStore(null);
        setName('');
        setDiscount('');
        setIcon('☕');
        setErrorMsg('');
        setIsModalOpen(true);
    };

    const openEditModal = (storeItem) => {
        setEditingStore(storeItem);
        setName(storeItem.name);
        setDiscount(storeItem.discount);
        setIcon(storeItem.icon || '☕');
        setErrorMsg('');
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        setErrorMsg('');

        const payload = { name, discount, icon };

        try {
            if (editingStore) {
                // Edit
                await api.put(`/content/stores/${editingStore.id}`, payload);
            } else {
                // Create
                await api.post('/content/stores', payload);
            }
            setIsModalOpen(false);
            fetchStores();
        } catch (error) {
            const msg = error.response?.data?.detail || '儲存失敗，請確認欄位格式是否正確';
            setErrorMsg(msg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (storeId) => {
        if (!window.confirm('❓ 您確定要刪除這家特約合作商店嗎？此操作將無法還原！')) return;

        try {
            await api.delete(`/content/stores/${storeId}`);
            fetchStores();
        } catch (error) {
            alert('刪除失敗，請檢查網路連線或稍後再試。');
        }
    };

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col items-center py-6 px-4 sm:px-6 lg:px-12 font-sans text-morandi-text">
            {/* Top Navigation Bar */}
            <header className="w-full max-w-5xl mb-8 flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm shrink-0">
                <div className="flex items-center space-x-3">
                    <span 
                        onClick={() => navigate('/admin')}
                        className="text-lg sm:text-xl font-bold text-morandi-primary tracking-wider cursor-pointer hover:opacity-85"
                    >
                        後台管理
                    </span>
                    <span className="text-morandi-secondary">/</span>
                    <span className="text-sm font-semibold bg-morandi-accent/10 text-morandi-accent px-2.5 py-1 rounded-full">
                        🤝 特約商店管理
                    </span>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/admin')}
                        className="px-4 py-2 border-2 border-morandi-primary/20 text-morandi-primary rounded-xl text-sm font-semibold hover:bg-morandi-primary/5 active:scale-95 transition-all flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        返回管理主頁
                    </button>
                    <button
                        onClick={() => navigate('/home')}
                        className="px-4 py-2 border-2 border-morandi-secondary/20 text-morandi-text rounded-xl text-sm font-semibold hover:bg-morandi-primary/5 active:scale-95 transition-all flex items-center gap-1"
                    >
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

            {/* Title Block & Create Button */}
            <div className="w-full max-w-5xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-morandi-primary">🤝 特約合作商店管理</h1>
                    <p className="text-morandi-secondary mt-1 text-sm">新增、編輯與下架首頁顯示的特約合作商店優惠內容。</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-5 py-3 bg-morandi-accent text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-90 active:scale-95 transition-all flex items-center gap-2 shrink-0"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path></svg>
                    新增特約商店
                </button>
            </div>

            {/* Main Stores List Container */}
            <div className="w-full max-w-5xl flex-1 pb-12">
                {isLoading ? (
                    <div className="glass rounded-3xl p-12 text-center text-morandi-primary tracking-widest font-semibold">載入商店資料中...</div>
                ) : storeList.length > 0 ? (
                    <div className="glass rounded-3xl overflow-hidden shadow-md border border-white/20">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-morandi-secondary/10">
                                <thead className="bg-morandi-bg/40">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider w-20">圖示</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">商店名稱</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">特約優惠折扣內容</th>
                                        <th className="px-6 py-4 text-xs font-bold text-morandi-primary uppercase tracking-wider text-center">加入日期</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-morandi-primary uppercase tracking-wider w-40">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white/40 divide-y divide-morandi-secondary/10">
                                    {storeList.map((store) => (
                                        <tr key={store.id} className="hover:bg-white/60 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-2xl text-center">
                                                <span className="bg-white p-2 rounded-xl shadow-sm inline-block w-10 h-10 flex items-center justify-center border border-morandi-secondary/10">
                                                    {store.icon || '🤝'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-morandi-primary max-w-xs truncate">
                                                {store.name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-morandi-text font-medium">
                                                {store.discount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-morandi-secondary text-center">
                                                {store.created_at ? new Date(store.created_at).toLocaleDateString('zh-TW') : '無日期'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <div className="flex items-center justify-center space-x-2.5">
                                                    <button
                                                        onClick={() => openEditModal(store)}
                                                        className="px-3 py-1.5 border border-morandi-accent/30 text-morandi-accent rounded-lg text-xs font-bold hover:bg-morandi-accent hover:text-white transition-all active:scale-95"
                                                    >
                                                        編輯
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(store.id)}
                                                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-all active:scale-95"
                                                    >
                                                        刪除
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="glass rounded-3xl p-12 text-center text-morandi-secondary italic">目前尚無特約商店，點擊右上角新增！</div>
                )}
            </div>

            {/* --- Glassmorphic Create/Edit Modal --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-morandi-text/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass max-w-lg w-full rounded-3xl p-8 shadow-2xl border border-white/40 overflow-hidden relative flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-morandi-secondary/10 pb-4">
                            <h3 className="text-xl font-extrabold text-morandi-primary">
                                {editingStore ? '📝 編輯特約商店' : '🤝 新增特約商店'}
                            </h3>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-morandi-secondary/10 flex items-center justify-center text-morandi-secondary transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl text-sm mb-4 text-center">
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleFormSubmit} className="space-y-5 overflow-y-auto flex-1 pr-1">
                            <div>
                                <label className="block text-sm font-bold text-morandi-primary mb-2">商店名稱</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-morandi-accent transition-all text-sm"
                                    placeholder="例如 翠谷特調咖啡館"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-morandi-primary mb-2">商店代表圖示</label>
                                <div className="grid grid-cols-7 gap-3 mb-2 bg-white/20 p-4 rounded-xl border border-morandi-secondary/10">
                                    {emojiOptions.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setIcon(emoji)}
                                            className={`text-2xl p-2 rounded-xl transition-all hover:bg-white/40 active:scale-90 ${
                                                icon === emoji ? 'bg-morandi-accent/25 border-2 border-morandi-accent scale-105' : 'bg-transparent border-2 border-transparent'
                                            }`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center space-x-3 mt-2">
                                    <span className="text-xs text-morandi-secondary">自訂 Emoji 或輸入其他字元：</span>
                                    <input
                                        type="text"
                                        maxLength={2}
                                        value={icon}
                                        onChange={(e) => setIcon(e.target.value)}
                                        className="w-12 text-center py-1 bg-white/50 border border-morandi-secondary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-accent text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-morandi-primary mb-2">特約優惠折扣內容</label>
                                <input
                                    type="text"
                                    required
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-morandi-accent transition-all text-sm"
                                    placeholder="例如 憑數位系卡享全品項 9 折"
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-morandi-secondary/10 mt-6 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 px-4 border-2 border-morandi-secondary/20 text-morandi-secondary rounded-xl text-sm font-bold hover:bg-morandi-secondary/5 transition-all"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="flex-1 py-3 px-4 bg-morandi-accent text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                >
                                    {submitLoading ? '儲存中...' : '確認儲存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
