'use client';

import { useState } from 'react';
import type { MenuItem, MenuCategory } from '@/lib/types';
import {
  useMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
} from '@/hooks/use-restaurant-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

const categories: { value: MenuCategory; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'starters', label: 'Starters' },
  { value: 'main_course', label: 'Main Course' },
  { value: 'fast_food', label: 'Fast Food' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'grill_bbq', label: 'Grill & BBQ' },
  { value: 'desserts', label: 'Desserts' },
  { value: 'beverages', label: 'Beverages' },
];

export default function MenuManagement() {
  const { data: menuItems = [], isLoading } = useMenuItems();
  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();
  const deleteMenuItem = useDeleteMenuItem();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'auto' as any,
    description: '',
    available: true,
    image: null as File | null,
    imagePreview: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      category: 'auto' as any,
      description: '',
      available: true,
      image: null,
      imagePreview: '',
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        price: item.price.toString(),
        category: item.category,
        description: item.description || '',
        available: item.available,
        image: null,
        imagePreview: item.image_url?.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${item.image_url}` : (item.image_url || ''),
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: '',
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Please fill in required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      if (editingItem) {
        await updateMenuItem.mutateAsync({
          id: editingItem.id,
          updates: {
            name: formData.name,
            price,
            category: formData.category === 'auto' ? undefined : formData.category,
            description: formData.description || undefined,
            available: formData.available,
            image: formData.image || undefined,
          },
        });
        toast.success('Menu item updated');
      } else {
        await createMenuItem.mutateAsync({
          name: formData.name,
          price,
          category: formData.category === 'auto' ? undefined : formData.category,
          description: formData.description || undefined,
          available: formData.available,
          image: formData.image || undefined,
        });
        toast.success('Menu item created');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save menu item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await deleteMenuItem.mutateAsync(id);
      toast.success('Menu item deleted');
    } catch (error) {
      toast.error('Failed to delete menu item');
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedItems = categories.map((cat) => ({
    ...cat,
    items: filteredItems.filter((item) => item.category === cat.value),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Menu Management</h1>
          <p className="text-muted-foreground">Manage your restaurant menu items</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Menu Items Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedItems.map((category) => (
            category.items.length > 0 && (
              <div key={category.value}>
                <h2 className="text-lg font-semibold mb-4">{category.label}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {category.items.map((item) => (
                    <Card key={item.id} className={`overflow-hidden transition-all hover:shadow-lg ${!item.available ? 'opacity-60' : ''}`}>
                      {/* Item Image */}
                      <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        {item.image_url ? (
                          <Image
                            src={item.image_url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${item.image_url}` : item.image_url}
                            alt={item.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                            <ImageIcon className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{item.name}</CardTitle>
                            <p className="text-lg font-bold text-primary mt-1">
                              TSH {item.price.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenDialog(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-3">
                          <Badge variant={item.available ? 'default' : 'secondary'}>
                            {item.available ? 'Available' : 'Unavailable'}
                          </Badge>
                          {item.tags?.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image Upload Section (Optional for Smart Mode) */}
            <div className="space-y-2">
              <Label>Item Image {editingItem ? '' : '(Optional - AI will generate if empty)'}</Label>
              {formData.imagePreview ? (
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={formData.imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-6 w-6 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload (or let AI decide)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Item name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category {editingItem ? '' : '(Optional - AI will classify)'}</Label>
                <Select
                  value={formData.category || 'auto'}
                  onValueChange={(v) => setFormData({ ...formData, category: v === 'auto' ? 'auto' : (v as MenuCategory) })}
                >
                  <SelectTrigger id="category" className={formData.category ? '' : 'text-gray-500'}>
                    <SelectValue placeholder="AI will decide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">AI Automatic</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Item description"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="available">Available for ordering</Label>
              <Switch
                id="available"
                checked={formData.available}
                onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMenuItem.isPending || updateMenuItem.isPending}
            >
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
