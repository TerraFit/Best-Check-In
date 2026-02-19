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
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  userType: 'admin' | 'business';
}

export default function ConversationItem({ conversation, isSelected, onSelect, userType }: Props) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
        isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-medium text-gray-900 truncate flex-1">
          {conversation.subject}
        </h3>
        <span className="text-xs text-gray-500 ml-2">
          {formatTime(conversation.last_message_at)}
        </span>
      </div>
      
      {userType === 'admin' && conversation.business_name && (
        <p className="text-xs text-gray-500 mb-1">
          {conversation.business_name}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 truncate flex-1">
          <span className="text-gray-400">{conversation.last_message_sender}:</span>{' '}
          {conversation.last_message_preview}
        </p>
        
        <div className="flex items-center space-x-2 ml-2">
          {conversation.priority !== 'normal' && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(conversation.priority)}`}>
              {conversation.priority}
            </span>
          )}
          
          {conversation.unread_count > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
