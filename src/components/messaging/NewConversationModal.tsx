import { useState } from 'react';

interface Props {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
  userType: 'admin' | 'business';
}

export default function NewConversationModal({ onClose, onCreated, userType }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    try {
      // For demo - replace with actual API call
      setTimeout(() => {
        const mockConversationId = 'conv_' + Date.now();
        onCreated(mockConversationId);
        setSending(false);
      }, 1000);
    } catch (error) {
      console.error('Error creating conversation:', error);
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">New Conversation</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                required
                disabled={sending}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                required
                disabled={sending}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button type="submit" disabled={sending} className="px-4 py-2 bg-orange-500 text-white rounded-lg">
                {sending ? 'Sending...' : 'Start Conversation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
