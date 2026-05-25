import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function AdminUsers() {
    const navigate = useNavigate();
    const role = localStorage.getItem('icu_role');

    const [usersList, setUsersList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Tracking local changes to avoid bulk updates
    const [selectedRoles, setSelectedRoles] = useState({}); // { [userId]: newRole }
    const [selectedIdentities, setSelectedIdentities] = useState({}); // { [userId]: newIdentity }
    const [submitLoadingId, setSubmitLoadingId] = useState(null); // tracking active submit userId
    const [isSavingAll, setIsSavingAll] = useState(false); // tracking active bulk update state

    // 在校認證審核彈窗狀態
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [modalTargetUser, setModalTargetUser] = useState(null);
    const [modalSemester, setModalSemester] = useState('1');
    const [modalActionLoading, setModalActionLoading] = useState(false);
    // 系友身分審核彈窗狀態（獨立，防止與學生審核衝突）
    const [showAlumniModal, setShowAlumniModal] = useState(false);
    const [alumniModalTargetUser, setAlumniModalTargetUser] = useState(null);
    const [alumniModalActionLoading, setAlumniModalActionLoading] = useState(false);


    const getProofUrl = (url) => {
        if (!url) return '';
        let targetUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            const formattedBase = base.endsWith('/') ? base.slice(0, -1) : base;
            const formattedUrl = url.startsWith('/') ? url : `/${url}`;
            targetUrl = `${formattedBase}${formattedUrl}`;
        }
        // 🚀 雙重防護：加入時間戳記做為 Cache Buster，強制瀏覽器拉取雲端最新檔案
        const separator = targetUrl.includes('?') ? '&' : '?';
        return `${targetUrl}${separator}t=${new Date().getTime()}`;
    };

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
                    const identities = u.card_profile ? u.card_profile.identities : [];
                    const primaryIdentity = identities && identities.length > 0 ? identities[0] : (u.card_profile ? u.card_profile.identity_type : 'None');
                    identityMap[u.id] = primaryIdentity;
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
            // alert('✅ 權限與系卡身分變更成功！被更動之帳號若正在使用中，部分設定將於下次重新登入後完全生效！');
            
            // Re-fetch to refresh baseline data
            await fetchUsers();
        } catch (error) {
            const msg = error.response?.data?.detail || '更新失敗，請檢查網路連線或稍後再試';
            alert(`❌ ${msg}`);
        } finally {
            setSubmitLoadingId(null);
        }
    };

    const handleSaveAll = async () => {
        const changed = usersList.filter(user => {
            const originalRole = user.system_role;
            const originalIdentity = user.card_profile ? user.card_profile.identity_type : 'None';
            const localRole = selectedRoles[user.id] || originalRole;
            const localIdentity = selectedIdentities[user.id] || originalIdentity;
            return localRole !== originalRole || localIdentity !== originalIdentity;
        });

        if (changed.length === 0) return;

        setIsSavingAll(true);
        try {
            const promises = changed.map(user => {
                const originalRole = user.system_role;
                const originalIdentity = user.card_profile ? user.card_profile.identity_type : 'None';
                const targetRole = selectedRoles[user.id];
                const targetIdentity = selectedIdentities[user.id];
                
                const payload = {};
                if (targetRole !== originalRole) {
                    payload.system_role = targetRole;
                }
                if (targetIdentity !== originalIdentity) {
                    if (targetIdentity !== 'None') {
                        payload.identity_type = targetIdentity;
                    }
                }
                return api.put(`/content/users/${user.id}/role`, payload);
            });

            await Promise.all(promises);
            // alert(`✅ 成功儲存所有變更（共更新 ${changed.length} 筆帳號資料）！被更動之帳號若正在使用中，部分設定將於下次重新登入後完全生效！`);
            await fetchUsers();
        } catch (error) {
            console.error("批量儲存失敗", error);
            alert("❌ 批量儲存時發生錯誤，請檢查網路連線或稍後再試！");
        } finally {
            setIsSavingAll(false);
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

    const changedUsers = usersList.filter(user => {
        const originalRole = user.system_role;
        const originalIdentity = user.card_profile ? user.card_profile.identity_type : 'None';
        const localRole = selectedRoles[user.id] || originalRole;
        const localIdentity = selectedIdentities[user.id] || originalIdentity;
        return localRole !== originalRole || localIdentity !== originalIdentity;
    });
    const changedUsersCount = changedUsers.length;

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col items-center py-6 px-4 sm:px-6 lg:px-12 font-sans text-morandi-text">
            {/* Top Navigation Bar */}
            <header className="w-full max-w-6xl mb-8 flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm shrink-0">
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
                    <span className="text-sm font-semibold bg-morandi-accent/10 text-morandi-accent px-2.5 py-1 rounded-full">
                        身分權限管理
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

            {/* Title Block & Search input */}
            <div className="w-full max-w-6xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-morandi-primary">身份權限管理</h1>
                    <p className="text-morandi-secondary mt-1 text-sm">本系統可調整用戶之權限組與身份組</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                    <button
                        onClick={() => {
                            setIsEditMode(!isEditMode);
                            if (isEditMode) {
                                // 回到唯讀模式時，重置尚未確認的變更
                                fetchUsers();
                            }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
                            isEditMode
                                ? 'bg-morandi-secondary text-white hover:bg-opacity-95'
                                : 'bg-morandi-accent text-white hover:bg-opacity-90'
                        }`}
                    >
                        {isEditMode ? '結束編輯模式' : '進入編輯模式'}
                    </button>
                    {isEditMode && (
                        <button
                            onClick={handleSaveAll}
                            disabled={changedUsersCount === 0 || isSavingAll}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
                                changedUsersCount > 0 && !isSavingAll
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            }`}
                        >
                            {isSavingAll ? '儲存中...' : `儲存所有變更 (${changedUsersCount})`}
                        </button>
                    )}
                    <input
                        type="text"
                        placeholder="🔍 依 Email 篩選帳號..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2.5 bg-white/70 backdrop-blur-sm border border-morandi-secondary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-morandi-accent shadow-sm text-sm w-full sm:w-64 animate-fade-in"
                    />
                </div>
            </div>

            {/* Main Users List Container */}
            <div className="w-full max-w-6xl flex-1 pb-12 animate-fade-in">
                {isLoading ? (
                    <div className="glass rounded-3xl p-12 text-center text-morandi-primary tracking-widest font-semibold">載入註冊用戶名單中...</div>
                ) : filteredUsers.length > 0 ? (
                    <>
                        <div className="glass rounded-3xl overflow-hidden shadow-md border border-white/20">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-morandi-secondary/10">
                                <thead className="bg-morandi-bg/40">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">信箱帳號 (Email)</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-morandi-primary uppercase tracking-wider">真實姓名 / 學號工號</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-morandi-primary uppercase tracking-wider">系統角色</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-morandi-primary uppercase tracking-wider">數位系卡身分</th>
                                        {isEditMode && (
                                            <th className="px-6 py-4 text-center text-xs font-bold text-morandi-primary uppercase tracking-wider w-36">操作</th>
                                        )}
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
                                                    {isEditMode ? (
                                                        <select
                                                            value={localRole}
                                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                            className="px-2.5 py-1.5 bg-white border border-morandi-secondary/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-morandi-accent focus:border-transparent transition-all mx-auto"
                                                        >
                                                            <option value="None" hidden default>權限組錯誤</option>
                                                            <option value="Contributor">一般會員 Contributor</option>
                                                            <option value="Manager">活動管理員 Manager</option>
                                                            <option value="Admin">系統管理員 Admin</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm mx-auto ${getRoleBadgeClass(user.system_role)}`}>
                                                            {translateRoleName(user.system_role)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                                    {isEditMode ? (
                                                        <select
                                                            value={localIdentity}
                                                            onChange={(e) => handleIdentityChange(user.id, e.target.value)}
                                                            className="px-2.5 py-1.5 bg-white border border-morandi-secondary/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-morandi-accent focus:border-transparent transition-all mx-auto"
                                                        >
                                                            {/* {originalIdentity === 'None' ? (
                                                                <option value="None">未建系卡</option>
                                                            ) : (
                                                                <option value="None" disabled hidden>未建系卡</option>
                                                            )} */}
                                                            <option value="None" hidden default>尚未建立系卡</option>
                                                            <option value="Student">在校生 Student</option>
                                                            <option value="Faculty">教職員 Faculty</option>
                                                            <option value="Alumni">資傳系友 Alumni</option>
                                                        </select>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <div className="flex flex-wrap gap-1 justify-center max-w-[12rem]">
                                                                {user.card_profile && user.card_profile.identities && user.card_profile.identities.length > 0 ? (
                                                                    user.card_profile.identities.map((idStr, idx) => (
                                                                        <span key={idx} className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${getIdentityBadgeClass(idStr)}`}>
                                                                            {translateIdentityName(idStr)}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm mx-auto ${getIdentityBadgeClass(originalIdentity)}`}>
                                                                        {translateIdentityName(originalIdentity)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            {/* 在校學生在學認證狀態顯示 */}
                                                            {user.card_profile && user.card_profile.identities?.includes('Student') && (
                                                                <div className="flex flex-col items-center mt-1">
                                                                    {(() => {
                                                                        const cp = user.card_profile;
                                                                        const isExpired = cp.current_status === 'Suspended' || (cp.valid_until && new Date() > new Date(cp.valid_until)) || !cp.valid_until;
                                                                        const isPending = cp.verification_status === 'Pending' && cp.enrollment_proof_url;
                                                                        const isRejected = cp.verification_status === 'Rejected';
                                                                        
                                                                        return (
                                                                            <>
                                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                                                                    isPending 
                                                                                        ? 'bg-amber-50 text-amber-600 border-amber-200' 
                                                                                        : isRejected
                                                                                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                                                                                        : isExpired 
                                                                                        ? 'bg-gray-100 text-gray-500 border-gray-300' 
                                                                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                                                }`}>
                                                                                    {isPending ? '待審核 🔍' : isRejected ? '已退件 ❌' : isExpired ? '已過期 ⚠️' : '在學有效 ✅'}
                                                                                </span>
                                                                                
                                                                                {/* 審核展延按鈕 */}
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setModalTargetUser(user);
                                                                                        setModalSemester(cp.proof_semester ? String(cp.proof_semester) : '1');
                                                                                        setShowExtendModal(true);
                                                                                    }}
                                                                                    className="px-2 py-0.5 mt-1 bg-morandi-primary/10 text-morandi-primary hover:bg-morandi-primary/20 text-[10px] font-bold rounded transition-all active:scale-95 shadow-sm"
                                                                                >
                                                                                    {isPending ? '審核證件' : '延展效期'}
                                                                                </button>
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}

                                                            {/* 系友資格審核狀態顯示（Pending_Alumni） */}
                                                            {user.card_profile && user.card_profile.identities?.includes('Alumni') && (() => {
                                                                const cp = user.card_profile;
                                                                const isPendingAlumni = cp.verification_status === 'Pending_Alumni';
                                                                const isApproved = cp.verification_status === 'Approved';
                                                                const isRejected = cp.verification_status === 'Rejected';

                                                                return (
                                                                    <div className="flex flex-col items-center mt-1">
                                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                                                            isPendingAlumni
                                                                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                                                                : isApproved
                                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                                                : isRejected
                                                                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                                                                : 'bg-gray-100 text-gray-500 border-gray-300'
                                                                        }`}>
                                                                            {isPendingAlumni ? '系友待審 🎓' : isApproved ? '系友已開通 ✅' : isRejected ? '系友已退件 ❌' : '系友未申請'}
                                                                        </span>

                                                                        {/* 系友審核按鈕：只在待審或已退件時顯示 */}
                                                                        {(isPendingAlumni || isRejected) && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setAlumniModalTargetUser(user);
                                                                                    setShowAlumniModal(true);
                                                                                }}
                                                                                className="px-2 py-0.5 mt-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 text-[10px] font-bold rounded transition-all active:scale-95 shadow-sm border border-amber-200"
                                                                            >
                                                                                {isPendingAlumni ? '審核系友資格' : '重新審核'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </td>
                                                {isEditMode && (
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
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* 底部批量儲存按鈕 */}
                    {isEditMode && (
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleSaveAll}
                                disabled={changedUsersCount === 0 || isSavingAll}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
                                changedUsersCount > 0 && !isSavingAll
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            }`}
                            >
                                {isSavingAll ? '儲存中...' : `儲存所有變更 (${changedUsersCount})`}
                            </button>
                        </div>
                    )}
                    </>
            ) : (
                <div className="glass rounded-3xl p-12 text-center text-morandi-secondary italic">未搜尋到任何符合的註冊信箱帳號。</div>
            )}
            </div>

            {/* ==========================================
                系友資格審核 Modal（獨立，不與學生審核共用）
            ========================================== */}
            {showAlumniModal && alumniModalTargetUser && alumniModalTargetUser.card_profile && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-morandi-secondary/15 flex flex-col max-h-[90vh] overflow-y-auto animate-fade-in text-morandi-text">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-morandi-primary flex items-center gap-2">
                                <span>🎓</span>
                                資傳系友身分審核與開通
                            </h3>
                            <button 
                                onClick={() => setShowAlumniModal(false)}
                                className="text-morandi-secondary hover:text-morandi-primary text-2xl font-bold transition-colors"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-5 flex-1">
                            {/* 申請人資訊 */}
                            <div className="bg-morandi-bg/60 p-5 rounded-2xl grid grid-cols-2 gap-4 border border-white/40 shadow-sm">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-morandi-secondary">系友姓名</p>
                                    <p className="text-base font-bold text-morandi-primary">{alumniModalTargetUser.card_profile.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-morandi-secondary">學號</p>
                                    <p className="text-base font-mono font-bold text-morandi-primary">{alumniModalTargetUser.card_profile.student_or_staff_id}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-morandi-secondary">入學年份</p>
                                    <p className="text-sm font-bold text-morandi-primary">民國 {alumniModalTargetUser.card_profile.entry_year} 年</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-morandi-secondary">預計畢業學年</p>
                                    <p className="text-sm font-bold text-morandi-primary">{alumniModalTargetUser.card_profile.expected_graduation_year} 學年度</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] uppercase font-bold text-morandi-secondary">申請信箱</p>
                                    <p className="text-sm font-semibold text-morandi-primary">{alumniModalTargetUser.email}</p>
                                </div>
                            </div>

                            {/* 系友證明文件預覽 */}
                            <div className="border border-morandi-secondary/20 rounded-2xl p-4 bg-morandi-bg/30 flex flex-col items-center shadow-inner">
                                <p className="text-xs font-bold text-morandi-secondary mb-3">上傳之系友證明檔案預覽</p>
                                {alumniModalTargetUser.card_profile.enrollment_proof_url ? (
                                    (() => {
                                        const fileUrl = getProofUrl(alumniModalTargetUser.card_profile.enrollment_proof_url);
                                        const rawUrl = alumniModalTargetUser.card_profile.enrollment_proof_url.toLowerCase();
                                        if (rawUrl.endsWith('.pdf')) {
                                            return (
                                                <div className="py-4">
                                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                                        className="px-6 py-3.5 bg-morandi-primary text-white rounded-xl text-xs font-bold hover:bg-opacity-95 shadow-md active:scale-95 transition-all flex items-center gap-1.5">
                                                        📄 在新視窗中開啟 PDF 系友證明檔案
                                                    </a>
                                                </div>
                                            );
                                        } else if (rawUrl.endsWith('.heic')) {
                                            return (
                                                <div className="py-4 flex flex-col items-center bg-white/70 p-6 rounded-2xl border border-morandi-secondary/20 shadow-sm text-center max-w-sm">
                                                    <span className="text-4xl mb-2">📱</span>
                                                    <h4 className="text-sm font-bold text-morandi-primary">iOS 專用 HEIC 系友證明文件</h4>
                                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" download
                                                        className="px-5 py-2.5 bg-morandi-accent text-white rounded-xl text-xs font-bold hover:bg-opacity-90 shadow-md active:scale-95 transition-all flex items-center gap-1 mt-3">
                                                        📥 下載 / 開啟 HEIC 系友證明檔案
                                                    </a>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="w-full max-h-64 overflow-y-auto rounded-xl border border-morandi-secondary/15 bg-white flex justify-center p-2 shadow-inner">
                                                    <img src={fileUrl} alt="系友證明" className="max-w-full h-auto object-contain rounded-lg"
                                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300?text=檔案格式暫不支援直接預覽'; }} />
                                                </div>
                                            );
                                        }
                                    })()
                                ) : (
                                    <p className="text-xs text-morandi-secondary italic py-8">該系友尚未上傳證明檔案</p>
                                )}
                            </div>

                            {/* 固定：系友一律終身開通 */}
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
                                <p className="text-xs font-bold text-amber-700">🎓 系友卡審核通過後將永久開通（終身有效，無需每學期展延）</p>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                type="button"
                                onClick={async () => {
                                    setAlumniModalActionLoading(true);
                                    try {
                                        await api.post(`/card/verify-and-extend/${alumniModalTargetUser.id}`, null, {
                                            params: { semester: 9, action: 'approve' }
                                        });
                                        alert('🎉 系友身分審核通過！系友數位系卡已成功終身永久開通。');
                                        setShowAlumniModal(false);
                                        await fetchUsers();
                                    } catch (err) {
                                        alert(`❌ 審核失敗：${err.response?.data?.detail || '網路連線異常'}`);
                                    } finally {
                                        setAlumniModalActionLoading(false);
                                    }
                                }}
                                disabled={alumniModalActionLoading}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md active:scale-95 transition-all text-xs"
                            >
                                {alumniModalActionLoading ? '處理中...' : '✅ 核准並開通系友終身卡'}
                            </button>

                            {alumniModalTargetUser.card_profile.enrollment_proof_url && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setAlumniModalActionLoading(true);
                                        try {
                                            await api.post(`/card/verify-and-extend/${alumniModalTargetUser.id}`, null, {
                                                params: { semester: 9, action: 'reject' }
                                            });
                                            alert('退件成功！已將該系友的申請標記為退件。');
                                            setShowAlumniModal(false);
                                            await fetchUsers();
                                        } catch (err) {
                                            alert(`❌ 操作失敗：${err.response?.data?.detail || '網路連線異常'}`);
                                        } finally {
                                            setAlumniModalActionLoading(false);
                                        }
                                    }}
                                    disabled={alumniModalActionLoading}
                                    className="px-5 py-3 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 border border-red-100 font-bold rounded-2xl active:scale-95 transition-all text-xs"
                                >
                                    退件拒絕
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 在學證明審核與一鍵展延 Modal 彈窗 */}
            {showExtendModal && modalTargetUser && modalTargetUser.card_profile && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-morandi-secondary/15 flex flex-col max-h-[90vh] overflow-y-auto animate-fade-in text-morandi-text">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-morandi-primary flex items-center gap-2">
                                <span>🔍</span>
                                {modalTargetUser.card_profile.proof_semester === 9 ? '資傳系友身分審核與開通' : '在學證明審核與展延'}
                            </h3>
                            <button 
                                onClick={() => setShowExtendModal(false)}
                                className="text-morandi-secondary hover:text-morandi-primary text-2xl font-bold transition-colors"
                            >
                                &times;
                            </button>
                        </div>
                        
                        <div className="space-y-5 flex-1">
                            <div className="bg-morandi-bg/60 p-5 rounded-2xl grid grid-cols-2 gap-4 border border-white/40 shadow-sm">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-morandi-secondary">
                                        {modalTargetUser.card_profile.proof_semester === 9 ? '系友姓名' : '學生姓名'}
                                    </p>
                                    <p className="text-base font-bold text-morandi-primary">{modalTargetUser.card_profile.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-morandi-secondary">
                                        {modalTargetUser.card_profile.proof_semester === 9 ? '學號/工號' : '學生學號'}
                                    </p>
                                    <p className="text-base font-mono font-bold text-morandi-primary">{modalTargetUser.card_profile.student_or_staff_id}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-morandi-secondary">申報學年度</p>
                                    <p className="text-sm font-bold text-morandi-primary">
                                        {modalTargetUser.card_profile.proof_academic_year === 999 
                                            ? '🎓 資傳系友身份' 
                                            : (modalTargetUser.card_profile.proof_academic_year ? `民國 ${modalTargetUser.card_profile.proof_academic_year} 年` : '尚未申報')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-morandi-secondary">申報學期</p>
                                    <p className="text-sm font-bold text-morandi-primary">
                                        {modalTargetUser.card_profile.proof_semester === 9 
                                            ? '任意證明文件 (畢業證書/校園照片等)' 
                                            : (modalTargetUser.card_profile.proof_semester ? `第 ${modalTargetUser.card_profile.proof_semester} 學期` : '尚未申報')}
                                    </p>
                                </div>
                            </div>
                            
                            {/* 證明文件展示區 */}
                            <div className="border border-morandi-secondary/20 rounded-2xl p-4 bg-morandi-bg/30 flex flex-col items-center shadow-inner">
                                <p className="text-xs font-bold text-morandi-secondary mb-3">
                                    {modalTargetUser.card_profile.proof_semester === 9 ? '上傳之系友證明檔案預覽' : '上傳之在學證明檔案預覽'}
                                </p>
                                {modalTargetUser.card_profile.enrollment_proof_url ? (
                                    (() => {
                                        const fileUrl = getProofUrl(modalTargetUser.card_profile.enrollment_proof_url);
                                        const rawUrl = modalTargetUser.card_profile.enrollment_proof_url.toLowerCase();
                                        
                                        if (rawUrl.endsWith('.pdf')) {
                                            return (
                                                <div className="py-4">
                                                    <a
                                                        href={fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-6 py-3.5 bg-morandi-primary text-white rounded-xl text-xs font-bold hover:bg-opacity-95 shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                                                    >
                                                        📄 在新視窗中開啟 PDF 證明檔案
                                                    </a>
                                                </div>
                                            );
                                        } else if (rawUrl.endsWith('.heic')) {
                                            return (
                                                <div className="py-4 flex flex-col items-center bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-morandi-secondary/20 shadow-sm text-center max-w-sm">
                                                    <span className="text-4xl mb-2">📱</span>
                                                    <h4 className="text-sm font-bold text-morandi-primary">iOS 專用 HEIC 證明文件</h4>
                                                    <p className="text-[11px] text-morandi-secondary mt-1.5 mb-4 leading-relaxed">
                                                        此文件為 Apple 特有的高畫質圖片格式，瀏覽器無法直接在網頁中渲染。請點選下方按鈕下載或在新分頁中直接檢視檔案。
                                                    </p>
                                                    <a
                                                        href={fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download
                                                        className="px-5 py-2.5 bg-morandi-accent text-white rounded-xl text-xs font-bold hover:bg-opacity-90 shadow-md active:scale-95 transition-all flex items-center gap-1"
                                                    >
                                                        📥 下載 / 開啟 HEIC 證明檔案
                                                    </a>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="w-full max-h-64 overflow-y-auto rounded-xl border border-morandi-secondary/15 bg-white flex justify-center p-2 shadow-inner">
                                                    <img
                                                        src={fileUrl}
                                                        alt="在學證明"
                                                        className="max-w-full h-auto object-contain rounded-lg"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = "https://placehold.co/400x300?text=檔案格式暫不支援直接預覽，請嘗試下載查看";
                                                        }}
                                                    />
                                                </div>
                                            );
                                        }
                                    })()
                                ) : (
                                    <p className="text-xs text-morandi-secondary italic py-8">該學生尚未上傳在校證明檔案</p>
                                )}
                            </div>
                            
                            {/* 核准展延設定 */}
                            <div className="bg-morandi-bg/40 p-4 rounded-2xl border border-morandi-secondary/10 shadow-sm">
                                <label className="block text-xs font-bold text-morandi-secondary mb-2">確認核准展延的學期：</label>
                                <select
                                    value={modalSemester}
                                    onChange={(e) => setModalSemester(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-morandi-secondary/35 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-morandi-accent shadow-sm"
                                >
                                    {modalTargetUser.card_profile.proof_semester === 9 ? (
                                        <option value="9">🎓 系友卡終身開通 (有效期限將展延至永久有效)</option>
                                    ) : (
                                        <>
                                            <option value="1">上學期 (有效期限將展延至隔年 1 月 31 日)</option>
                                            <option value="2">下學期 (有效期限將展延至當年 7 月 31 日)</option>
                                            <option value="9">🎓 特別轉換為系友卡終身開通 (永久有效)</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex gap-4 mt-8">
                            <button
                                type="button"
                                onClick={async () => {
                                    setModalActionLoading(true);
                                    try {
                                        await api.post(`/card/verify-and-extend/${modalTargetUser.id}`, null, {
                                            params: {
                                                semester: parseInt(modalSemester, 10),
                                                action: 'approve'
                                            }
                                        });
                                        alert(modalSemester === '9' 
                                            ? '🎉 核准審核成功！該系友數位系卡已順利終身永久開通。' 
                                            : '🎉 核准審核成功！學生數位系卡已順利展延。');
                                        setShowExtendModal(false);
                                        await fetchUsers();
                                    } catch (err) {
                                        alert(`❌ 審核失敗：${err.response?.data?.detail || '網路連線異常'}`);
                                    } finally {
                                        setModalActionLoading(false);
                                    }
                                }}
                                disabled={modalActionLoading}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md active:scale-95 transition-all text-xs"
                            >
                                {modalActionLoading ? '處理中...' : (modalSemester === '9' ? '✅ 核准並一鍵開通終身卡' : '✅ 核准並一鍵展延')}
                            </button>
                            
                            {modalTargetUser.card_profile.enrollment_proof_url && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setModalActionLoading(true);
                                        try {
                                            await api.post(`/card/verify-and-extend/${modalTargetUser.id}`, null, {
                                                params: {
                                                    semester: 1,
                                                    action: 'reject'
                                                }
                                            });
                                            alert('退件成功！已將該學生的在校證明標記為退件。');
                                            setShowExtendModal(false);
                                            await fetchUsers();
                                        } catch (err) {
                                            alert(`❌ 操作失敗：${err.response?.data?.detail || '網路連線異常'}`);
                                        } finally {
                                            setModalActionLoading(false);
                                        }
                                    }}
                                    disabled={modalActionLoading}
                                    className="px-5 py-3 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 border border-red-100 font-bold rounded-2xl active:scale-95 transition-all text-xs"
                                >
                                    退件拒絕
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
