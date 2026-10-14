import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ShoppingCart, Award, CheckCircle } from 'lucide-react';
import { api, formatCurrency, formatPoints } from '../api/index.js';

const CATEGORIES = ['Groceries', 'Dairy', 'Bakery', 'Café', 'Beverages', 'Snacks', 'Household', 'Personal Care', 'Electronics', 'Other'];

const defaultItem = () => ({ productName: '', category: 'Groceries', quantity: 1, unitPrice: '' });

export default function NewPurchase() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [customersSearch, setCustomersSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [purchaseRef, setPurchaseRef] = useState(`PUR-${Date.now()}`);
  const [items, setItems] = useState([defaultItem()]);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.getCustomers().then(r => setCustomers(r.data)).catch(console.error);
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customersSearch.toLowerCase()) ||
    c.phone.includes(customersSearch)
  );

  const subtotal = items.reduce((sum, item) => {
    const p = parseFloat(item.unitPrice) || 0;
    const q = parseInt(item.quantity) || 0;
    return sum + p * q;
  }, 0);

  // Fetch preview whenever relevant values change
  const fetchPreview = useCallback(async () => {
    if (subtotal <= 0) { setPreview(null); return; }
    try {
      const r = await api.calculateReward(subtotal, pointsToRedeem || undefined);
      setPreview(r.data);
    } catch { setPreview(null); }
  }, [subtotal, pointsToRedeem]);

  useEffect(() => {
    const t = setTimeout(fetchPreview, 300);
    return () => clearTimeout(t);
  }, [fetchPreview]);

  const addItem = () => setItems(prev => [...prev, defaultItem()]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const validate = () => {
    const e = {};
    if (!selectedCustomer) e.customer = 'Please select a customer.';
    if (!purchaseRef.trim()) e.ref = 'Purchase reference is required.';
    if (items.length === 0) e.items = 'At least one item is required.';
    items.forEach((item, i) => {
      if (!item.productName.trim()) e[`item_name_${i}`] = 'Product name is required.';
      if (!item.quantity || parseInt(item.quantity) < 1) e[`item_qty_${i}`] = 'Quantity must be at least 1.';
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) e[`item_price_${i}`] = 'Price must be positive.';
    });
    if (pointsToRedeem) {
      const pts = parseInt(pointsToRedeem);
      if (isNaN(pts) || pts < 0) e.points = 'Invalid points value.';
      else if (pts > 0 && pts < 100) e.points = 'Minimum redemption is 100 points.';
      else if (selectedCustomer && pts > selectedCustomer.points_balance) e.points = `Insufficient balance. Available: ${selectedCustomer.points_balance} pts.`;
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const res = await api.createPurchase({
        customerId: selectedCustomer.id,
        purchaseRef: purchaseRef.trim(),
        items: items.map(i => ({
          productName: i.productName.trim(),
          category: i.category,
          quantity: parseInt(i.quantity),
          unitPrice: parseFloat(i.unitPrice)
        })),
        pointsToRedeem: pointsToRedeem ? parseInt(pointsToRedeem) : null
      });
      setSuccess(res.data);
    } catch (err) {
      setApiError(err.message || 'Failed to record purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg">
        <div className="card text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Purchase Recorded!</h2>
          <p className="text-gray-500 mb-6">Reference: <span className="font-mono font-semibold text-indigo-600">{success.purchase.purchase_ref}</span></p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">Amount Paid</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(success.purchase.total)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-600 font-medium">Points Earned</p>
              <p className="text-xl font-bold text-amber-700">+{success.purchase.points_earned} pts</p>
            </div>
            {success.purchase.redemption_discount > 0 && (
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-xs text-indigo-600 font-medium">Discount Applied</p>
                <p className="text-xl font-bold text-indigo-700">-{formatCurrency(success.purchase.redemption_discount)}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">New Balance</p>
              <p className="text-xl font-bold text-gray-700">{formatPoints(success.customer.points_balance)} pts</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link to={`/customers/${success.customer.id}`} className="btn-primary">View Customer Profile</Link>
            <button onClick={() => { setSuccess(null); setPurchaseRef(`PUR-${Date.now()}`); setItems([defaultItem()]); setPointsToRedeem(''); }} className="btn-secondary">New Purchase</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/purchases" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase</h1>
          <p className="text-sm text-gray-500">Record a customer purchase and calculate reward points</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{apiError}</div>
        )}

        {/* Customer Selection */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Customer</h3>
          <input
            type="text"
            placeholder="Search customer by name or phone..."
            value={customersSearch}
            onChange={e => setCustomersSearch(e.target.value)}
            className="form-input mb-2"
          />
          {errors.customer && <p className="text-xs text-red-500 mb-2">{errors.customer}</p>}

          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div>
                <p className="font-semibold text-indigo-900">{selectedCustomer.name}</p>
                <p className="text-xs text-indigo-600">{selectedCustomer.phone} · Balance: <strong>{formatPoints(selectedCustomer.points_balance)} pts</strong></p>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)} className="text-indigo-400 hover:text-indigo-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200">
              {filteredCustomers.length === 0 ? (
                <p className="text-sm text-gray-400 p-3 text-center">No customers found</p>
              ) : (
                filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedCustomer(c); setCustomersSearch(''); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-700">{c.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone} · {formatPoints(c.points_balance)} pts</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Purchase Details */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Purchase Details</h3>
          <div>
            <label className="form-label">Purchase Reference <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={purchaseRef}
              onChange={e => setPurchaseRef(e.target.value)}
              className={`form-input font-mono ${errors.ref ? 'border-red-400' : ''}`}
            />
            {errors.ref && <p className="text-xs text-red-500 mt-1">{errors.ref}</p>}
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Items</h3>
            <button type="button" onClick={addItem} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          {errors.items && <p className="text-xs text-red-500 mb-2">{errors.items}</p>}

          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="Product name"
                    value={item.productName}
                    onChange={e => updateItem(i, 'productName', e.target.value)}
                    className={`form-input text-sm ${errors[`item_name_${i}`] ? 'border-red-400' : ''}`}
                  />
                  {errors[`item_name_${i}`] && <p className="text-xs text-red-500 mt-0.5">{errors[`item_name_${i}`]}</p>}
                </div>
                <div className="col-span-3">
                  <select value={item.category} onChange={e => updateItem(i, 'category', e.target.value)} className="form-input text-sm">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', e.target.value)}
                    className={`form-input text-sm ${errors[`item_qty_${i}`] ? 'border-red-400' : ''}`}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="₹ Price"
                    value={item.unitPrice}
                    onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                    className={`form-input text-sm ${errors[`item_price_${i}`] ? 'border-red-400' : ''}`}
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center pt-1">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-right">
            <p className="text-sm text-gray-500">Subtotal: <span className="font-bold text-gray-900 text-base">{formatCurrency(subtotal)}</span></p>
          </div>
        </div>

        {/* Redemption */}
        {selectedCustomer && selectedCustomer.points_balance >= 100 && (
          <div className="card bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-amber-900">Apply Reward Points</h3>
              <span className="text-xs text-amber-600 ml-auto">Available: {formatPoints(selectedCustomer.points_balance)} pts</span>
            </div>
            <div>
              <label className="form-label text-amber-700">Points to Redeem (min 100)</label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 100"
                value={pointsToRedeem}
                onChange={e => setPointsToRedeem(e.target.value)}
                className={`form-input ${errors.points ? 'border-red-400' : ''}`}
              />
              {errors.points && <p className="text-xs text-red-500 mt-1">{errors.points}</p>}
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && subtotal > 0 && (
          <div className="card bg-indigo-50 border border-indigo-200">
            <h3 className="font-semibold text-indigo-900 mb-3">Calculation Preview</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-indigo-600">Purchase Total</p><p className="font-bold text-indigo-900">{formatCurrency(preview.amount)}</p></div>
              {preview.redemptionDiscount > 0 && <div><p className="text-indigo-600">Redemption Discount</p><p className="font-bold text-green-700">-{formatCurrency(preview.redemptionDiscount)}</p></div>}
              <div><p className="text-indigo-600">Net Eligible Amount</p><p className="font-bold text-indigo-900">{formatCurrency(preview.netEligible)}</p></div>
              <div><p className="text-indigo-600">Points to be Earned</p><p className="font-bold text-amber-700">+{preview.pointsEarned} pts</p></div>
            </div>
            <p className="text-xs text-indigo-500 mt-2">
              Formula: floor({formatCurrency(preview.netEligible)} ÷ ₹{preview.rule.earn_threshold}) = {preview.pointsEarned} pts
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 flex-1 justify-center">
            <ShoppingCart className="w-4 h-4" />
            {submitting ? 'Recording...' : 'Record Purchase'}
          </button>
          <Link to="/purchases" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
