import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import Shell from './components/Shell.jsx';
import Login from './pages/Login.jsx';
import Browse from './pages/Browse.jsx';
import OrgPage from './pages/OrgPage.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import NewListing from './pages/NewListing.jsx';
import MyListings from './pages/MyListings.jsx';
import PastClaims from './pages/PastClaims.jsx';
import Impact from './pages/Impact.jsx';

function Protected({ role, children }) {
  const { session } = useApp();
  if (!session) return <Navigate to="/login" replace />;
  if (role && session.role !== role) return <Navigate to="/" replace />;
  return <Shell>{children}</Shell>;
}

function Home() {
  const { session } = useApp();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={session.role === 'donor' ? '/my-listings' : '/browse'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
      <Route path="/browse" element={<Protected role="recipient"><Browse /></Protected>} />
      <Route path="/orgs/:id" element={<Protected><OrgPage /></Protected>} />
      <Route path="/listings/:id" element={<Protected><ListingDetail /></Protected>} />
      <Route path="/new" element={<Protected role="donor"><NewListing /></Protected>} />
      <Route path="/my-listings" element={<Protected role="donor"><MyListings /></Protected>} />
      <Route path="/claims" element={<Protected><PastClaims /></Protected>} />
      <Route path="/impact" element={<Protected><Impact /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
