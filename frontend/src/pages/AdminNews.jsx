import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function AdminNews() {
    const navigate = useNavigate();
    const role = localStorage.getItem('icu_role');

    const [newsList, setNewsList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNews, setEditingNews] = useState(null); // null when creating
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('活動資訊');
    const [content, setContent] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const fetchNews = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/content');
            setNewsList(response.data.news || []);
        } catch (error) {
            console.error("載入消息失敗", error);
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

        fetchNews();
    }, [navigate, role]);

    const handleLogout = () => {
        localStorage.removeItem('ics_token');
        localStorage.removeItem('icu_role');
        navigate('/');
    };

    const openCreateModal = () => {
        setEditingNews(null);
        setTitle('');
        setCategory('活動資訊');
        setContent('');
        setErrorMsg('');
        setIsModalOpen(true);
    };

    const openEditModal = (newsItem) => {
        setEditingNews(newsItem);
        setTitle(newsItem.title);
        setCategory(newsItem.category);
        setContent(newsItem.content);
        setErrorMsg('');
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        setErrorMsg('');

        const payload = { title, category, content };

        try {
            if (editingNews) {
                // Edit
                await api.put(`/content/news/${editingNews.id}`, payload);
            } else {
                // Create
                await api.post('/content/news', payload);
            }
            setIsModalOpen(false);
            fetchNews();
        } catch (error) {
            const msg = error.response?.data?.detail || '儲存失敗，請確認欄位格式是否正確';
            setErrorMsg(msg);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (newsId) => {
        if (!window.confirm('❓ 您確定要刪除這筆最新消息嗎？此操作將無法還原！')) return;

        try {
            await api.delete(`/content/news/${newsId}`);
            fetchNews();
        } catch (error) {
            alert('刪除失敗，請檢查網路連線或稍後再試。');
        }
    };

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col items-center py-6 px-4 sm:px-6 lg:px-12 font-sans text-morandi-text">
            {/* Top Navigation Bar */}
            <header className="w-full max-w-5xl mb-8 flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm shrink-0">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/home')}
                        className="px-4 py-2 border-2 border-morandi-primary/20 text-morandi-primary rounded-xl text-sm font-semibold hover:bg-morandi-primary/5 active:scale-95 transition-all flex items-center gap-1"
                    >
                        返回首頁
                    </button>
                    <span 
                        onClick={() => navigate('/admin')}
                        className="text-lg sm:text-xl font-bold text-morandi-primary tracking-wider cursor-pointer hover:opacity-85"
                    >
                        後台管理
                    </span>
                    <span className="text-morandi-secondary">/</span>
                    <span className="text-sm font-semibold bg-morandi-primary/10 text-morandi-primary px-2.5 py-1 rounded-full">
                        📢 最新消息管理
                    </span>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/admin')}
                        className="px-4 py-2 border-2 border-morandi-primary/20 text-morandi-primary rounded-xl text-sm font-semibold hover:bg-morandi-primary/5 active:scale-95 transition-all flex items-center gap-1"
                    >
                        返回管理主頁
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
                    <h1 className="text-3xl font-extrabold text-morandi-primary">📢 最新消息管理</h1>
                    <p className="text-morandi-secondary mt-1 text-sm">發布或編輯顯示於使用者登入首頁的公告訊息。</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-5 py-3 bg-morandi-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-90 active:scale-95 transition-all flex items-center gap-2 shrink-0"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path></svg>
                    發布最新消息
                </button>
            </div>

            {/* Main News List Container */}
            <div className="w-full max-w-5xl flex-1 pb-12">
                {isLoading ? (
                    <div className="glass rounded-3xl p-12 text-center text-morandi-primary tracking-widest font-semibold">載入消息資料中...</div>
                ) : newsList.length > 0 ? (
                    <div className="glass rounded-3xl overflow-hidden shadow-md border border-white/20">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-morandi-secondary/10">
                                <thead className="bg-morandi-bg/40">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">類別</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">標題</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">公告內容</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">日期</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-morandi-primary uppercase tracking-wider">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white/40 divide-y divide-morandi-secondary/10">
                                    {newsList.map((news) => (
                                        <tr key={news.id} className="hover:bg-white/60 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="text-xs font-semibold bg-morandi-primary/10 text-morandi-primary px-2.5 py-1 rounded-full">
                                                    {news.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-morandi-primary max-w-xs truncate">
                                                {news.title}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-morandi-text max-w-md truncate">
                                                {news.content}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-morandi-secondary">
                                                {news.created_at ? new Date(news.created_at).toLocaleDateString('zh-TW') : '無日期'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <div className="flex items-center justify-center space-x-2.5">
                                                    <button
                                                        onClick={() => openEditModal(news)}
                                                        className="px-3 py-1.5 border border-morandi-primary/30 text-morandi-primary rounded-lg text-xs font-bold hover:bg-morandi-primary hover:text-white transition-all active:scale-95"
                                                    >
                                                        編輯
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(news.id)}
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
                    <div className="glass rounded-3xl p-12 text-center text-morandi-secondary italic">目前尚無最新消息公告，點擊右上方按鈕新增！</div>
                )}
            </div>

            {/* --- Glassmorphic Create/Edit Modal --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-morandi-text/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass max-w-lg w-full rounded-3xl p-8 shadow-2xl border border-white/40 overflow-hidden relative flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-morandi-secondary/10 pb-4">
                            <h3 className="text-xl font-extrabold text-morandi-primary">
                                {editingNews ? '📝 編輯最新消息' : '📢 發布最新消息'}
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
                                <label className="block text-sm font-bold text-morandi-primary mb-2">消息標題</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-morandi-accent transition-all text-sm"
                                    placeholder="輸入公告標題"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-morandi-primary mb-2">消息分類</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-morandi-accent transition-all text-sm"
                                >
                                    <option value="活動資訊">🎉 活動資訊</option>
                                    <option value="學術公告">📚 學術公告</option>
                                    <option value="系友福利">🎓 系友福利</option>
                                    <option value="其他">💬 其他</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-morandi-primary mb-2">公告內容</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/50 border border-morandi-secondary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-morandi-accent transition-all text-sm leading-relaxed"
                                    placeholder="請輸入消息詳細內容資訊..."
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
                                    className="flex-1 py-3 px-4 bg-morandi-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
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
