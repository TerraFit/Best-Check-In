// src/components/dashboard/RoomManagement.tsx
// ✅ Complete room management component for business owners

import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';

interface Room {
    id: string;
    room_number: string;
    room_name: string;
    room_type: string;
    floor?: string;
    status: 'active' | 'maintenance' | 'blocked';
}

interface RoomManagementProps {
    businessId: string;
    totalRooms: number;
    onRoomsUpdate: () => void;
}

const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Superior', 'Family', 'Dormitory'];
const ROOM_STATUSES = [
    { value: 'active', label: '🟢 Active' },
    { value: 'maintenance', label: '🟡 Maintenance' },
    { value: 'blocked', label: '🔴 Blocked' }
];

export function RoomManagement({ businessId, totalRooms, onRoomsUpdate }: RoomManagementProps) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [newRoom, setNewRoom] = useState({ room_number: '', room_name: '', room_type: 'Standard' });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const isOwner = true; // From session

    useEffect(() => {
        fetchRooms();
    }, [businessId]);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/.netlify/functions/get-rooms?businessId=${businessId}`);
            if (response.ok) {
                const data = await response.json();
                setRooms(data);
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRoom = async () => {
        if (!newRoom.room_number || !newRoom.room_name) {
            setError('Room number and name are required');
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/manage-rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId,
                    room_number: newRoom.room_number,
                    room_name: newRoom.room_name,
                    room_type: newRoom.room_type
                })
            });

            if (response.ok) {
                setSuccess(true);
                setShowAddForm(false);
                setNewRoom({ room_number: '', room_name: '', room_type: 'Standard' });
                fetchRooms();
                onRoomsUpdate();
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Error adding room:', error);
            setError('Failed to add room');
        }
    };

    const handleUpdateRoom = async (room: Room) => {
        try {
            const response = await fetch('/.netlify/functions/manage-rooms', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: room.id,
                    room_number: room.room_number,
                    room_name: room.room_name,
                    room_type: room.room_type,
                    status: room.status
                })
            });

            if (response.ok) {
                setSuccess(true);
                setEditingRoom(null);
                fetchRooms();
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Error updating room:', error);
            setError('Failed to update room');
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        if (!confirm('Are you sure you want to delete this room?')) return;

        try {
            const response = await fetch('/.netlify/functions/manage-rooms', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, businessId })
            });

            if (response.ok) {
                fetchRooms();
                onRoomsUpdate();
            }
        } catch (error) {
            console.error('Error deleting room:', error);
        }
    };

    if (loading) {
        return <div className="animate-pulse p-4">Loading rooms...</div>;
    }

    return (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                        🏠 Room Management
                    </h3>
                    <p className="text-sm text-stone-500">
                        {rooms.length} of {totalRooms} rooms configured
                    </p>
                </div>
                {isOwner && rooms.length < totalRooms && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                    >
                        <Plus size={16} /> Add Room
                    </button>
                )}
            </div>

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-2 animate-fade-in">
                    <Check size={16} className="text-emerald-500" />
                    <span className="text-sm text-emerald-700">Room updated successfully!</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                </div>
            )}

            {/* Add Room Form */}
            {showAddForm && (
                <div className="bg-stone-50 rounded-xl p-4 mb-4 border border-stone-200 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">Room Number *</label>
                            <input
                                type="text"
                                value={newRoom.room_number}
                                onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
                                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                                placeholder="e.g., 1, 101, A1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">Room Name *</label>
                            <input
                                type="text"
                                value={newRoom.room_name}
                                onChange={(e) => setNewRoom({ ...newRoom, room_name: e.target.value })}
                                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                                placeholder="e.g., Stone, Ocean View"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">Room Type</label>
                            <select
                                value={newRoom.room_type}
                                onChange={(e) => setNewRoom({ ...newRoom, room_type: e.target.value })}
                                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                            >
                                {ROOM_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={handleAddRoom}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
                        >
                            Add Room
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Room List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rooms.map((room) => (
                    <div
                        key={room.id}
                        className={`p-4 rounded-xl border transition-all ${
                            room.status === 'maintenance' ? 'border-yellow-300 bg-yellow-50' :
                            room.status === 'blocked' ? 'border-red-300 bg-red-50' :
                            'border-stone-200 hover:border-amber-200 hover:shadow-sm'
                        }`}
                    >
                        {editingRoom?.id === room.id ? (
                            // Edit Mode
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={editingRoom.room_number}
                                    onChange={(e) => setEditingRoom({ ...editingRoom, room_number: e.target.value })}
                                    className="w-full px-2 py-1 border border-stone-200 rounded text-sm"
                                />
                                <input
                                    type="text"
                                    value={editingRoom.room_name}
                                    onChange={(e) => setEditingRoom({ ...editingRoom, room_name: e.target.value })}
                                    className="w-full px-2 py-1 border border-stone-200 rounded text-sm"
                                />
                                <select
                                    value={editingRoom.room_type}
                                    onChange={(e) => setEditingRoom({ ...editingRoom, room_type: e.target.value })}
                                    className="w-full px-2 py-1 border border-stone-200 rounded text-sm"
                                >
                                    {ROOM_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <select
                                    value={editingRoom.status}
                                    onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as any })}
                                    className="w-full px-2 py-1 border border-stone-200 rounded text-sm"
                                >
                                    {ROOM_STATUSES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdateRoom(editingRoom)}
                                        className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingRoom(null)}
                                        className="px-3 py-1 bg-stone-200 text-stone-700 rounded-lg text-xs font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-stone-900">#{room.room_number}</span>
                                            <span className="text-sm text-stone-600">{room.room_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-stone-500">{room.room_type}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                room.status === 'active' ? 'bg-green-100 text-green-700' :
                                                room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {room.status === 'active' ? '🟢' : room.status === 'maintenance' ? '🟡' : '🔴'}
                                                {room.status}
                                            </span>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setEditingRoom(room)}
                                                className="p-1 text-stone-400 hover:text-stone-600 rounded"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRoom(room.id)}
                                                className="p-1 text-stone-400 hover:text-red-600 rounded"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {rooms.length === 0 && (
                <div className="text-center py-8 text-stone-400">
                    <p>No rooms configured yet</p>
                    {isOwner && rooms.length < totalRooms && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="mt-2 text-amber-500 hover:text-amber-600 font-medium text-sm"
                        >
                            + Add your first room
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
