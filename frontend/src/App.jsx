import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import OwnerRoute from './components/OwnerRoute.jsx';

import Login           from './pages/Login.jsx';
import Dashboard       from './pages/Dashboard.jsx';
import Customers       from './pages/Customers.jsx';
import CustomerProfile from './pages/CustomerProfile.jsx';
import NewCustomer     from './pages/NewCustomer.jsx';
import Purchases       from './pages/Purchases.jsx';
import NewPurchase     from './pages/NewPurchase.jsx';
import Rewards         from './pages/Rewards.jsx';
import Offers          from './pages/Offers.jsx';
import Transactions    from './pages/Transactions.jsx';
import Settings        from './pages/Settings.jsx';
import Sync            from './pages/Sync.jsx';
import Employees       from './pages/Employees.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public — no Layout */}
          <Route path="/login" element={<Login />} />

          {/* Protected — Layout handles session check + redirect to /login */}
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/"                element={<Dashboard />} />
                <Route path="/customers"        element={<Customers />} />
                <Route path="/customers/new"    element={<NewCustomer />} />
                <Route path="/customers/:id"    element={<CustomerProfile />} />
                <Route path="/purchases"        element={<Purchases />} />
                <Route path="/purchases/new"    element={<NewPurchase />} />
                <Route path="/rewards"          element={<Rewards />} />
                <Route path="/offers"           element={<Offers />} />
                <Route path="/transactions"     element={<Transactions />} />
                {/* Owner-only */}
                <Route path="/settings"   element={<OwnerRoute><Settings /></OwnerRoute>} />
                <Route path="/sync"       element={<OwnerRoute><Sync /></OwnerRoute>} />
                <Route path="/employees"  element={<OwnerRoute><Employees /></OwnerRoute>} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
