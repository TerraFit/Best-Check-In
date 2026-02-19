interface Message {
  id: string;
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

export default function MessageBubble({ message, isOwn, showAvatar }: Props) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {showAvatar && (
          <div className={`flex-shrink-0 ${isOwn ? 'ml-3' : 'mr-3'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isOwn ? 'bg-orange-500' : 'bg-gray-400'
            }`}>
              <span className="text-white text-sm font-medium">
                {isOwn ? 'You' : message.sender_name.charAt(0)}
              </span>
            </div>
          </div>
        )}
        
        {/* Message Content */}
        <div className={`${!showAvatar && (isOwn ? 'mr-11' : 'ml-11')}`}>
          {showAvatar && (
            <p className={`text-xs text-gray-500 mb-1 ${isOwn ? 'text-right' : 'text-left'}`}>
              {message.sender_name}
            </p>
          )}
          
          <div
            className={`rounded-lg p-3 ${
              isOwn
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
          </div>
          
          <div className={`flex items-center mt-1 text-xs text-gray-400 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span>{formatTime(message.created_at)}</span>
            {isOwn && message.is_read && (
              <span className="ml-2 text-green-500">✓✓</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
