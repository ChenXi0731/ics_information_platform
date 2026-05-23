import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './scanner.css';

export default function Scanner() {
    const navigate = useNavigate();
    const role = localStorage.getItem('icu_role');
    const [eventName, setEventName] = useState('2026 資傳迎新宿營');
    const [message, setMessage] = useState({ text: '', type: '' });

    const eventNameRef = useRef(eventName);
    useEffect(() => {
        eventNameRef.current = eventName;
    }, [eventName]);

    useEffect(() => {
        const token = localStorage.getItem('ics_token');
        if (!token) {
            navigate('/');
            return;
        }

        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        let isProcessing = false;

        scanner.render(async (decodedText) => {
            if (isProcessing) return;
            isProcessing = true;
            scanner.pause(true);

            try {
                await api.post('/event/checkin', {
                    event_name: eventNameRef.current,
                    student_user_id: decodedText
                });
                setMessage({ text: '✅ 簽到成功！', type: 'text-morandi-accent bg-morandi-accent/10 border-morandi-accent/30' });
            } catch (error) {
                const errorDetail = error.response?.data?.detail || '簽到失敗，請確認網路或權限';
                setMessage({ text: `❌ ${errorDetail}`, type: 'text-red-600 bg-red-50 border-red-200' });
            }

            setTimeout(() => {
                setMessage({ text: '', type: '' });
                isProcessing = false;
                scanner.resume();
            }, 2500);

        }, (error) => { });

        // 觀察 #qr-reader 容器，當 html5-qrcode 動態插入元件時將其翻譯為中文
        const translateScannerUI = () => {
            const container = document.getElementById("qr-reader");
            if (!container) return;

            // 使用 TreeWalker 尋找所有文字節點 (TEXT_NODE)
            // 這能確保我們「僅修改純文字」，絕不會破壞任何 HTML 結構、按鈕或 JS 事件監聽器！
            const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walk.nextNode()) {
                const text = node.nodeValue.trim();
                
                // 採用 includes() 模糊比對，完美解決大小寫、複數 (Permission / Permissions) 及不同錯誤訊息 (denied / dismissed) 的細微文字差異
                if (text === "or") {
                    node.nodeValue = "或";
                } else if (text.includes("Request Camera Permission") || text.includes("Request camera permission")) {
                    node.nodeValue = "允許存取相機";
                } else if (text.includes("Start Scanning")) {
                    node.nodeValue = "開始掃描";
                } else if (text.includes("Stop Scanning")) {
                    node.nodeValue = "停止掃描";
                } else if (text.includes("Requesting camera permissions")) {
                    node.nodeValue = "正在取得相機權限中...";
                } else if (text.includes("NotAllowedError") || text.includes("Permission denied") || text.includes("Permission dismissed")) {
                    node.nodeValue = "存取錯誤：取得相機權限失敗";
                } else if (text.includes("Select Camera")) {
                    node.nodeValue = "選擇相機：";
                } else if (text.includes("Or drop an image to scan")) {
                    node.nodeValue = "將圖片拖曳至此處進行掃描";
                } else if (text.includes("Scan an Image File")) {
                    node.nodeValue = "選擇圖片檔案進行掃描";
                } else if (text.includes("Scan using camera directly")) {
                    node.nodeValue = "直接使用相機掃描";
                } else if (text.includes("Camera access is needed to scan QR Code.")) {
                    node.nodeValue = "需要相機存取權限以進行 QR Code 掃描。";
                } else if (text.includes("Choose File") || text.includes("Choose Image")) {
                    node.nodeValue = "選擇圖片檔案";
                } else if (text.includes("No image")) {
                    node.nodeValue = "未選擇任何圖片";
                }
            }
        };


        const observer = new MutationObserver(() => {
            translateScannerUI();
        });

        const qrReaderContainer = document.getElementById("qr-reader");
        if (qrReaderContainer) {
            observer.observe(qrReaderContainer, { childList: true, subtree: true });
        }

        // 初始化時先執行一次翻譯
        translateScannerUI();

        return () => {
            observer.disconnect();
            scanner.clear().catch(e => console.error(e));
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('ics_token');
        localStorage.removeItem('icu_role');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-morandi-bg flex flex-col items-center py-6 px-4 sm:px-6 lg:px-12 font-sans">
            {/* Top Navigation Bar */}
            <header className="w-full max-w-5xl mb-10 flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm">
                <div className="flex items-center space-x-3">
                    <span className="text-lg sm:text-xl font-bold text-morandi-primary tracking-wider">世新資傳系卡 - 簽到掃描</span>
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
                        onClick={() => navigate('/card')}
                        className="px-4 py-2 bg-morandi-primary text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-opacity-90 active:scale-95 transition-all flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        查看我的系卡
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 border-2 border-morandi-secondary/20 text-morandi-text rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-95 transition-all"
                    >
                        登出
                    </button>
                </div>
            </header>

            <div className="w-full max-w-5xl bg-morandi-surface rounded-3xl overflow-hidden shadow-xl flex flex-col md:flex-row border border-white/20">

                {/* Desktop Left / Mobile Top: Settings */}
                <div className="bg-morandi-primary p-8 md:p-12 text-morandi-surface flex flex-col justify-center md:w-1/3 shrink-0">
                    <h2 className="text-3xl font-bold tracking-wider mb-2">活動簽到</h2>
                    <p className="text-morandi-bg/80 text-sm mb-10">僅限管理員身分使用</p>

                    <div>
                        <label className="block text-xs font-bold text-morandi-bg/80 uppercase tracking-wider mb-2">
                            當前活動名稱
                        </label>
                        <input
                            type="text"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            className="w-full px-4 py-3 bg-morandi-text/40 text-morandi-surface border border-morandi-surface/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-morandi-accent transition-all"
                        />
                    </div>
                </div>

                {/* Scanner Area */}
                <div className="flex-1 p-6 md:p-10 flex flex-col items-center bg-morandi-bg">

                    {/* Status Message Area */}
                    <div className="h-16 mb-6 w-full max-w-sm flex items-center justify-center">
                        {message.text ? (
                            <div className={`px-4 py-3 rounded-xl border-2 font-semibold w-full text-center transition-all ${message.type}`}>
                                {message.text}
                            </div>
                        ) : (
                            <p className="text-morandi-secondary text-sm tracking-wide animate-pulse">請將相機對準數位系卡 QR Code</p>
                        )}
                    </div>

                    {/* QR Reader Target */}
                    <div id="qr-reader" className="w-full max-w-sm rounded-2xl overflow-hidden border-4 border-morandi-surface shadow-inner bg-white"></div>
                </div>

            </div>
        </div>
    );
}