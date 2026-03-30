'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCustomers, useSendBulkMessage, useMessages, useMessageTemplates, useCreateMessageTemplate, useUpdateMessageTemplate, useDeleteMessageTemplate } from '@/hooks/use-restaurant-data';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  MessageCircle,
  Phone,
  Mail,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Link as LinkIcon,
} from 'lucide-react';

interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  username?: string;
  createdAt?: string;
}

export default function MessagingPage() {
  const { data: customers = [], isLoading } = useCustomers();
  const { data: messages = [] } = useMessages();
  const sendBulkMessage = useSendBulkMessage();

  const [searchQuery, setSearchQuery] = useState('');
  const [messageMethod, setMessageMethod] = useState<'sms' | 'whatsapp'>('sms');
  const [sendToNew, setSendToNew] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [portalUrl, setPortalUrl] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Get customers who have already received messages
  const customersWithMessages = useMemo(() => {
    return new Set(messages.map(m => m.customer_id).filter(Boolean));
  }, [messages]);

  // Filter customers based on search and "new only" option
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        const matchesSearch =
          c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone?.includes(searchQuery) ||
          c.username?.toLowerCase().includes(searchQuery.toLowerCase());

        // If sendToNew is true, filter out customers who already received messages
        if (sendToNew) {
          const alreadySent = customersWithMessages.has(c.id);
          return matchesSearch && !alreadySent;
        }

        return matchesSearch;
      })
      .filter(c => c.phone) // Only show customers with phone numbers
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [customers, searchQuery, sendToNew, customersWithMessages]);

  const recipientCount = sendToNew
    ? filteredCustomers.length
    : filteredCustomers.length;

  const statsCounts = {
    total: customers.filter(c => c.phone).length,
    alreadySent: customersWithMessages.size,
    pending: sendToNew ? filteredCustomers.length : filteredCustomers.length,
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const messagePreview = `Hello! 👋

Share our restaurant portal URL with you:
${portalUrl ? `🔗 ${portalUrl}` : '[Portal URL will be added]'}

${customMessage ? `\n${customMessage}` : ''}

Thanks for ordering with us! 🍽️`;

  const handleSendMessages = async () => {
    if (!portalUrl.trim()) {
      toast.error('Please enter portal URL');
      return;
    }

    if (selectedCustomers.size === 0 && !sendToNew) {
      toast.error('Please select customers to message');
      return;
    }

    setShowConfirmDialog(false);

    try {
      const messageContent = `Hello! 👋\n\nShares our restaurant portal URL with you:\n🔗 ${portalUrl}\n${customMessage ? `\n${customMessage}` : ''}\n\nThanks for ordering with us! 🍽️`;

      const result = await sendBulkMessage.mutateAsync({
        message_type: messageMethod,
        content: messageContent,
        target: sendToNew ? 'new' : 'all',
      });

      // Show summary
      toast.success(`Messages sent successfully!`, {
        description: `${result.messages_sent} sent, ${result.messages_failed} failed`,
      });

      // Reset form
      setSelectedCustomers(new Set());
      setCustomMessage('');
      setPortalUrl('');
    } catch (error) {
      console.error('Error sending messages:', error);
      toast.error('Failed to send messages. Please try again.');
    }
  };

  const statsCounts = {
    total: customers.filter(c => c.phone).length,
    alreadySent: sentToCustomers.size,
    pending: recipientCount,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Customer Messaging
          </h1>
          <p className="text-muted-foreground mt-1">
            Send SMS or WhatsApp messages to share portal URLs with customers
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-3xl font-bold text-foreground">{statsCounts.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Already Sent</p>
                <p className="text-3xl font-bold text-green-600">{statsCounts.alreadySent}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready to Send (New)</p>
                <p className="text-3xl font-bold text-orange-600">{filteredCustomers.filter(c => !customersWithMessages.has(c.id)).length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Composer */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Compose Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Portal URL */}
              <div className="space-y-2">
                <Label htmlFor="portal-url" className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Portal URL *
                </Label>
                <Input
                  id="portal-url"
                  placeholder="e.g., https://myrestaurant.com/portal or /restaurant-name"
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  className="rounded-lg"
                />
                <p className="text-xs text-muted-foreground">
                  The URL customers will use to access your restaurant portal
                </p>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <Label htmlFor="custom-message">Custom Message (Optional)</Label>
                <Textarea
                  id="custom-message"
                  placeholder="Add any special message or promotion..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  className="rounded-lg resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Your message will be added after the portal URL. Keep it concise!
                </p>
              </div>

              {/* Method Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Send Via</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMessageMethod('sms')}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      messageMethod === 'sms'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                  >
                    <Phone className={`h-6 w-6 ${messageMethod === 'sms' ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className={`font-medium text-sm ${messageMethod === 'sms' ? 'text-blue-700' : ''}`}>
                      SMS
                    </span>
                  </button>

                  <button
                    onClick={() => setMessageMethod('whatsapp')}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      messageMethod === 'whatsapp'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    }`}
                  >
                    <MessageCircle className={`h-6 w-6 ${messageMethod === 'whatsapp' ? 'text-green-600' : 'text-gray-500'}`} />
                    <span className={`font-medium text-sm ${messageMethod === 'whatsapp' ? 'text-green-700' : ''}`}>
                      WhatsApp
                    </span>
                  </button>
                </div>
              </div>

              {/* Send To Options */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Send To</Label>
                <div className="space-y-2 p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="send-new"
                      checked={sendToNew}
                      onCheckedChange={(checked) => setSendToNew(checked as boolean)}
                    />
                    <Label htmlFor="send-new" className="flex-1 cursor-pointer font-medium">
                      New Customers Only
                      <span className="text-xs text-muted-foreground block">
                        ({filteredCustomers.length} customers haven't received messages yet)
                      </span>
                    </Label>
                  </div>

                  {!sendToNew && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Select Customers</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                          className="rounded-lg text-xs"
                        >
                          {selectedCustomers.size === filteredCustomers.length
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Selected: {selectedCustomers.size} of {filteredCustomers.length}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Send Button */}
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={
                  sendBulkMessage.isPending ||
                  !portalUrl.trim() ||
                  (sendToNew ? filteredCustomers.length === 0 : selectedCustomers.size === 0)
                }
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2"
              >
                {sendBulkMessage.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                {sendBulkMessage.isPending ? 'Sending...' : 'Send Messages'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Recipients */}
        <div className="space-y-6">
          {/* Message Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-slate-900 text-white text-sm whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                {messagePreview}
              </div>
            </CardContent>
          </Card>

          {/* Recipients List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recipients
                <Badge variant="outline" className="ml-2">
                  {sendToNew ? filteredCustomers.filter(c => !customersWithMessages.has(c.id)).length : selectedCustomers.size}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCustomers.length === 0 && !sendToNew && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Search or select customers
                  </p>
                )}
                {filteredCustomers.filter(c => !customersWithMessages.has(c.id)).length === 0 && sendToNew && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    All customers have already received messages
                  </p>
                )}
                {sendToNew
                  ? filteredCustomers.filter(c => !customersWithMessages.has(c.id)).slice(0, 10).map(customer => (
                      <div
                        key={customer.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-secondary"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </p>
                        </div>
                      </div>
                    ))
                  : filteredCustomers.map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer.id)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedCustomers.has(customer.id)
                            ? 'bg-primary/10'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        <Checkbox
                          checked={selectedCustomers.has(customer.id)}
                          onCheckedChange={() => handleSelectCustomer(customer.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </p>
                        </div>
                      </div>
                    ))}
                {sendToNew && filteredCustomers.filter(c => !customersWithMessages.has(c.id)).length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{filteredCustomers.filter(c => !customersWithMessages.has(c.id)).length - 10} more
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customers Table for Manual Selection */}
      {!sendToNew && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Customers</span>
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm rounded-lg"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">
                      <Checkbox
                        checked={selectedCustomers.size === filteredCustomers.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Phone</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => (
                    <tr
                      key={customer.id}
                      className="border-b hover:bg-secondary/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={selectedCustomers.has(customer.id)}
                          onCheckedChange={() => handleSelectCustomer(customer.id)}
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">{customer.name}</td>
                      <td className="py-3 px-4 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {customer.phone}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{customer.email}</td>
                      <td className="py-3 px-4">
                        {customersWithMessages.has(customer.id) ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline">New</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Log / History */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Message History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {messages.slice(0, 20).map(message => {
                const customer = customers.find(c => c.id === message.customer_id);
                return (
                  <div
                    key={message.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{customer?.name || 'Customer'}</p>
                        <Badge variant="outline" className="text-xs">
                          {message.message_type.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{message.phone_number}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        {message.status === 'sent' && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        )}
                        {message.status === 'pending' && (
                          <Badge variant="outline" className="text-orange-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {message.status === 'failed' && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.sent_at || message.created_at).toLocaleDateString()} {new Date(message.sent_at || message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-lg">
          <DialogHeader>
            <DialogTitle>Confirm Message Send</DialogTitle>
            <DialogDescription>
              You're about to send {sendToNew ? filteredCustomers.length : selectedCustomers.size}{' '}
              {messageMethod === 'sms' ? 'SMS' : 'WhatsApp'} messages
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Recipients:</span>
                <span className="font-bold">{sendToNew ? filteredCustomers.length : selectedCustomers.size}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Method:</span>
                <Badge>{messageMethod.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Portal URL:</span>
                <span className="font-mono text-xs max-w-xs truncate">{portalUrl}</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Make sure your portal URL is correct. Messages will be sent immediately after confirmation.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessages}
              disabled={sendBulkMessage.isPending}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg"
            >
              {sendBulkMessage.isPending ? 'Sending...' : 'Send Messages'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
