import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function AdminUsers() {
    const navigate = useNavigate();
    const role = localStorage.getItem('icu_role');

    const [usersList, setUsersList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Tracking local changes to avoid bulk updates
    const [selectedRoles, setSelectedRoles] = useState({}); // { [userId]: newRole }
    const [selectedIdentities, setSelectedIdentities] = useState({}); // { [userId]: newIdentity }
    const [submitLoadingId, setSubmitLoadingId] = useState(null); // tracking active submit userId

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/content/users');
            const data = response.data || [];
            setUsersList(data);
            
            // Initialize local role & identity state maps safely
            const roleMap = {};
            const identityMap = {};
            data.forEach(u => {
                if (u && u.id) {
                    roleMap[u.id] = u.system_role || 'Contributor';
                    identityMap[u.id] = u.card_profile ? u.card_profile.identity_type : 'None';
                }
            });
            setSelectedRoles(roleMap);
            setSelectedIdentities(identityMap);
        } catch (error) {
            console.error("載入使用者列表失敗", error);
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

        if (role !== 'Admin') {
            alert('🔒 存取錯誤：此功能僅限「最高權限系統管理員 Admin」身分使用！');
            navigate('/home');
            return;
        }

        fetchUsers();
    }, [navigate, role]);

    const handleLogout = () => {
        localStorage.removeItem('ics_token');
        localStorage.removeItem('icu_role');
        navigate('/');
    };

    const handleRoleChange = (userId, newRole) => {
        setSelectedRoles(prev => ({
            ...prev,
            [userId]: newRole
        }));
    };

    const handleIdentityChange = (userId, newIdentity) => {
        setSelectedIdentities(prev => ({
            ...prev,
            [userId]: newIdentity
        }));
    };

    const handleUpdateRole = async (userId, originalRole, originalIdentity) => {
        const targetRole = selectedRoles[userId];
        const targetIdentity = selectedIdentities[userId];
        
        const payload = {};
        if (targetRole !== originalRole) {
            payload.system_role = targetRole;
        }
        if (targetIdentity !== originalIdentity) {
            if (targetIdentity !== 'None') {
                payload.identity_type = targetIdentity;
            }
        }

        if (Object.keys(payload).length === 0) return;

        setSubmitLoadingId(userId);
        try {
            await api.put(`/content/users/${userId}/role`, payload);
            alert('✅ 權限與系卡身分變更成功！被更動之帳號若正在使用中，部分設定將於下次重新登入後完全生效！');
            fetchUsers();
        } catch (error) {
            const msg = error.response?.data?.detail || '更新失敗，請檢查網路連線或稍後再試';
            alert(`❌ ${msg}`);
        } finally {
            setSubmitLoadingId(null);
        }
    };

    // Filter list based on email search term
    const filteredUsers = usersList.filter(u => 
        u && u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get color badge class for system roles
    const getRoleBadgeClass = (roleStr) => {
        switch (roleStr) {
            case 'Admin': return 'bg-red-50 text-red-600 border border-red-200';
            case 'Manager': return 'bg-blue-50 text-blue-600 border border-blue-200';
            default: return 'bg-gray-50 text-gray-500 border border-gray-200';
        }
    };

    const translateRoleName = (roleStr) => {
        switch (roleStr) {
            case 'Admin': return '系統管理員 (Admin)';
            case 'Manager': return '活動管理員 (Manager)';
            default: return '一般會員 (Contributor)';
        }
    };

    // Get color badge class for identity types
    const getIdentityBadgeClass = (identityStr) => {
        switch (identityStr) {
            case 'Student': return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
            case 'Faculty': return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
            case 'Alumni': return 'bg-amber-50 text-amber-600 border border-amber-200';
            default: return 'bg-gray-100 text-gray-400 border border-gray-200';
        }
    };

    const translateIdentityName = (identityStr) => {
        switch (identityStr) {
            case 'Student': return '學生 (Student)';
            case 'Faculty': return '教職員 (Faculty)';
            case 'Alumni': return '系友 (Alumni)';
            default: return '未建系卡';
        }
    };

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col items-center py-6 px-4 sm:px-6 lg:px-12 font-sans text-morandi-text">
            {/* Top Navigation Bar */}
            <header className="w-full max-w-6xl mb-8 flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm shrink-0">
                <div className="flex items-center space-x-3">
                    <span 
                        onClick={() => navigate('/admin')}
                        className="text-lg sm:text-xl font-bold text-morandi-primary tracking-wider cursor-pointer hover:opacity-85"
                    >
                        後台管理
                    </span>
                    <span className="text-morandi-secondary">/</span>
                    <span className="text-sm font-semibold bg-morandi-accent/10 text-morandi-accent px-2.5 py-1 rounded-full">
                        👥 權限與系卡身分管理
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

            {/* Title Block & Search input */}
            <div className="w-full max-w-6xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-morandi-primary">👥 使用者權限與系卡管理</h1>
                    <p className="text-morandi-secondary mt-1 text-sm">升級或降級所有會員的系統權限與數位系卡身分組，變更將直接同步寫入 Supabase 中。</p>
                </div>
                <div className="w-full sm:w-80 shrink-0">
                    <input
                        type="text"
                        placeholder="🔍 依 Email 篩選帳號..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-sm border border-morandi-secondary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-morandi-accent shadow-sm text-sm"
                    />
                </div>
            </div>

            {/* Main Users List Container */}
            <div className="w-full max-w-6xl flex-1 pb-12">
                {isLoading ? (
                    <div className="glass rounded-3xl p-12 text-center text-morandi-primary tracking-widest font-semibold">載入註冊用戶名單中...</div>
                ) : filteredUsers.length > 0 ? (
                    <div className="glass rounded-3xl overflow-hidden shadow-md border border-white/20">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-morandi-secondary/10">
                                <thead className="bg-morandi-bg/40">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">信箱帳號 (Email)</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">真實姓名 / 學號工號</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-morandi-primary uppercase tracking-wider">目前角色</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-morandi-primary uppercase tracking-wider">系卡身分</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">調整系統角色</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">調整系卡身分</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-morandi-primary uppercase tracking-wider w-36">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white/40 divide-y divide-morandi-secondary/10">
                                    {filteredUsers.map((user) => {
                                        const localRole = selectedRoles[user.id] || user.system_role;
                                        const originalIdentity = user.card_profile ? user.card_profile.identity_type : 'None';
                                        const localIdentity = selectedIdentities[user.id] || originalIdentity;
                                        
                                        const isRoleChanged = localRole !== user.system_role;
                                        const isIdentityChanged = localIdentity !== originalIdentity;
                                        const isAnyChanged = isRoleChanged || isIdentityChanged;

                                        return (
                                            <tr key={user.id} className="hover:bg-white/60 transition-colors">
                                                <td className="px-6 py-4 text-sm font-semibold text-morandi-primary max-w-xs truncate">
                                                    {user.email || '（無信箱）'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-morandi-text">
                                                    {user.card_profile ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-morandi-primary">{user.card_profile.name}</span>
                                                            <span className="text-[11px] text-morandi-secondary font-mono">{user.card_profile.student_or_staff_id}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">（尚未建立數位系卡）</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm ${getRoleBadgeClass(user.system_role)}`}>
                                                        {translateRoleName(user.system_role)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm ${getIdentityBadgeClass(originalIdentity)}`}>
                                                        {translateIdentityName(originalIdentity)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <select
                                                        value={localRole}
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                        className="px-2.5 py-1.5 bg-white border border-morandi-secondary/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-morandi-accent focus:border-transparent transition-all"
                                                    >
                                                        <option value="Contributor">Contributor 一般會員</option>
                                                        <option value="Manager">Manager 活動管理員</option>
                                                        <option value="Admin">Admin 系統管理員</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <select
                                                        value={localIdentity}
                                                        onChange={(e) => handleIdentityChange(user.id, e.target.value)}
                                                        className="px-2.5 py-1.5 bg-white border border-morandi-secondary/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-morandi-accent focus:border-transparent transition-all"
                                                    >
                                                        {originalIdentity === 'None' && <option value="None">（未建系卡）</option>}
                                                        <option value="Student">Student 學生卡</option>
                                                        <option value="Faculty">Faculty 教職員卡</option>
                                                        <option value="Alumni">Alumni 系友卡</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                    <button
                                                        onClick={() => handleUpdateRole(user.id, user.system_role, originalIdentity)}
                                                        disabled={!isAnyChanged || submitLoadingId === user.id}
                                                        className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 ${
                                                            isAnyChanged
                                                                ? submitLoadingId === user.id
                                                                    ? 'bg-morandi-secondary text-white cursor-not-allowed'
                                                                    : 'bg-morandi-accent text-white hover:bg-opacity-90 hover:shadow'
                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                        }`}
                                                    >
                                                        {submitLoadingId === user.id ? '更新中...' : '確認變更'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="glass rounded-3xl p-12 text-center text-morandi-secondary italic">未搜尋到任何符合的註冊信箱帳號。</div>
                )}
            </div>
        </div>
    );
}
