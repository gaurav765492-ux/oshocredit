
import React, { useState, useEffect, useMemo } from 'react';
import { Party, AppState, User, Transaction, TransactionType, PartyType } from './types';
import { Button, Card, Input, Modal } from './components/UI';
import { getBusinessSummary } from './services/geminiService';

// Mock Data Persistence
const STORAGE_KEY = 'osho_credit_data';

interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppState>('DASHBOARD');
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [activeTab, setActiveTab] = useState<PartyType>('CUSTOMER');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('DEBIT');
  
  // GST Invoice State
  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [isInvoicePreview, setIsInvoicePreview] = useState(false);

  // Load Data
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setParties(parsed.parties || []);
      setUser(parsed.user || null);
      if (!parsed.user) setView('LOGIN');
    } else {
      setView('LOGIN');
    }
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ parties, user }));
  }, [parties, user]);

  const stats = useMemo(() => {
    let youGave = 0;
    let youGot = 0;
    parties.forEach(p => {
      p.transactions.forEach(t => {
        if (t.type === 'DEBIT') youGave += t.amount;
        else youGot += t.amount;
      });
    });
    return {
      totalYouGave: youGave,
      totalYouGot: youGot,
      netBalance: youGave - youGot
    };
  }, [parties]);

  const filteredParties = useMemo(() => {
    return parties
      .filter(p => p.type === activeTab)
      .filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.phone.includes(searchQuery)
      );
  }, [parties, activeTab, searchQuery]);

  const handleLogin = (phone: string, shop: string) => {
    if (!phone || !shop) return alert('Please enter details');
    const newUser: User = { id: Date.now().toString(), phone, shopName: shop, role: 'USER', isBlocked: false };
    setUser(newUser);
    setView('DASHBOARD');
  };

  const addParty = (name: string, phone: string, type: PartyType) => {
    if (!name || !phone) return;
    const newParty: Party = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      phone,
      type,
      transactions: [],
      createdAt: new Date().toISOString()
    };
    setParties([...parties, newParty]);
    setIsAddPartyModalOpen(false);
  };

  const addTransaction = (partyId: string, amount: number, type: TransactionType, note: string, date?: string) => {
    if (!amount || isNaN(amount)) return alert("Please enter a valid amount");
    setParties(prev => prev.map(p => {
      if (p.id === partyId) {
        const newTx: Transaction = {
          id: Date.now().toString(),
          amount,
          type,
          note,
          date: date || new Date().toISOString()
        };
        return { ...p, transactions: [...p.transactions, newTx] };
      }
      return p;
    }));
    setIsTransactionModalOpen(false);
  };

  const generateAiSummary = async () => {
    setIsLoading(true);
    const summary = await getBusinessSummary(parties);
    setAiSummary(summary || "Summary generation failed.");
    setIsLoading(false);
  };

  const selectedParty = parties.find(p => p.id === selectedPartyId);

  const handleWhatsAppReminder = () => {
    if (!selectedParty || !user) return;
    const balance = selectedParty.transactions.reduce((acc, t) => acc + (t.type === 'DEBIT' ? t.amount : -t.amount), 0);
    const statusText = balance >= 0 ? "pending balance" : "advance balance";
    const amountStr = `₹${Math.abs(balance)}`;
    
    const message = `Namaste ${selectedParty.name},\n\nThis is a friendly reminder from *${user.shopName}* (Osho Credit).\n\nYour current ${statusText} is *${amountStr}*.\n\nKripya ise jald se jald clear karein. Thank you! 🙏`;
    
    setParties(prev => prev.map(p => p.id === selectedParty.id ? { ...p, lastReminderSent: new Date().toISOString() } : p));
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/91${selectedParty.phone}?text=${encodedMessage}`, '_blank');
  };

  const handleAddInvoiceItem = () => {
    const newItem: InvoiceItem = { id: Date.now().toString(), name: '', qty: 1, price: 0 };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const invoiceSubtotal = invoiceItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const invoiceTax = invoiceSubtotal * 0.18;
  const invoiceTotal = invoiceSubtotal + invoiceTax;

  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-indigo-900 tracking-tight">OSHO CREDIT</h1>
            <p className="text-gray-500 mt-2">Digital Ledger for Modern Shops</p>
          </div>
          <div className="space-y-4">
            <Input placeholder="Shop Name (e.g. Rahul General Store)" id="shop" />
            <Input placeholder="Mobile Number" type="tel" id="phone" />
            <Button className="w-full py-4 text-lg !rounded-xl" onClick={() => {
              const shop = (document.getElementById('shop') as HTMLInputElement).value;
              const phone = (document.getElementById('phone') as HTMLInputElement).value;
              handleLogin(phone, shop);
            }}>
              Get Started
            </Button>
            <p className="text-center text-xs text-gray-400">Manage credit, recovery and GST bills</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative overflow-x-hidden">
      {/* Header */}
      <header className="bg-indigo-700 text-white p-6 sticky top-0 z-40 rounded-b-[2rem] shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black text-xl">O</div>
             <div>
                <h2 className="text-lg font-bold truncate max-w-[150px]">{user?.shopName}</h2>
                <p className="text-indigo-200 text-[10px] uppercase font-bold tracking-widest">Digital Khata</p>
             </div>
          </div>
          <button onClick={() => setView('ADMIN')} className="bg-white/10 p-2 rounded-xl active:scale-95 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </button>
        </div>
        <Card className="!bg-white !text-gray-900 border-none shadow-xl">
          <div className="flex justify-between items-center text-center">
            <div className="flex-1 border-r border-gray-100">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">You Gave</p>
              <p className="text-xl font-black text-red-600">₹{stats.totalYouGave}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">You Got</p>
              <p className="text-xl font-black text-green-600">₹{stats.totalYouGot}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-tight">Net Balance</p>
            <p className={`text-2xl font-black ${stats.netBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{Math.abs(stats.netBalance)} {stats.netBalance >= 0 ? 'Out' : 'In'}
            </p>
          </div>
        </Card>
      </header>

      <main className="px-4 py-6 mb-32">
        {view === 'DASHBOARD' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Input 
              placeholder="Search customers or suppliers..." 
              className="!rounded-2xl !bg-white !border-none !shadow-sm !py-4"
              onChange={(e) => { setSearchQuery(e.target.value); setView('PARTY_LIST'); }} 
            />
            <Card className="!bg-indigo-50 border-indigo-100 relative overflow-hidden group">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                  <span className="text-xl">✨</span> Gemini AI Summary
                </h3>
                <button onClick={generateAiSummary} className="text-indigo-600 text-xs font-black uppercase">Refresh</button>
              </div>
              {isLoading ? (
                <div className="animate-pulse space-y-2 py-2">
                  <div className="h-3 bg-indigo-200 rounded w-full"></div>
                  <div className="h-3 bg-indigo-200 rounded w-4/6"></div>
                </div>
              ) : (
                <p className="text-sm text-indigo-800 leading-relaxed italic">
                  {aiSummary || "Click refresh for personalized AI business advice."}
                </p>
              )}
            </Card>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setView('PARTY_LIST'); setActiveTab('CUSTOMER'); setSearchQuery(''); }} 
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                </div>
                <span className="font-bold text-gray-800 uppercase text-[10px] tracking-widest">Customers</span>
              </button>
              <button 
                onClick={() => { setView('PARTY_LIST'); setActiveTab('SUPPLIER'); setSearchQuery(''); }} 
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>
                <span className="font-bold text-gray-800 uppercase text-[10px] tracking-widest">Suppliers</span>
              </button>
            </div>
          </div>
        )}

        {view === 'PARTY_LIST' && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setView('DASHBOARD')} className="p-2 bg-white rounded-xl shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <h2 className="text-2xl font-black text-gray-800">{activeTab === 'CUSTOMER' ? 'Customers' : 'Suppliers'}</h2>
            </div>
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Find ${activeTab.toLowerCase()}...`} 
              className="!rounded-2xl !bg-white !shadow-sm !py-4"
            />
            <div className="space-y-3">
              {filteredParties.map(p => {
                 const balance = p.transactions.reduce((acc, t) => acc + (t.type === 'DEBIT' ? t.amount : -t.amount), 0);
                 return (
                   <Card key={p.id} className="active:scale-[0.98] transition-transform !rounded-3xl" onClick={() => { setSelectedPartyId(p.id); setView('PARTY_DETAIL'); }}>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700 text-xl">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{p.name}</p>
                            <p className="text-xs font-bold text-gray-400">{p.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className={`font-black text-xl ${balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>₹{Math.abs(balance)}</p>
                           <p className="text-[10px] uppercase font-black text-gray-300 tracking-widest">{balance >= 0 ? 'GIVE' : 'GOT'}</p>
                        </div>
                     </div>
                   </Card>
                 );
              })}
            </div>
            <div className="fixed bottom-24 right-6 z-50">
              <button 
                onClick={() => setIsAddPartyModalOpen(true)}
                className="w-16 h-16 bg-indigo-600 text-white rounded-[2rem] shadow-2xl flex items-center justify-center text-3xl font-black active:scale-90 transition-all hover:bg-indigo-700"
              >
                +
              </button>
            </div>
          </div>
        )}

        {view === 'PARTY_DETAIL' && selectedParty && (
          <div className="animate-in slide-in-from-bottom duration-300 pb-40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('PARTY_LIST')} className="p-2 bg-white rounded-xl shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <div>
                  <h2 className="text-xl font-black text-gray-800">{selectedParty.name}</h2>
                  <p className="text-xs font-bold text-gray-400 tracking-widest">{selectedParty.phone}</p>
                </div>
              </div>
              <Button onClick={handleWhatsAppReminder} variant="whatsapp" className="!p-3 !rounded-xl shadow-md">
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.522.902 3.19 1.379 4.894 1.38h.005c5.334 0 9.678-4.343 9.68-9.681.001-2.586-1.003-5.019-2.828-6.845-1.827-1.826-4.26-2.83-6.849-2.831-5.333 0-9.677 4.343-9.68 9.681-.001 1.839.518 3.635 1.499 5.2l-.994 3.629 3.71-.973zm8.309-11.166c.277.139.466.21.555.357.089.147.089.852-.222 1.729-.311.877-1.637 1.738-2.274 1.774-.637.037-1.229-.148-2.091-.486-2.906-1.141-4.783-4.085-4.93-4.282-.147-.197-1.185-1.574-1.185-2.998 0-1.425.741-2.126 1.007-2.408.267-.282.578-.352.77-.352h.548c.17 0 .393-.063.615.466.222.53.77 1.874.837 2.015.067.14.111.304.015.485-.096.182-.144.296-.289.466-.144.17-.304.378-.433.507-.144.144-.296.304-.122.6.174.296.774 1.274 1.663 2.063.921.821 1.7 1.077 2.033 1.218.333.141.53.118.726-.11.196-.227.841-.977 1.063-1.31.222-.333.444-.282.748-.17z"/></svg>
              </Button>
            </div>

            <Card className="!bg-white !rounded-3xl border-none shadow-xl mb-6">
              <div className="flex justify-between items-center py-2 px-1">
                <div className="text-center flex-1 border-r border-gray-50">
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Gave (+)</p>
                   <p className="text-xl font-black text-red-600">₹{selectedParty.transactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.amount, 0)}</p>
                </div>
                <div className="text-center flex-1">
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Got (-)</p>
                   <p className="text-xl font-black text-green-600">₹{selectedParty.transactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.amount, 0)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center px-1">
                 <p className="text-sm font-bold text-gray-500 uppercase">Balance Due</p>
                 <p className={`text-2xl font-black ${selectedParty.transactions.reduce((acc, t) => acc + (t.type === 'DEBIT' ? t.amount : -t.amount), 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                   ₹{Math.abs(selectedParty.transactions.reduce((acc, t) => acc + (t.type === 'DEBIT' ? t.amount : -t.amount), 0))}
                 </p>
              </div>
            </Card>

            <div className="space-y-4">
              <h3 className="font-black text-gray-500 text-xs uppercase tracking-widest px-1">Ledger History</h3>
              <div className="space-y-3">
                 {selectedParty.transactions.length === 0 ? (
                   <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 italic text-gray-400">
                     No entries found for this customer.
                   </div>
                 ) : (
                   [...selectedParty.transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                     <div key={t.id} className="flex justify-between items-center p-5 rounded-[1.5rem] border border-gray-50 bg-white shadow-sm">
                        <div className="flex gap-4 items-center">
                          <div className={`w-2 h-10 rounded-full ${t.type === 'DEBIT' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                          <div>
                            <p className="font-black text-gray-800">{t.note || 'Cash Entry'}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(t.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-lg ${t.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                            {t.type === 'DEBIT' ? '+' : '-'} ₹{t.amount}
                          </p>
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </div>

            {/* ACTION FOOTER - HIGHER Z-INDEX */}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-gray-100 flex gap-3 safe-bottom z-[60] shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
               <button 
                  onClick={() => { setTxType('DEBIT'); setIsTransactionModalOpen(true); }}
                  className="flex-1 py-5 bg-red-600 text-white font-black rounded-2xl active:scale-95 transition-all shadow-lg shadow-red-100 uppercase text-xs tracking-widest"
               >
                 You Gave (Lend)
               </button>
               <button 
                  onClick={() => { setTxType('CREDIT'); setIsTransactionModalOpen(true); }}
                  className="flex-1 py-5 bg-green-600 text-white font-black rounded-2xl active:scale-95 transition-all shadow-lg shadow-green-100 uppercase text-xs tracking-widest"
               >
                 You Got (Recv)
               </button>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      <Modal isOpen={isAddPartyModalOpen} onClose={() => setIsAddPartyModalOpen(false)} title="Add Customer">
          <div className="space-y-6">
             <Input id="new-party-name" placeholder="Full Name" className="!rounded-2xl !bg-gray-50" />
             <Input id="new-party-phone" type="tel" placeholder="WhatsApp Number" className="!rounded-2xl !bg-gray-50" />
             <Button 
                onClick={() => {
                  const name = (document.getElementById('new-party-name') as HTMLInputElement).value;
                  const phone = (document.getElementById('new-party-phone') as HTMLInputElement).value;
                  addParty(name, phone, activeTab);
                }}
                className="w-full !py-5 !rounded-2xl font-black text-lg shadow-xl"
              >
               Save Customer
             </Button>
          </div>
      </Modal>

      <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} title={txType === 'DEBIT' ? 'Lend Amount (+)' : 'Received Amount (-)'}>
          <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Enter Amount (₹)</label>
                <Input id="tx-amount" type="number" placeholder="0.00" autoFocus className={`!rounded-2xl !bg-gray-50 text-2xl font-black !py-6 ${txType === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`} />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Date</label>
                <Input id="tx-date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="!rounded-2xl !bg-gray-50 font-bold" />
             </div>
             <Input id="tx-note" placeholder="Notes (optional)" className="!rounded-2xl !bg-gray-50" />
             <Button 
                onClick={() => {
                  const amount = (document.getElementById('tx-amount') as HTMLInputElement).value;
                  const date = (document.getElementById('tx-date') as HTMLInputElement).value;
                  const note = (document.getElementById('tx-note') as HTMLInputElement).value;
                  if (selectedPartyId) addTransaction(selectedPartyId, parseFloat(amount), txType, note, date);
                }}
                className={`w-full !py-5 !rounded-2xl font-black text-lg shadow-xl ${txType === 'DEBIT' ? 'bg-red-600 shadow-red-100' : 'bg-green-600 shadow-green-100'}`}
              >
               Save Transaction
             </Button>
          </div>
      </Modal>

      {/* Navigation - Only show if NOT in Detail View */}
      {view !== 'PARTY_DETAIL' && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-lg border-t border-gray-100 px-6 py-3 flex justify-between items-center safe-bottom z-30 shadow-2xl">
          <button onClick={() => { setView('DASHBOARD'); setSearchQuery(''); }} className={`flex flex-col items-center transition-all ${view === 'DASHBOARD' ? 'text-indigo-600 scale-110' : 'text-gray-300'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            <span className="text-[9px] font-black mt-1 uppercase">Home</span>
          </button>
          <button onClick={() => { setView('PARTY_LIST'); setActiveTab('CUSTOMER'); setSearchQuery(''); }} className={`flex flex-col items-center transition-all ${view === 'PARTY_LIST' ? 'text-indigo-600 scale-110' : 'text-gray-300'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            <span className="text-[9px] font-black mt-1 uppercase">Ledger</span>
          </button>
          <button onClick={() => { setView('REPORTS'); setSearchQuery(''); }} className={`flex flex-col items-center transition-all ${view === 'REPORTS' ? 'text-indigo-600 scale-110' : 'text-gray-300'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span className="text-[9px] font-black mt-1 uppercase">Stats</span>
          </button>
          <button onClick={() => { setView('ADMIN'); setSearchQuery(''); }} className={`flex flex-col items-center transition-all ${view === 'ADMIN' ? 'text-indigo-600 scale-110' : 'text-gray-300'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            <span className="text-[9px] font-black mt-1 uppercase">Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
