import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import CardSetup from './pages/CardSetup';
import CardDashboard from './pages/CardDashboard';
import Scanner from './pages/Scanner';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import AdminNews from './pages/AdminNews';
import AdminStores from './pages/AdminStores';
import AdminUsers from './pages/AdminUsers';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/setup" element={<CardSetup />} />
        <Route path="/card" element={<CardDashboard />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/news" element={<AdminNews />} />
        <Route path="/admin/stores" element={<AdminStores />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;