'use client';

import { useState } from 'react';
import type { Driver } from '@/lib/types';
import {
    useDrivers,
    useCreateDriver,
    useUpdateDriver,
    useDeleteDriver,
} from '@/hooks/use-restaurant-data';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Mail, Phone, Bike, Car, Truck, Star } from 'lucide-react';
import { toast } from 'sonner';

const vehicleTypes = [
    { value: 'motorcycle', label: 'Motorcycle', icon: Bike },
    { value: 'car', label: 'Car', icon: Car },
    { value: 'bicycle', label: 'Bicycle', icon: Bike },
    { value: 'truck', label: 'Truck/Van', icon: Truck },
];

export default function DriversManagement() {
    const { data: drivers = [], isLoading } = useDrivers();
    const createDriver = useCreateDriver();
    const updateDriver = useUpdateDriver();
    const deleteDriver = useDeleteDriver();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        vehicle_type: 'motorcycle',
        vehicle_plate: '',
        is_available: true,
    });

    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
            email: '',
            vehicle_type: 'motorcycle',
            vehicle_plate: '',
            is_available: true,
        });
        setEditingDriver(null);
    };

    const handleOpenDialog = (driver?: Driver) => {
        if (driver) {
            setEditingDriver(driver);
            setFormData({
                name: driver.name,
                phone: driver.phone,
                email: driver.email || '',
                vehicle_type: driver.vehicle_type,
                vehicle_plate: driver.vehicle_plate || '',
                is_available: driver.is_available,
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.phone || !formData.vehicle_type) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            if (editingDriver) {
                await updateDriver.mutateAsync({
                    id: editingDriver.id,
                    updates: {
                        name: formData.name,
                        phone: formData.phone,
                        email: formData.email || undefined,
                        vehicle_type: formData.vehicle_type,
                        vehicle_plate: formData.vehicle_plate || undefined,
                        is_available: formData.is_available,
                    },
                });
                toast.success('Driver updated');
            } else {
                await createDriver.mutateAsync({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email || undefined,
                    vehicle_type: formData.vehicle_type,
                    vehicle_plate: formData.vehicle_plate || undefined,
                    is_available: formData.is_available,
                });
                toast.success('Driver created');
            }
            setIsDialogOpen(false);
            resetForm();
        } catch (error: any) {
            const detail = error.response?.data?.detail;
            const errorMsg = Array.isArray(detail)
                ? detail.map((e: any) => `${e.loc?.join('.') || 'Error'}: ${e.msg}`).join(', ')
                : (detail || 'Failed to save driver');
            toast.error(errorMsg);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this driver?')) return;

        try {
            await deleteDriver.mutateAsync(id);
            toast.success('Driver deleted');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to delete driver. They might have active orders.');
        }
    };

    const getVehicleIcon = (type: string) => {
        const config = vehicleTypes.find(v => v.value === type);
        return config?.icon || Bike;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Delivery Drivers</h1>
                    <p className="text-muted-foreground">Manage your delivery fleet and their assignment status</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Driver
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{drivers.length}</div>
                        <p className="text-sm text-muted-foreground">Total Drivers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Bike className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{drivers.filter(d => d.is_available).length}</div>
                            <p className="text-sm text-muted-foreground">Available Now</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <Truck className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{drivers.filter(d => !d.is_available).length}</div>
                            <p className="text-sm text-muted-foreground">On Delivery (Unavailable)</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Drivers List */}
            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                    ))}
                </div>
            ) : drivers.length === 0 ? (
                <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-muted-foreground mb-4">No drivers added yet.</p>
                    <Button onClick={() => handleOpenDialog()} variant="outline">Create Initial Driver</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {drivers.map((driver) => {
                        const Icon = getVehicleIcon(driver.vehicle_type);

                        return (
                            <Card key={driver.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${driver.is_available ? 'bg-green-500' : 'bg-orange-500'}`} />
                                <CardContent className="p-4 flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-lg leading-tight">{driver.name}</p>
                                                <Badge variant="outline" className={driver.is_available ? "text-green-600 border-green-200 bg-green-50" : "text-orange-600 border-orange-200 bg-orange-50"}>
                                                    {driver.is_available ? 'Available' : 'Busy'}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1.5">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {driver.phone}
                                                </span>
                                                {driver.vehicle_plate && (
                                                    <span className="flex items-center gap-1.5 font-mono text-xs mt-1">
                                                        <div className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border font-medium">
                                                            {driver.vehicle_plate}
                                                        </div>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-3">
                                        <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md text-xs font-bold">
                                            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                            {driver.rating.toFixed(1)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleOpenDialog(driver)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => handleDelete(driver.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Driver Name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone *</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email (Optional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                                <Select
                                    value={formData.vehicle_type}
                                    onValueChange={(v) => setFormData({ ...formData, vehicle_type: v })}
                                >
                                    <SelectTrigger id="vehicle_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicleTypes.map((type) => {
                                            const Icon = type.icon;
                                            return (
                                                <SelectItem key={type.value} value={type.value}>
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4" />
                                                        {type.label}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehicle_plate">License Plate (Optional)</Label>
                                <Input
                                    id="vehicle_plate"
                                    value={formData.vehicle_plate}
                                    onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                                    placeholder="ABC-1234"
                                    className="uppercase font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label>Availability Status</Label>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_available: true })}
                                    className={`flex-1 px-6 py-3 rounded-xl border-2 transition-all font-bold cursor-pointer active:scale-95 ${
                                        formData.is_available
                                            ? 'border-green-500 bg-green-50 text-green-600'
                                            : 'border-gray-300 bg-white text-gray-500 hover:border-green-300 hover:bg-green-50/50'
                                    }`}
                                >
                                    Available
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_available: false })}
                                    className={`flex-1 px-6 py-3 rounded-xl border-2 transition-all font-bold cursor-pointer active:scale-95 ${
                                        !formData.is_available
                                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                                            : 'border-gray-300 bg-white text-gray-500 hover:border-orange-300 hover:bg-orange-50/50'
                                    }`}
                                >
                                    Busy / Offline
                                </button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createDriver.isPending || updateDriver.isPending}
                        >
                            {editingDriver ? 'Save Changes' : 'Create Driver'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
