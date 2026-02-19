import { useState, useEffect } from 'react';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import NewConversationModal from './NewConversationModal';

interface Conversation {
  id: string;
  business_id: string;
  subject: string;
  status: string;
  priority: string;
  last_message_at: string;
  last_message_preview: string;
  last_message_sender: string;
  message_count: number;
  unread_count: number;
  business_name?: string;
}

export default function MessageInbox({ userType = 'admin' }: { userType?: 'admin' | 'business' }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    fetchConversations();
    // Set up real-time subscription for new messages
    const interval = setInterval(fetchConversations, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [filter]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`/.netlify/functions/get-conversations?status=${filter}`);
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
  };

  const handleNewMessage = () => {
    setShowNewModal(true);
  };

  const handleConversationCreated = (conversationId: string) => {
    setShowNewModal(false);
    fetchConversations();
    setSelectedConversation(conversationId);
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg shadow overflow-hidden">
      {/* Left sidebar - Conversation List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <button
              onClick={handleNewMessage}
              className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              title="New Message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          
          {/* Filter tabs */}
          <div className="flex space-x-2">
            {['active', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 text-sm rounded-full capitalize ${
                  filter === status
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation}
          onSelect={handleSelectConversation}
          loading={loading}
          userType={userType}
        />
      </div>

      {/* Right side - Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <MessageThread
            conversationId={selectedConversation}
            userType={userType}
            onMessageSent={fetchConversations}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewModal && (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleConversationCreated}
          userType={userType}
        />
      )}
    </div>
  );
}
