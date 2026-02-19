import ConversationItem from './ConversationItem';

interface Conversation {
  id: string;
  subject: string;
  last_message_preview: string;
  last_message_at: string;
  last_message_sender: string;
  unread_count: number;
  priority: string;
  business_name?: string;
}

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  userType: 'admin' | 'business';
}

export default function ConversationList({ 
  conversations, 
  selectedId, 
  onSelect, 
  loading,
  userType 
}: Props) {
  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-100 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 p-8 text-center text-gray-500">
        <p>No conversations yet</p>
        <p className="text-sm mt-2">Start a new conversation to begin messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isSelected={selectedId === conv.id}
          onSelect={() => onSelect(conv.id)}
          userType={userType}
        />
      ))}
    </div>
  );
}
