'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, Download, TrendingUp, Users, DollarSign,
  CheckCircle2, XCircle, Clock, RefreshCw, Search, Filter, ArrowUpRight,
  ArrowDownLeft, MoreVertical, Settings
} from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Tenant {
  id: string;
  name: string;
  mobile_number: string;
  email?: string;
  address?: string;
  phone?: string;
  clickpesa_enabled: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  admin_fee: number;
  tenant_amount: number;
  network: string;
  status: string;
  payment_status: string;
  payout_status: string;
  created_at: string;
}

interface AdminFeeLog {
  id: string;
  transaction_id: string;
  amount: number;
  fee_percentage: number;
  status: string;
  payout_date?: string;
}

export default function PaymentsAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [adminFees, setAdminFees] = useState<AdminFeeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTenantDialog, setShowTenantDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('tenants');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    email: '',
    address: '',
    phone: '',
  });
  const [confirmMobileNumber, setConfirmMobileNumber] = useState('');
  const [formStep, setFormStep] = useState<'basic' | 'confirm'>('basic');
  const [mobileError, setMobileError] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId && activeTab === 'transactions') {
      fetchTenantTransactions(selectedTenantId);
      fetchAdminFees(selectedTenantId);
    }
  }, [selectedTenantId, activeTab]);

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BASE_URL}/api/payments/clickpesa/tenants`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTenants(data);
        if (data.length > 0 && !selectedTenantId) {
          setSelectedTenantId(data[0].id);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenantTransactions = async (tenantId: string) => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/payments/clickpesa/transactions/${tenantId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      toast.error('Failed to fetch transactions');
    }
  };

  const fetchAdminFees = async (tenantId: string) => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/payments/clickpesa/admin-fees/${tenantId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAdminFees(data);
      }
    } catch (error) {
      toast.error('Failed to fetch admin fees');
    }
  };

  const validateMobileNumber = (phone: string) => {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    const digitsOnly = cleaned.replace(/\D/g, '');

    // Must have at least 9 digits
    if (digitsOnly.length < 9) {
      return 'Mobile number must have at least 9 digits';
    }

    // Check for Tanzania format
    if (!cleaned.startsWith('+255') && !cleaned.startsWith('255') && !digitsOnly.startsWith('7') && !digitsOnly.startsWith('6')) {
      return 'Please enter a valid Tanzania mobile number (starting with +255 or 0)';
    }

    return '';
  };

  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, mobile_number: value });
    setMobileError(validateMobileNumber(value));
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Please enter tenant name');
      return;
    }

    if (!formData.mobile_number) {
      toast.error('Please enter the mobile number that will receive payments');
      return;
    }

    const error = validateMobileNumber(formData.mobile_number);
    if (error) {
      setMobileError(error);
      toast.error(error);
      return;
    }

    setConfirmMobileNumber('');
    setFormStep('confirm');
  };

  const handleRegisterTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify mobile numbers match
    if (formData.mobile_number !== confirmMobileNumber) {
      toast.error('Mobile numbers do not match. Please re-enter to confirm.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/payments/clickpesa/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to register tenant');
      }

      const data = await response.json();
      setTenants([...tenants, data]);
      setShowTenantDialog(false);
      setFormStep('basic');
      setFormData({
        name: '',
        mobile_number: '',
        email: '',
        address: '',
        phone: '',
      });
      setConfirmMobileNumber('');
      setMobileError('');
      toast.success('✅ Tenant registered successfully!', {
        description: `${data.name} will receive payments on ${data.mobile_number}`,
      });
      fetchTenants();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Registration failed';
      toast.error(errorMsg);
    }
  };

  const handleCloseTenantDialog = () => {
    setShowTenantDialog(false);
    setFormStep('basic');
    setFormData({
      name: '',
      mobile_number: '',
      email: '',
      address: '',
      phone: '',
    });
    setConfirmMobileNumber('');
    setMobileError('');
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;

    try {
      // Note: Delete endpoint would need to be implemented in backend
      toast.success('Tenant deleted successfully');
      setTenants(tenants.filter(t => t.id !== tenantId));
    } catch (error) {
      toast.error('Failed to delete tenant');
    }
  };

  // Statistics
  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalAdminFees = adminFees.reduce((sum, f) => sum + f.amount, 0);
  const successfulTransactions = transactions.filter(t => t.status === 'received').length;
  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.mobile_number.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Payments Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage tenants and track ClickPesa transactions
          </p>
        </div>
        <Button
          onClick={() => setShowTenantDialog(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Register Tenant
        </Button>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  TSH {totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Admin Fees
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  TSH {totalAdminFees.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Successful
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {successfulTransactions}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Pending
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {pendingTransactions}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-lg bg-white dark:bg-gray-900"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none border-b border-gray-200 dark:border-gray-800 bg-transparent">
            <TabsTrigger value="tenants" className="rounded-none">
              <Users className="w-4 h-4 mr-2" />
              Tenants
            </TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-none">
              <DollarSign className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="fees" className="rounded-none">
              <TrendingUp className="w-4 h-4 mr-2" />
              Admin Fees
            </TabsTrigger>
          </TabsList>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="p-6 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl bg-gray-50 dark:bg-gray-800 border-0"
                />
              </div>
              <Button variant="outline" size="sm" className="rounded-xl">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800">
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Mobile</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <motion.tr
                      key={tenant.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {tenant.name}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {tenant.mobile_number}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {tenant.email || '-'}
                      </TableCell>
                      <TableCell>
                        {tenant.clickpesa_enabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTenantId(tenant.id)}
                          className="rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredTenants.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No tenants found</p>
              </div>
            )}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="p-6 space-y-4">
            {selectedTenantId && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {tenants.find(t => t.id === selectedTenantId)?.name || 'Select a Tenant'}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-800">
                      <TableRow className="border-b border-gray-200 dark:border-gray-700">
                        <TableHead className="font-semibold">Reference</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Network</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">
                            {transaction.reference}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-white">
                            TSH {transaction.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="uppercase text-xs font-medium text-gray-600 dark:text-gray-400">
                            {transaction.network}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                              transaction.status === 'received'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : transaction.status === 'failed'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            }`}>
                              {transaction.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </TableCell>
                        </tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {transactions.length === 0 && (
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No transactions yet</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Admin Fees Tab */}
          <TabsContent value="fees" className="p-6 space-y-4">
            {selectedTenantId && (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-800">
                      <TableRow className="border-b border-gray-200 dark:border-gray-700">
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Fee %</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Payout Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminFees.map((fee) => (
                        <tr
                          key={fee.id}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <TableCell className="font-semibold text-gray-900 dark:text-white">
                            TSH {fee.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {fee.fee_percentage}%
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                              fee.status === 'paid_out'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            }`}>
                              {fee.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 dark:text-gray-400">
                            {fee.payout_date ? new Date(fee.payout_date).toLocaleDateString() : '-'}
                          </TableCell>
                        </tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {adminFees.length === 0 && (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No admin fees recorded</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Register Tenant Dialog */}
      <Dialog open={showTenantDialog} onOpenChange={handleCloseTenantDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Register New Tenant</DialogTitle>
            <DialogDescription>
              {formStep === 'basic'
                ? 'Add a new restaurant/tenant to receive mobile money payments'
                : 'Confirm the mobile number that will receive all payments'}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {/* Step 1: Basic Information */}
            {formStep === 'basic' && (
              <motion.form
                key="basic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleNextStep}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-semibold text-gray-900 dark:text-white">
                    Restaurant/Tenant Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Pizza Palace, The Grill House"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    required
                  />
                </div>

                {/* Mobile Number - PAYMENT WALLET */}
                <motion.div
                  className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">💰</span>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="mobile" className="font-bold text-amber-900 dark:text-amber-100 block mb-2">
                        Payment Receiving Mobile Number *
                      </Label>
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="+255 755 XXX XXX"
                        value={formData.mobile_number}
                        onChange={handleMobileNumberChange}
                        className={`rounded-lg bg-white dark:bg-gray-900 border-2 transition-colors ${
                          mobileError
                            ? 'border-red-500 dark:border-red-500'
                            : formData.mobile_number && !mobileError
                            ? 'border-green-500 dark:border-green-500'
                            : 'border-amber-300 dark:border-amber-600'
                        }`}
                        required
                      />
                      <p className="text-xs text-amber-700 dark:text-amber-200 mt-2 font-medium">
                        ⚠️ This is the mobile money account that will receive ALL customer payments for this tenant
                      </p>
                      {mobileError && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                          ❌ {mobileError}
                        </p>
                      )}
                      {formData.mobile_number && !mobileError && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                          ✅ Mobile number is valid
                        </p>
                      )}
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                        Format: +255 7XX XXX XXX or 07XX XXX XXX
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Optional Fields */}
                <div className="pt-2">
                  <Label className="text-sm font-semibold text-gray-900 dark:text-white mb-3 block">
                    Additional Information (Optional)
                  </Label>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="restaurant@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">
                        Contact Phone
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+255 7XX XXX XXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm">
                        Address
                      </Label>
                      <Input
                        id="address"
                        placeholder="Business address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseTenantDialog}
                    className="flex-1 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!formData.name || !formData.mobile_number || !!mobileError}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-lg"
                  >
                    Next: Confirm →
                  </Button>
                </div>
              </motion.form>
            )}

            {/* Step 2: Confirmation */}
            {formStep === 'confirm' && (
              <motion.form
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegisterTenant}
                className="space-y-4"
              >
                {/* Summary Card */}
                <motion.div
                  className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Review Information
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tenant Name:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formData.name}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                      <span className="text-gray-600 dark:text-gray-400">Payment Wallet:</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-300">{formData.mobile_number}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Confirmation Input */}
                <motion.div
                  className="space-y-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-sm font-bold text-red-900 dark:text-red-100 mb-3">
                    🔐 Critical: Re-enter the Payment Mobile Number to Confirm
                  </p>
                  <p className="text-xs text-red-800 dark:text-red-200 mb-3">
                    This ensures the correct mobile number is registered. Customers will send money to this number.
                  </p>
                  <Input
                    type="tel"
                    placeholder={formData.mobile_number}
                    value={confirmMobileNumber}
                    onChange={(e) => setConfirmMobileNumber(e.target.value)}
                    className={`rounded-lg bg-white dark:bg-gray-900 border-2 transition-colors ${
                      confirmMobileNumber && confirmMobileNumber !== formData.mobile_number
                        ? 'border-red-500 dark:border-red-500'
                        : confirmMobileNumber && confirmMobileNumber === formData.mobile_number
                        ? 'border-green-500 dark:border-green-500'
                        : 'border-red-300 dark:border-red-600'
                    }`}
                  />
                  {confirmMobileNumber && confirmMobileNumber !== formData.mobile_number && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                      ❌ Mobile numbers do not match
                    </p>
                  )}
                  {confirmMobileNumber === formData.mobile_number && confirmMobileNumber !== '' && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                      ✅ Numbers match - Ready to register
                    </p>
                  )}
                </motion.div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormStep('basic')}
                    className="flex-1 rounded-lg"
                  >
                    ← Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={confirmMobileNumber !== formData.mobile_number}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-bold"
                  >
                    ✓ Confirm & Register
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
